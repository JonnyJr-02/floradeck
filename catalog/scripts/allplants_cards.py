"""Which all-plants names are also cards.

The all-plants model (PlantCLEF 2024, app/public/models/allplants/names.json) names 7,806 species with
its own taxonomy; the catalogue uses iNaturalist's (catalog/proposal/inat_stats.json keeps each card's
iNaturalist taxa) and, for genus and group cards, a list of labels (species.json `modelLabels`). A name
the big model gives is a card when:
- it is one of a card's labels, exactly;
- a card's label is a genus (one word) and the name is a species of that genus;
- iNaturalist lists it as a scientific synonym of the card's taxon (or of a species inside a
  "complex" taxon), and searching iNaturalist for that name leads back to the same taxon: for
  example PlantCLEF's "Valeriana rubra" is the catalogue's "Centranthus ruber".

Writes app/src/domain/allPlantsCards.generated.json: {"<PlantCLEF name>": "<catalogue id>"} for every
PlantCLEF name that is a card, plus a short report. iNaturalist answers are cached in
catalog/.cache/inat-names/ (about one request a second). Standard library only.

    py -3.13 catalog/scripts/allplants_cards.py
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPECIES = ROOT / "catalog" / "species.json"
STATS = ROOT / "catalog" / "proposal" / "inat_stats.json"
NAMES = ROOT / "app" / "public" / "models" / "allplants" / "names.json"
OUT = ROOT / "app" / "src" / "domain" / "allPlantsCards.generated.json"
CACHE = ROOT / "catalog" / ".cache" / "inat-names"
API = "https://api.inaturalist.org/v1"
HEADERS = {"User-Agent": "FloraDeck catalogue script (personal, non-commercial)"}

_last_call = 0.0


def inat(path: str, params: dict[str, str] | None = None) -> dict:
    """GET an iNaturalist API path, cached on disk, at most about one request a second."""
    global _last_call
    query = "?" + urllib.parse.urlencode(params) if params else ""
    url = f"{API}{path}{query}"
    key = urllib.parse.quote(path + query, safe="")[:180]
    cached = CACHE / f"{key}.json"
    if cached.exists():
        return json.loads(cached.read_text(encoding="utf-8"))
    wait = 1.0 - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()
    request = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            break
        except Exception as error:  # network hiccups: retry a few times, then give up loudly
            if attempt == 3:
                raise RuntimeError(f"iNaturalist did not answer {url}: {error}") from error
            time.sleep(3 * (attempt + 1))
    CACHE.mkdir(parents=True, exist_ok=True)
    tmp = cached.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(cached)
    return data


def binomial(name: str) -> str:
    """The first two words of a name ("Centranthus ruber angustifolius" → "Centranthus ruber")."""
    return " ".join(name.split()[:2])


def synonyms(taxon_id: int) -> set[str]:
    """The scientific names iNaturalist keeps for a taxon (valid and not), as binomials; for a
    "complex", also those of its species."""
    detail = inat(f"/taxa/{taxon_id}", {"all_names": "true"})
    results = detail.get("results") or []
    if not results:
        return set()
    taxon = results[0]
    names = {binomial(n["name"]) for n in taxon.get("names", []) if n.get("lexicon") == "scientific-names" and n.get("name")}
    if taxon.get("rank") == "complex":
        children = inat("/taxa", {"parent_id": str(taxon_id), "rank": "species", "per_page": "50"})
        for child in children.get("results", []):
            names |= synonyms(child["id"])
    return names


def resolves_to(name: str, taxon_ids: set[int]) -> bool:
    """Searching iNaturalist for `name` leads to one of `taxon_ids` (or a species inside one)."""
    found = inat("/taxa", {"q": name, "is_active": "true", "per_page": "5"})
    for result in found.get("results", []):
        if result.get("matched_term", "").lower() != name.lower() and result.get("name", "").lower() != name.lower():
            continue
        if result["id"] in taxon_ids or set(result.get("ancestor_ids", [])) & taxon_ids:
            return True
    return False


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    species = json.loads(SPECIES.read_text(encoding="utf-8"))
    stats = json.loads(STATS.read_text(encoding="utf-8"))["species"]
    plantclef = [entry[0] for entry in json.loads(NAMES.read_text(encoding="utf-8"))["classes"]]
    known = set(plantclef)
    by_genus: dict[str, list[str]] = {}
    for name in plantclef:
        by_genus.setdefault(name.split()[0], []).append(name)

    mapping: dict[str, str] = {}
    clashes: list[str] = []
    via_synonym: list[str] = []
    unmatched: list[str] = []

    def claim(name: str, card: str, how: str) -> None:
        if name in mapping and mapping[name] != card:
            clashes.append(f"{name}: {mapping[name]} / {card} ({how})")
            return
        if name not in mapping and how == "synonym":
            via_synonym.append(f"{name} → {card}")
        mapping.setdefault(name, card)

    # Exact labels everywhere first, then genus cards, then synonyms: a plainer match always wins.
    for entry in species:
        for label in entry["modelLabels"]:
            if " " in label.strip() and label.strip() in known:
                claim(label.strip(), entry["id"], "exact")
    for entry in species:
        for label in entry["modelLabels"]:
            if " " not in label.strip():
                for name in by_genus.get(label.strip(), []):
                    claim(name, entry["id"], "genus")
    for entry in species:
        taxa = (stats.get(entry["id"]) or {}).get("taxa", [])
        ids = {taxon["id"] for taxon in taxa if taxon.get("rank") in ("species", "complex", "subspecies", "variety")}
        for taxon_id in sorted(ids):
            for name in sorted(synonyms(taxon_id)):
                if name not in known or name in mapping:
                    continue
                if resolves_to(name, ids):
                    claim(name, entry["id"], "synonym")
    for entry in species:
        if entry["id"] not in mapping.values():
            unmatched.append(f"{entry['id']} ({entry['scientificName']})")

    OUT.write_text(json.dumps(dict(sorted(mapping.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(mapping)} all-plants names are cards ({len(species)} cards); written to {OUT.relative_to(ROOT)}")
    print(f"through iNaturalist synonyms: {len(via_synonym)}")
    for line in via_synonym:
        print("  ", line)
    if clashes:
        print(f"names claimed by two cards (the first kept): {len(clashes)}")
        for line in clashes:
            print("  ", line)
    print(f"cards the big model does not know: {len(unmatched)}")
    for line in unmatched:
        print("  ", line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
