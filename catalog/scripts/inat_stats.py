#!/usr/bin/env python3
"""Fetch iNaturalist statistics for the FloraDeck species candidates.

For every entry in catalog/proposal/candidates.json the script resolves the
iNaturalist taxa (reporting synonyms and names it cannot find), then collects:

- research-grade observations in Italy per month (all licences);
- the same restricted to the "Flowers" or "Fruits or Seeds" annotation;
- research-grade observations in Italy with an open photo licence
  (CC0, CC-BY, CC-BY-NC): the pool usable for training;
- the same for Europe, only when the Italian pool is small, and for the
  whole world when the European pool is small too;
- research-grade observations in northern, central and southern Italy,
  plus the same counts for all plants as a baseline for observer density;
- the botanical family, and for wild catalogue species the altitude range of a
  sample of Italian observations (EU-DEM elevations via OpenTopoData).

Candidates flagged "cultivated" (garden plants) also count casual
observations, because iNaturalist never marks cultivated plants research grade.

Every API response is cached on disk, so re-running after editing the
candidate list only fetches what changed. Standard library only.

Usage (from the repository root):
    py -3.13 catalog/scripts/inat_stats.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

API = "https://api.inaturalist.org/v1"
API_V2 = "https://api.inaturalist.org/v2"
# EU-DEM 25 m through the public OpenTopoData API: 100 points per call, 1 call/s, 1000 calls/day.
ELEVATION_API = "https://api.opentopodata.org/v1/eudem25m"
USER_AGENT = "FloraDeck-catalog-stats/0.1 (personal non-commercial project)"
MIN_INTERVAL_S = 1.0  # both services ask for about one request per second
ELEVATION_SAMPLE = 100  # observation points per species used to estimate the altitude range
MIN_ELEVATION_POINTS = 20

CATALOG_DIR = Path(__file__).resolve().parents[1]
CANDIDATES = CATALOG_DIR / "proposal" / "candidates.json"
OUTPUT = CATALOG_DIR / "proposal" / "inat_stats.json"
CACHE_DIR = CATALOG_DIR / ".cache" / "inat"

PLACE_ITALY = 6973
PLACE_EUROPE = 97391
PLANTAE = 47126  # baseline: all plant observations, to correct for observer density per area
# Controlled term "Flowers and Fruits" and its values.
PHENOLOGY_TERM = 12
PHENOLOGY_VALUES = {"flowering": 13, "fruiting": 14}
OPEN_LICENSES = "cc0,cc-by,cc-by-nc"
EUROPE_THRESHOLD = 300  # below this many open Italian observations, also count Europe
WORLD_THRESHOLD = 1000  # below this many open European observations, also count the whole world

# Latitude bands, combined with place_id=Italy so neighbouring countries are excluded.
LNG_RANGE = {"swlng": 6.5, "nelng": 19.0}
AREAS = {
    "north": {"swlat": 44.0, "nelat": 47.2},
    "center": {"swlat": 41.8, "nelat": 44.0},
    "south": {"swlat": 35.0, "nelat": 41.8},
}

_last_request: dict[str, float] = {}
_network_requests = 0


def get_json(path: str, params: dict, api: str = API) -> dict:
    """GET an iNaturalist endpoint (v1 unless told otherwise)."""
    query = urllib.parse.urlencode(sorted(params.items()))
    return fetch_json(f"{api}/{path}?{query}")


def fetch_json(url: str) -> dict:
    """GET a URL, with an on-disk cache, per-host rate limiting and retries."""
    global _network_requests
    host = urllib.parse.urlsplit(url).netloc
    cache_file = CACHE_DIR / f"{hashlib.sha1(url.encode()).hexdigest()}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
    )
    for attempt in range(5):
        wait = MIN_INTERVAL_S - (time.monotonic() - _last_request.get(host, 0.0))
        if wait > 0:
            time.sleep(wait)
        _last_request[host] = time.monotonic()
        _network_requests += 1
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as err:
            if err.code not in (429, 500, 502, 503, 504) or attempt == 4:
                raise
        except urllib.error.URLError:
            if attempt == 4:
                raise
        time.sleep(5 * (attempt + 1))

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(data), encoding="utf-8", newline="\n")
    return data


def resolve_taxon(name: str) -> dict:
    """Map a scientific name to the active iNaturalist taxon, flagging synonyms."""
    results = get_json("taxa", {"q": name, "per_page": 10, "is_active": "true"}).get("results", [])
    wanted = name.casefold()
    for taxon in results:
        if taxon.get("name", "").casefold() == wanted:
            return {"query": name, "id": taxon["id"], "name": taxon["name"], "rank": taxon["rank"], "synonym": False}
    for taxon in results:
        if (taxon.get("matched_term") or "").casefold() == wanted:
            return {"query": name, "id": taxon["id"], "name": taxon["name"], "rank": taxon["rank"], "synonym": True}
    return {"query": name, "id": None, "suggestion": results[0]["name"] if results else None}


def count(params: dict) -> int:
    return get_json("observations", {**params, "per_page": 0}).get("total_results", 0)


def month_histogram(params: dict) -> dict[int, int]:
    data = get_json(
        "observations/histogram",
        {**params, "date_field": "observed", "interval": "month_of_year"},
    )
    months = data.get("results", {}).get("month_of_year", {})
    return {int(month): value for month, value in months.items()}


def family_of(taxon_id: int) -> str | None:
    results = get_json(f"taxa/{taxon_id}", {}).get("results", [])
    ancestors = results[0].get("ancestors", []) if results else []
    return next((a["name"] for a in ancestors if a.get("rank") == "family"), None)


def elevation_profile(italy: dict) -> dict:
    """Altitude percentiles of a sample of non-obscured Italian observations."""
    observations = get_json(
        "observations", {**italy, "per_page": ELEVATION_SAMPLE, "fields": "location,obscured"}, api=API_V2
    ).get("results", [])
    points = []
    for observation in observations:
        if observation.get("obscured") or not observation.get("location"):
            continue
        lat, lng = (float(v) for v in observation["location"].split(","))
        points.append(f"{lat:.5f},{lng:.5f}")
    if len(points) < MIN_ELEVATION_POINTS:
        return {"n": len(points)}
    query = urllib.parse.urlencode({"locations": "|".join(points)}, safe=",|")
    results = fetch_json(f"{ELEVATION_API}?{query}").get("results", [])
    heights = sorted(r["elevation"] for r in results if r.get("elevation") is not None)
    if len(heights) < MIN_ELEVATION_POINTS:
        return {"n": len(heights)}

    def percentile(share: float) -> int:
        return round(heights[round(share * (len(heights) - 1))])

    return {"n": len(heights), "p05": percentile(0.05), "p50": percentile(0.5), "p95": percentile(0.95)}


def stats_for(candidate: dict) -> dict:
    resolved = [resolve_taxon(name) for name in candidate["taxa"]]
    entry: dict = {"key": candidate["key"], "taxa": resolved}
    ids = sorted({taxon["id"] for taxon in resolved if taxon.get("id")})
    if not ids:
        return entry

    # Cultivated plants are "casual" on iNaturalist, never research grade.
    quality = "research,casual" if candidate.get("cultivated") else "research"
    entry["quality"] = quality
    base = {"taxon_id": ",".join(map(str, ids)), "quality_grade": quality}
    italy = {**base, "place_id": PLACE_ITALY}
    phenology = PHENOLOGY_VALUES[candidate.get("phenology", "flowering")]

    entry["itMonths"] = month_histogram(italy)
    entry["itTotal"] = sum(entry["itMonths"].values())
    entry["itPhenologyMonths"] = month_histogram(
        {**italy, "term_id": PHENOLOGY_TERM, "term_value_id": phenology}
    )
    entry["itOpen"] = count({**italy, "photo_license": OPEN_LICENSES})
    entry["euOpen"] = (
        count({**base, "place_id": PLACE_EUROPE, "photo_license": OPEN_LICENSES})
        if entry["itOpen"] < EUROPE_THRESHOLD
        else None
    )
    entry["worldOpen"] = (
        count({**base, "photo_license": OPEN_LICENSES})
        if entry["euOpen"] is not None and entry["euOpen"] < WORLD_THRESHOLD
        else None
    )
    entry["areas"] = {area: count({**italy, **band, **LNG_RANGE}) for area, band in AREAS.items()}
    entry["family"] = family_of(ids[0])
    # Altitude only makes sense for wild plants, and only the catalogue needs it.
    if candidate["status"] == "main" and not candidate.get("cultivated"):
        entry["elevation"] = elevation_profile(italy)
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", help="limit to these candidate keys")
    args = parser.parse_args()

    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))["candidates"]
    if args.only:
        candidates = [c for c in candidates if c["key"] in set(args.only)]

    previous = json.loads(OUTPUT.read_text(encoding="utf-8"))["species"] if OUTPUT.exists() else {}
    species = dict(previous)
    for index, candidate in enumerate(candidates, start=1):
        entry = stats_for(candidate)
        species[candidate["key"]] = entry
        problems = [
            f"{t['query']} -> iNat '{t['name']}'" if t.get("synonym") else f"{t['query']} NOT FOUND (suggestion: {t.get('suggestion')})"
            for t in entry["taxa"]
            if t.get("synonym") or not t.get("id")
        ]
        print(
            f"[{index:3}/{len(candidates)}] {candidate['key']:<28} "
            f"IT={entry.get('itTotal', '-'):>6} open={entry.get('itOpen', '-'):>6} "
            f"EU-open={entry.get('euOpen') if entry.get('euOpen') is not None else '-':>6}"
            + (f"  ! {'; '.join(problems)}" if problems else ""),
            flush=True,
        )

    keys = {c["key"] for c in json.loads(CANDIDATES.read_text(encoding="utf-8"))["candidates"]}
    plants_italy = {"taxon_id": PLANTAE, "quality_grade": "research", "place_id": PLACE_ITALY}
    baseline = {area: count({**plants_italy, **band, **LNG_RANGE}) for area, band in AREAS.items()}
    output = {
        "fetched": date.today().isoformat(),
        "source": "iNaturalist API v1, research-grade observations",
        "placeItaly": PLACE_ITALY,
        "placeEurope": PLACE_EUROPE,
        "openLicenses": OPEN_LICENSES,
        "areas": {name: {**band, **LNG_RANGE} for name, band in AREAS.items()},
        "baselinePlantaeAreas": baseline,
        "species": {key: value for key, value in species.items() if key in keys},
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {OUTPUT.relative_to(CATALOG_DIR.parent)} ({_network_requests} network requests)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
