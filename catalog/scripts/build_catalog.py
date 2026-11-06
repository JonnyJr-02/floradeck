#!/usr/bin/env python3
"""Build catalog/species.json and catalog/albums.json.

Sources, all in catalog/:
- proposal/candidates.json   albums, species chosen ("main"), names, rarity, colours
- proposal/inat_stats.json   iNaturalist data: taxa, months, areas, family, altitude
- texts/<album>.json         Italian texts and safety flags, written by hand
- review/status.json         optional: species the user has checked (exported
                             from the review page), marked "verificato"

Months, regions and altitude are derived from the data, never typed by hand.

Usage (from the repository root):
    py -3.13 catalog/scripts/build_catalog.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from catalog_lib import altitude_label, area_shares, regions_label, selected_months

CATALOG_DIR = Path(__file__).resolve().parents[1]
CANDIDATES = CATALOG_DIR / "proposal" / "candidates.json"
STATS = CATALOG_DIR / "proposal" / "inat_stats.json"
TEXTS_DIR = CATALOG_DIR / "texts"
REVIEW_STATUS = CATALOG_DIR / "review" / "status.json"
SPECIES_OUT = CATALOG_DIR / "species.json"
ALBUMS_OUT = CATALOG_DIR / "albums.json"

LEGENDARY_ALBUM = "leggendaria"
ORCHID_ALBUM = "orchidee"
ORCHID_PROTECTION = "Orchidea: commercio regolato dalla CITES e raccolta vietata in molte regioni."


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_texts() -> dict[str, dict]:
    texts: dict[str, dict] = {}
    for file in sorted(TEXTS_DIR.glob("*.json")):
        for key, value in load_json(file).items():
            if key in texts:
                raise SystemExit(f"{file.name}: '{key}' already defined in another texts file")
            texts[key] = value
    return texts


def load_verified() -> set[str]:
    if not REVIEW_STATUS.exists():
        return set()
    status = load_json(REVIEW_STATUS)
    return {key for key, value in status.get("species", {}).items() if value.get("ok")}


def unique(items):
    return list(dict.fromkeys(items))


def build_species(candidate: dict, number: int | None, stats: dict, text: dict, baseline: dict, verified: set[str]) -> dict:
    phenology = candidate.get("phenology", "flowering")
    months, _ = selected_months(stats, phenology)
    resolved = [t for t in stats.get("taxa", []) if t.get("id")]
    cultivated = bool(candidate.get("cultivated"))
    in_orchid_album = candidate["album"] == ORCHID_ALBUM

    protected = text.get("protected", True if in_orchid_album else False)
    protection_note = text.get("protectionNote", ORCHID_PROTECTION if in_orchid_album else "")

    return {
        "id": candidate["key"],
        "number": number,
        "albumId": None if candidate["album"] == LEGENDARY_ALBUM else candidate["album"],
        "scientificName": candidate.get("label") or candidate["taxa"][0],
        "taxonLevel": candidate["level"],
        "commonNameIt": candidate["commonNameIt"],
        "family": stats.get("family") or "",
        "rarity": candidate["rarity"],
        "dominantColors": candidate["colors"],
        "phenology": phenology,
        "bloomMonths": months,
        "habitat": text.get("habitat", ""),
        "altitude": "" if cultivated else altitude_label(stats.get("elevation")),
        "regions": regions_label(area_shares(stats, baseline)),
        "sizeNote": text.get("sizeNote", ""),
        "description": text.get("description", ""),
        "funFact": text.get("funFact", ""),
        "cultivated": cultivated,
        "protected": protected,
        "protectionNote": protection_note,
        "toxic": bool(text.get("toxic", False)),
        "toxicNote": text.get("toxicNote", ""),
        "lookalikes": text.get("lookalikes", []),
        "lookalikesOutside": text.get("lookalikesOutside", []),
        "modelLabels": unique(t["name"] for t in resolved),
        "inatTaxonIds": unique(t["id"] for t in resolved),
        "textStatus": "verificato" if candidate["key"] in verified else "da-verificare",
    }


def main() -> int:
    data = load_json(CANDIDATES)
    stats_file = load_json(STATS)
    stats, baseline = stats_file["species"], stats_file.get("baselinePlantaeAreas", {})
    texts = load_texts()
    verified = load_verified()

    main_entries = [c for c in data["candidates"] if c["status"] == "main"]
    missing_texts = [c["key"] for c in main_entries if c["key"] not in texts]
    missing_stats = [c["key"] for c in main_entries if c["key"] not in stats]
    extra_texts = sorted(set(texts) - {c["key"] for c in main_entries})
    if missing_texts or missing_stats:
        print(f"Missing texts: {missing_texts}\nMissing stats: {missing_stats}", file=sys.stderr)
        return 1
    if extra_texts:
        print(f"Warning: texts without a catalogue species (ignored): {extra_texts}", file=sys.stderr)

    species, albums = [], []
    for order, album in enumerate(data["albums"], start=1):
        entries = [c for c in main_entries if c["album"] == album["id"]]
        legendary = album["id"] == LEGENDARY_ALBUM
        for number, candidate in enumerate(entries, start=1):
            species.append(
                build_species(candidate, None if legendary else number, stats[candidate["key"]], texts[candidate["key"]], baseline, verified)
            )
        if not legendary:
            rare = [c["key"] for c in entries if c["rarity"] == "rare"]
            albums.append({
                "id": album["id"],
                "name": album["name"],
                "description": album["note"],
                "order": order,
                "speciesCount": len(entries),
                "rareSpeciesId": rare[0] if len(rare) == 1 else None,
            })

    SPECIES_OUT.write_text(json.dumps(species, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    ALBUMS_OUT.write_text(json.dumps(albums, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    checked = sum(s["textStatus"] == "verificato" for s in species)
    print(f"Wrote {len(species)} species and {len(albums)} albums ({checked} verified, {len(species) - checked} da verificare)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
