"""Italian common names for the PlantCLEF classes, from real data only.

    python ml/allplants/names.py <species.csv> <inaturalist-taxonomy.dwca.zip> <out names.csv> [--inat-api] [--gbif]

1. iNaturalist taxonomy export (https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip): exact match of
   the binomial among Plantae taxa, then the first Italian name in VernacularNames-italian.csv.
2. With --inat-api, names missing from the export are looked up in the iNaturalist API (1 request/s),
   which also matches synonyms and returns the current species.
3. With --gbif, for the classes still without a name: GBIF vernacular names (language "ita") of the class's
   gbif_species_id (about 3 requests per second).
Classes with no name keep only the scientific name (column it = ""): nothing is invented.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from plantclef import binomial  # same folder


def inat_names(dwca: Path, wanted: set[str]) -> tuple[dict[str, str], dict[str, str]]:
    ids: dict[str, str] = {}
    with zipfile.ZipFile(dwca) as archive:
        with archive.open("taxa.csv") as raw:
            for row in csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8", newline="")):
                if row["kingdom"] == "Plantae" and row["scientificName"] in wanted:
                    ids.setdefault(row["scientificName"], row["id"])
        italian: dict[str, str] = {}
        with archive.open("VernacularNames-italian.csv") as raw:
            for row in csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8", newline="")):
                italian.setdefault(row["id"], row["vernacularName"].strip())
    return ids, italian


def inat_lookup(name: str) -> dict | None:
    """The current iNaturalist plant species for a name, also when the name is a synonym there
    (the search matches synonyms; the result must match the whole name, not a fuzzy hit)."""
    query = urllib.parse.urlencode({"q": name, "per_page": 10, "locale": "it", "is_active": "true"})
    data = gbif_get(f"https://api.inaturalist.org/v1/taxa?{query}")
    for taxon in data.get("results", []):
        if (taxon.get("iconic_taxon_name") == "Plantae" and taxon.get("rank") in ("species", "hybrid")
                and (taxon.get("matched_term") or "").lower() == name.lower()):
            return taxon
    return None


def gbif_get(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "floradeck-prototype"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def gbif_key(name: str) -> str:
    """GBIF backbone key of an exact or synonym match in Plantae ('' if fuzzy or missing)."""
    query = urllib.parse.urlencode({"name": name, "kingdom": "Plantae", "strict": "true"})
    match = gbif_get(f"https://api.gbif.org/v1/species/match?{query}")
    if match.get("matchType") not in ("EXACT",) or match.get("kingdom") != "Plantae":
        return ""
    return str(match.get("speciesKey") or match.get("usageKey") or "")


def is_real_name(name: str, scientific: str) -> bool:
    """False for a 'vernacular' name that is just the Latin name again (some GBIF sources do that)."""
    plain = " ".join(name.lower().replace("×", "x").split())
    return bool(plain) and plain != scientific.lower() and plain != scientific.lower().split()[0]


def gbif_italian(key: str, scientific: str = "") -> str:
    results = gbif_get(f"https://api.gbif.org/v1/species/{key}/vernacularNames?limit=300").get("results", [])
    names = [r["vernacularName"].strip() for r in results if r.get("language") == "ita" and r.get("vernacularName")]
    names = [n for n in names if is_real_name(n, scientific)] if scientific else names
    return names[0] if names else ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("species")
    parser.add_argument("dwca")
    parser.add_argument("out")
    parser.add_argument("--gbif", action="store_true")
    parser.add_argument("--inat-api", action="store_true", help="resolve names missing from the export (synonyms)")
    args = parser.parse_args()
    with open(args.species, encoding="utf-8", newline="") as handle:
        species = list(csv.DictReader(handle))
    wanted = {binomial(s["species"]) for s in species}
    ids, italian = inat_names(Path(args.dwca), wanted)
    rows = []
    for s in species:
        name = binomial(s["species"])
        inat_id = ids.get(name, "")
        it = italian.get(inat_id, "") if inat_id else ""
        rows.append({"species_id": s["species_id"], "scientific": name, "inat_name": name if inat_id else "", "it": it,
                     "source": "inaturalist" if it else "", "inat_id": inat_id,
                     "gbif_id": (s.get("gbif_species_id") or "").removesuffix(".0")})
    print(f"iNaturalist export: {sum(bool(r['inat_id']) for r in rows)} of {len(rows)} names found, "
          f"{sum(bool(r['it']) for r in rows)} with an Italian name")
    if args.inat_api:
        todo = [r for r in rows if not r["inat_id"]]
        for i, r in enumerate(todo):
            try:
                hit = inat_lookup(r["scientific"])
            except Exception as err:
                print("iNaturalist error", r["scientific"], err)
                hit = None
            if hit:
                r["inat_id"], r["inat_name"] = str(hit["id"]), hit["name"]
                r["it"] = italian.get(r["inat_id"], "")  # only real Italian names (the API may fall back to English)
                r["source"] = "inaturalist" if r["it"] else ""
            time.sleep(1.0)
            if (i + 1) % 100 == 0:
                print(f"iNaturalist API {i + 1}/{len(todo)}", flush=True)
        print(f"after the iNaturalist API: {sum(bool(r['inat_id']) for r in rows)} found, "
              f"{sum(bool(r['it']) for r in rows)} with an Italian name")
    if args.gbif:
        todo = [r for r in rows if not r["it"]]
        for i, r in enumerate(todo):
            try:
                if not r["gbif_id"]:
                    r["gbif_id"] = gbif_key(r["scientific"])
                    time.sleep(0.3)
                if r["gbif_id"]:
                    r["it"] = gbif_italian(r["gbif_id"], r["scientific"])
            except Exception as err:  # network hiccup: leave it empty
                print("GBIF error", r["gbif_id"], err)
            if r["it"]:
                r["source"] = "gbif"
            time.sleep(0.3)
            if (i + 1) % 200 == 0:
                print(f"GBIF {i + 1}/{len(todo)}", flush=True)
        print(f"after GBIF: {sum(bool(r['it']) for r in rows)} of {len(rows)} with an Italian name")
    with open(args.out, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
