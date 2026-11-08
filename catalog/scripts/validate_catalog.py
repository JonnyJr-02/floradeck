#!/usr/bin/env python3
"""Validate catalog/species.json and catalog/albums.json.

Errors (exit code 1) break the rules of the game or the data model; warnings
point at things to complete or verify. The rules mirror
catalog/schema/species.schema.json plus the cross-checks a schema cannot express.

Usage (from the repository root):
    py -3.13 catalog/scripts/validate_catalog.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

CATALOG_DIR = Path(__file__).resolve().parents[1]
SPECIES = CATALOG_DIR / "species.json"
ALBUMS = CATALOG_DIR / "albums.json"

ID_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
COLORS = {"rosso", "arancio", "giallo", "bianco", "rosa", "viola", "blu", "azzurro", "nero"}
RARITIES = {"common", "uncommon", "rare", "legendary"}
LEVELS = {"species", "group", "genus"}
PHENOLOGIES = {"flowering", "fruiting"}
TEXT_STATUSES = {"da-verificare", "verificato"}
ALBUM_SIZE = range(10, 101)
STRING_FIELDS = [
    "id", "scientificName", "commonNameIt", "family", "habitat", "altitude", "regions",
    "sizeNote", "description", "funFact", "protectionNote", "toxicNote", "textStatus",
]


def sentence_count(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s])


def validate(species: list[dict], albums: list[dict]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    ids = [s.get("id") for s in species]
    known = set(ids)
    album_ids = {a["id"] for a in albums}

    for duplicate, n in Counter(ids).items():
        if n > 1:
            errors.append(f"duplicate id '{duplicate}' ({n}×)")

    for s in species:
        sid = s.get("id", "?")
        for field in STRING_FIELDS:
            if not isinstance(s.get(field), str):
                errors.append(f"{sid}: '{field}' must be a string")
        if not ID_PATTERN.match(sid):
            errors.append(f"{sid}: id must be kebab-case")
        if s.get("rarity") not in RARITIES:
            errors.append(f"{sid}: unknown rarity {s.get('rarity')!r}")
        if s.get("taxonLevel") not in LEVELS:
            errors.append(f"{sid}: unknown taxonLevel {s.get('taxonLevel')!r}")
        if s.get("phenology") not in PHENOLOGIES:
            errors.append(f"{sid}: unknown phenology {s.get('phenology')!r}")
        if s.get("textStatus") not in TEXT_STATUSES:
            errors.append(f"{sid}: unknown textStatus {s.get('textStatus')!r}")

        memberships = s.get("albums")
        if not isinstance(memberships, list) or not memberships:
            errors.append(f"{sid}: 'albums' must list at least one album")
            memberships = []
        for membership in memberships:
            if membership.get("albumId") not in album_ids:
                errors.append(f"{sid}: unknown album {membership.get('albumId')!r}")
        if memberships and (s.get("albumId"), s.get("number")) != (memberships[0].get("albumId"), memberships[0].get("number")):
            errors.append(f"{sid}: albumId/number must repeat its first album")
        if s.get("rarity") == "legendary" and len(memberships) != 1:
            errors.append(f"{sid}: a legendary species belongs to its own album only")

        colors = s.get("dominantColors")
        if not colors or not isinstance(colors, list) or not set(colors) <= COLORS:
            errors.append(f"{sid}: dominantColors must be a non-empty subset of {sorted(COLORS)}")
        months = s.get("bloomMonths")
        if not isinstance(months, list) or any(not isinstance(m, int) or not 1 <= m <= 12 for m in months) or months != sorted(set(months)):
            errors.append(f"{sid}: bloomMonths must be sorted unique months 1–12")
        elif not months:
            warnings.append(f"{sid}: no bloomMonths")

        for field in ("lookalikes", "lookalikesOutside", "modelLabels", "inatTaxonIds"):
            if not isinstance(s.get(field), list):
                errors.append(f"{sid}: '{field}' must be a list")
        for other in s.get("lookalikes") or []:
            if other == sid:
                errors.append(f"{sid}: lists itself as a lookalike")
            elif other not in known:
                errors.append(f"{sid}: lookalike '{other}' is not in the catalogue")
        if not s.get("modelLabels"):
            errors.append(f"{sid}: no modelLabels")
        if not s.get("inatTaxonIds") or any(not isinstance(i, int) for i in s["inatTaxonIds"]):
            errors.append(f"{sid}: inatTaxonIds must be a non-empty list of integers")

        if s.get("protected") not in (True, False, None):
            errors.append(f"{sid}: protected must be true, false or null")
        if not isinstance(s.get("toxic"), bool) or not isinstance(s.get("cultivated"), bool):
            errors.append(f"{sid}: toxic and cultivated must be booleans")
        if s.get("toxic") and not s.get("toxicNote"):
            warnings.append(f"{sid}: toxic without toxicNote")
        if s.get("protected") is None:
            warnings.append(f"{sid}: protection to verify")

        for field in ("habitat", "description"):
            if isinstance(s.get(field), str) and not s[field].strip():
                errors.append(f"{sid}: empty {field}")
        for field in ("funFact", "sizeNote", "regions", "family"):
            if isinstance(s.get(field), str) and not s[field].strip():
                warnings.append(f"{sid}: empty {field}")
        if not s.get("cultivated") and isinstance(s.get("altitude"), str) and not s["altitude"]:
            warnings.append(f"{sid}: wild species without altitude")
        if isinstance(s.get("description"), str) and not 2 <= sentence_count(s["description"]) <= 4:
            warnings.append(f"{sid}: description has {sentence_count(s['description'])} sentences (2–4 expected)")

    by_id = {s["id"]: s for s in species if "id" in s}
    for s in species:
        for other in s.get("lookalikes") or []:
            if other in by_id and s["id"] not in by_id[other].get("lookalikes", []):
                warnings.append(f"{s['id']}: lookalike '{other}' does not list it back")

    if any(s.get("rarity") == "rare" for s in species):
        errors.append("the rare tier is gone since 2026-11-08: every album has a legendary species instead")

    for duplicate, n in Counter(a["id"] for a in albums).items():
        if n > 1:
            errors.append(f"duplicate album id '{duplicate}'")
    for album in albums:
        slots = [(s, m) for s in species for m in s.get("albums") or [] if m.get("albumId") == album["id"]]
        if len(slots) not in ALBUM_SIZE:
            errors.append(f"album {album['id']}: {len(slots)} species ({ALBUM_SIZE.start}–{ALBUM_SIZE.stop - 1} expected)")
        if album.get("speciesCount") != len(slots):
            errors.append(f"album {album['id']}: speciesCount {album.get('speciesCount')} but {len(slots)} species")
        legendary = [s["id"] for s, _ in slots if s.get("rarity") == "legendary"]
        if len(legendary) != 1:
            errors.append(f"album {album['id']}: {len(legendary)} legendary species (exactly 1 expected)")
        elif album.get("legendarySpeciesId") != legendary[0]:
            errors.append(f"album {album['id']}: legendarySpeciesId does not match")
        numbers = sorted(m.get("number") for _, m in slots if isinstance(m.get("number"), int))
        if numbers != list(range(1, len(slots) + 1)):
            errors.append(f"album {album['id']}: card numbers must run 1..{len(slots)}")
    return errors, warnings


def main() -> int:
    species = json.loads(SPECIES.read_text(encoding="utf-8"))
    albums = json.loads(ALBUMS.read_text(encoding="utf-8"))
    errors, warnings = validate(species, albums)
    to_verify = sum(s.get("textStatus") == "da-verificare" for s in species)
    print(f"{len(species)} species in {len(albums)} albums; {to_verify} still 'da verificare'.")
    groups = Counter(w.split(": ", 1)[1].split(" (")[0] if ": " in w else w for w in warnings)
    if warnings:
        print(f"{len(warnings)} warnings:")
        for kind, n in sorted(groups.items(), key=lambda kv: -kv[1]):
            print(f"  {n:3} × {kind}")
    if errors:
        print(f"{len(errors)} errors:", file=sys.stderr)
        for error in errors:
            print(f"  {error}", file=sys.stderr)
        return 1
    print("OK: no errors.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
