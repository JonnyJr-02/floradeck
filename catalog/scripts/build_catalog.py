#!/usr/bin/env python3
"""Build catalog/species.json and catalog/albums.json.

Sources, all in catalog/:
- proposal/candidates.json   colour albums with their legendary species, habitat groups
                             (texts are filed by them), species chosen ("main"), names,
                             rarity, colours
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

ORCHID_GROUP = "orchidee"
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


def build_species(candidate: dict, stats: dict, text: dict, baseline: dict, verified: set[str]) -> dict:
    phenology = candidate.get("phenology", "flowering")
    months, _ = selected_months(stats, phenology)
    resolved = [t for t in stats.get("taxa", []) if t.get("id")]
    cultivated = bool(candidate.get("cultivated"))
    in_orchid_album = candidate["album"] == ORCHID_GROUP

    protected = text.get("protected", True if in_orchid_album else False)
    protection_note = text.get("protectionNote", ORCHID_PROTECTION if in_orchid_album else "")

    return {
        "id": candidate["key"],
        # Filled by assign_albums: the first colour album and the card number in it, then all of them.
        "number": None,
        "albumId": None,
        "albums": [],
        "habitatGroup": candidate["album"],
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


def assign_albums(species: list[dict], color_albums: list[dict], group_order: list[str]) -> list[dict]:
    """Put every species in the album of each of its colours (a white-and-pink flower is in both).

    Each album has exactly one legendary species, which stays in its own album only. Cards are
    numbered by habitat group, then by their order in candidates.json; the legendary card is last.
    """
    album_of_color = {color: album["id"] for album in color_albums for color in album["colors"]}
    legendary_album = {album["legendary"]: album["id"] for album in color_albums}
    rank = {group: i for i, group in enumerate(group_order)}
    ordered = sorted(enumerate(species), key=lambda item: (rank.get(item[1]["habitatGroup"], len(rank)), item[0]))
    members: dict[str, list[dict]] = {album["id"]: [] for album in color_albums}
    for _, entry in ordered:
        if entry["id"] in legendary_album:
            targets = [legendary_album[entry["id"]]]
        else:
            targets = list(dict.fromkeys(album_of_color[color] for color in entry["dominantColors"]))
        for album_id in targets:
            members[album_id].append(entry)
    for album in color_albums:
        lst = members[album["id"]]
        lst.sort(key=lambda entry: entry["id"] == album["legendary"])  # stable: legendary last
        for number, entry in enumerate(lst, start=1):
            entry["albums"].append({"albumId": album["id"], "number": number})
    album_rank = {album["id"]: i for i, album in enumerate(color_albums)}
    for entry in species:
        # Keep the order of the species' own colours: its main colour's album comes first.
        colour_rank = {album_of_color[c]: i for i, c in reversed(list(enumerate(entry["dominantColors"])))}
        entry["albums"].sort(key=lambda m: (colour_rank.get(m["albumId"], 99), album_rank[m["albumId"]]))
        entry["albumId"] = entry["albums"][0]["albumId"]
        entry["number"] = entry["albums"][0]["number"]
    return [
        {
            "id": album["id"],
            "name": album["name"],
            "description": album["note"],
            "order": order,
            "colors": album["colors"],
            "speciesCount": len(members[album["id"]]),
            "legendarySpeciesId": album["legendary"],
        }
        for order, album in enumerate(color_albums, start=1)
    ]


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

    species = [build_species(c, stats[c["key"]], texts[c["key"]], baseline, verified) for c in main_entries]
    albums = assign_albums(species, data["colorAlbums"], [g["id"] for g in data["albums"]])

    SPECIES_OUT.write_text(json.dumps(species, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    ALBUMS_OUT.write_text(json.dumps(albums, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    checked = sum(s["textStatus"] == "verificato" for s in species)
    print(f"Wrote {len(species)} species and {len(albums)} albums ({checked} verified, {len(species) - checked} da verificare)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
