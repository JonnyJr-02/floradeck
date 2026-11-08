#!/usr/bin/env python3
"""Pick one good, openly licensed reference photo per catalogue species from iNaturalist.

The card sheet shows it next to the user's own photo. Only CC0, CC BY and CC BY-SA photos are
used (no NC: the app repository and site are public). First choice: the most favourited
research-grade observation annotated in flower (in fruit, for berry cards), in Italy then in
Europe, so the photo shows what the card is about; then the taxon's curated photos; then any
favourited research-grade observation. Species without such a photo get none and are listed,
never filled with a guess.

Writes catalog/photos/photos.json (generated: photo id, author attribution, licence, source page,
`review: da-verificare`) and downloads the 500 px "medium" image to catalog/.cache/photos/. The
app's `npm run photos` turns them into WebP. API responses are cached on disk; about 1 request/s.
Standard library only.

Usage (from the repository root):
    py -3.13 catalog/scripts/fetch_photos.py [--only <species id> ...] [--retry-missing] [--refresh]
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
from pathlib import Path

API = "https://api.inaturalist.org/v1"
USER_AGENT = "FloraDeck-catalog-photos/0.1 (personal project; https://github.com/JonnyJr-02/floradeck)"
MIN_INTERVAL_S = 1.0
LICENCES = ("cc0", "cc-by", "cc-by-sa")
PLACE_ITALY = 6973
PLACE_EUROPE = 97391
# iNaturalist annotation "Flowers and Fruits": 13 = flowering, 14 = fruiting.
PHENOLOGY_TERM = 12
PHENOLOGY_VALUES = {"flowering": 13, "fruiting": 14}

CATALOG_DIR = Path(__file__).resolve().parents[1]
SPECIES = CATALOG_DIR / "species.json"
OUTPUT = CATALOG_DIR / "photos" / "photos.json"
# Hand-kept list of photo ids seen to be wrong or unsuitable: never chosen again.
REJECTED = CATALOG_DIR / "photos" / "rejected.json"
CACHE_DIR = CATALOG_DIR / ".cache" / "inat-photos"
IMAGE_DIR = CATALOG_DIR / ".cache" / "photos"

LICENCE_LABELS = {"cc0": "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA"}

_last_request = 0.0


def get(url: str, refresh: bool = False) -> dict:
    global _last_request
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    cached = CACHE_DIR / f"{key}.json"
    if cached.exists() and not refresh:
        return json.loads(cached.read_text(encoding="utf-8"))
    for attempt in range(5):
        wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"  retry after {error}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
            continue
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        return data
    raise RuntimeError(f"iNaturalist API failed: {url}")


def medium(url: str) -> str:
    """iNaturalist photo URLs differ only by size name: square, small, medium, large, original."""
    for size in ("square", "small", "thumb", "large", "original"):
        url = url.replace(f"/{size}.", "/medium.")
    return url


def usable(photo: dict, rejected: set[int]) -> bool:
    return photo.get("license_code") in LICENCES and photo.get("id") not in rejected and bool(photo.get("url"))


def record(photo: dict, how: str, page: str) -> dict:
    return {
        "status": "found",
        "via": how,
        "photoId": photo["id"],
        "licence": LICENCE_LABELS[photo["license_code"]],
        "attribution": photo.get("attribution", ""),
        "pageUrl": page,
        "imageUrl": medium(photo["url"]),
        "review": "da-verificare",
    }


def from_taxon(taxon_ids: list[int], rejected: set[int], refresh: bool) -> dict | None:
    for taxon_id in taxon_ids:
        data = get(f"{API}/taxa/{taxon_id}", refresh)
        for result in data.get("results", []):
            for taxon_photo in result.get("taxon_photos", []):
                photo = taxon_photo.get("photo", {})
                if usable(photo, rejected):
                    return record(photo, "taxon", f"https://www.inaturalist.org/photos/{photo['id']}")
    return None


def from_observations(taxon_ids: list[int], rejected: set[int], refresh: bool, phenology: int | None) -> dict | None:
    for place in (PLACE_ITALY, PLACE_EUROPE):
        for taxon_id in taxon_ids:
            params = {
                "taxon_id": taxon_id, "quality_grade": "research", "photo_license": ",".join(LICENCES),
                "place_id": place, "order_by": "votes", "per_page": 10,
            }
            if phenology is not None:
                params.update(term_id=PHENOLOGY_TERM, term_value_id=phenology)
            data = get(f"{API}/observations?{urllib.parse.urlencode(params)}", refresh)
            for observation in data.get("results", []):
                # A rejected photo rules out its whole observation: the other photos show the same plant.
                if any(photo.get("id") in rejected for photo in observation.get("photos", [])):
                    continue
                for photo in observation.get("photos", []):
                    if usable(photo, rejected):
                        how = "observation" if phenology is None else "observation-annotated"
                        return record(photo, how, f"https://www.inaturalist.org/observations/{observation['id']}")
    return None


def choose(species: dict, rejected: set[int], refresh: bool) -> dict:
    taxon_ids = species.get("inatTaxonIds") or []
    phenology = PHENOLOGY_VALUES.get(species.get("phenology", "flowering"))
    found = from_observations(taxon_ids, rejected, refresh, phenology)
    # Curated taxon photos may show any species of a genus (garden ones too): species cards only.
    if not found and species.get("taxonLevel") == "species":
        found = from_taxon(taxon_ids, rejected, refresh)
    if not found:
        found = from_observations(taxon_ids, rejected, refresh, None)
    if not found and species.get("taxonLevel") != "species":
        found = from_taxon(taxon_ids, rejected, refresh)
    return found or {"status": "missing", "taxa": taxon_ids}


def download(url: str, target: Path) -> None:
    global _last_request
    wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def write_json(path: Path, data: dict) -> None:
    """Write through a temporary file: on Windows a reader (antivirus, indexer) can briefly lock it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for attempt in range(10):
        try:
            temporary.replace(path)
            return
        except OSError:
            time.sleep(0.5 * (attempt + 1))
    raise OSError(f"could not write {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", default=None, help="species ids to (re)fetch")
    parser.add_argument("--retry-missing", action="store_true", help="search again for species without a photo")
    parser.add_argument("--refresh", action="store_true", help="ignore the API cache")
    args = parser.parse_args()

    species = json.loads(SPECIES.read_text(encoding="utf-8"))
    rejected = set()
    if REJECTED.exists():
        rejected = {entry["photoId"] for entry in json.loads(REJECTED.read_text(encoding="utf-8"))["rejected"]}
    photos = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    photos = {k: v for k, v in photos.items() if any(s["id"] == k for s in species)}

    for entry in species:
        known = photos.get(entry["id"])
        if args.only is not None and entry["id"] not in args.only:
            continue
        if args.only is None and known and not args.refresh and not (args.retry_missing and known["status"] == "missing"):
            continue
        result = choose(entry, rejected, args.refresh)
        target = IMAGE_DIR / f"{entry['id']}.jpg"
        if result["status"] == "found":
            if not target.exists() or not known or known.get("photoId") != result["photoId"]:
                download(result["imageUrl"], target)
            print(f"{entry['id']}: {result['licence']} — {result['attribution']}")
        else:
            target.unlink(missing_ok=True)
            print(f"{entry['id']}: NO PHOTO")
        photos[entry["id"]] = result
        write_json(OUTPUT, photos)

    found = sum(1 for v in photos.values() if v["status"] == "found")
    print(f"\n{found} of {len(species)} species have a reference photo; {len(species) - found} without.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
