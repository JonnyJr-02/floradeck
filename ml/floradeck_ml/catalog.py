"""The model classes, read from catalog/species.json (the single source of truth)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

PHENOLOGY_VALUES = {"flowering": 13, "fruiting": 14}  # iNaturalist term 12 "Flowers and Fruits"
NO_FLOWERS_OR_FRUITS = 21
PHENOLOGY_TERM = 12


@dataclass(frozen=True)
class CatalogClass:
    id: str
    scientific_name: str
    taxon_level: str  # species | group | genus
    taxon_ids: tuple[int, ...]
    model_labels: tuple[str, ...]
    cultivated: bool
    phenology: tuple[str, ...]  # the card's phase first, then any extra phase
    months: tuple[int, ...]  # bloomMonths: when the collectible part is visible in Italy
    lookalikes_outside: tuple[str, ...]
    album_id: str | None
    rarity: str

    @property
    def phenology_values(self) -> tuple[int, ...]:
        return tuple(PHENOLOGY_VALUES[phase] for phase in self.phenology)


def load_catalog(path: Path, extra_phenology: dict[str, tuple[str, ...]] | None = None) -> list[CatalogClass]:
    """Catalogue order is kept: it becomes the class order of the model."""
    extra_phenology = extra_phenology or {}
    species = json.loads(path.read_text(encoding="utf-8"))
    ids = {entry["id"] for entry in species}
    unknown = sorted(set(extra_phenology) - ids)
    if unknown:
        raise ValueError(f"extra_phenology names species that are not in the catalogue: {', '.join(unknown)}")
    classes = []
    for entry in species:
        phases = [entry["phenology"]]
        phases += [p for p in extra_phenology.get(entry["id"], ()) if p not in phases]
        classes.append(
            CatalogClass(
                id=entry["id"],
                scientific_name=entry["scientificName"],
                taxon_level=entry["taxonLevel"],
                taxon_ids=tuple(entry["inatTaxonIds"]),
                model_labels=tuple(entry["modelLabels"]),
                cultivated=bool(entry["cultivated"]),
                phenology=tuple(phases),
                months=tuple(sorted(entry["bloomMonths"])),
                lookalikes_outside=tuple(entry["lookalikesOutside"]),
                album_id=entry["albumId"],
                rarity=entry["rarity"],
            )
        )
    return classes
