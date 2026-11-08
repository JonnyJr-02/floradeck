"""Query tiers: which iNaturalist observations to try, in order of preference.

A class walks its tiers in order and stops once it has ``target_max`` observations.
Tiers marked ``fill_to="min"`` are fallbacks, used only while a class is still
below ``target_min``. Geography comes first (Italy, then Europe, then the rest of
the world, each excluding the previous one), then identification quality, then
the "Flowers and Fruits" annotation:

1. research grade;
2. group/genus classes: observations identified only to that taxon (needs_id,
   community-supported with ``identifications=most_agree``);
3. cultivated classes: casual observations flagged captive/cultivated, also
   community-supported (iNaturalist never makes cultivated plants research grade);

and inside each of those, observations annotated with the card's phenology first,
then unannotated ones from the months when the collectible part is visible.
Observations annotated with another phase (e.g. "No Flowers or Fruits") are never
used for a catalogue class. Fallbacks drop the community-support requirement.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Any

from .catalog import NO_FLOWERS_OR_FRUITS, PHENOLOGY_TERM, CatalogClass
from .config import Place

SPECIES_RANK_LEVEL = 10


@dataclass(frozen=True)
class Tier:
    name: str
    place: str
    params: dict[str, Any] = field(hash=False)
    fill_to: str = "max"  # "max": fill up to target_max; "min": fallback, only up to target_min
    quality: str = "research"
    annotated: bool = False
    page_size: int = 200


def _phenology_variants(place: Place, values: Sequence[int], months: Sequence[int]) -> list[tuple[str, dict[str, Any]]]:
    variants: list[tuple[str, dict[str, Any]]] = []
    if values:
        variants.append(("annotated", {"term_id": PHENOLOGY_TERM, "term_value_id": list(values)}))
    unannotated: dict[str, Any] = {"without_term_id": PHENOLOGY_TERM}
    # Seasons only line up north of the equator; the "world" tier keeps every month.
    if place.place_id is not None and 0 < len(months) < 12:
        unannotated["month"] = list(months)
    variants.append(("unannotated", unannotated))
    return variants


def above_species_taxa(taxon_ids: Iterable[int], taxa: dict[int, dict[str, Any]]) -> dict[str, list[int]]:
    """Taxa above species rank (genus, complex, ...) grouped by rank."""
    by_rank: dict[str, list[int]] = {}
    for taxon_id in taxon_ids:
        taxon = taxa.get(taxon_id)
        if taxon and (taxon.get("rank_level") or 0) > SPECIES_RANK_LEVEL:
            by_rank.setdefault(taxon["rank"], []).append(taxon_id)
    return {rank: sorted(ids) for rank, ids in sorted(by_rank.items())}


def class_tiers(
    cls: CatalogClass,
    *,
    places: Sequence[Place],
    licenses: Sequence[str],
    taxa: dict[int, dict[str, Any]],
    exclude_taxon_ids: Iterable[int] = (),
    page_size: int = 200,
) -> list[Tier]:
    base: dict[str, Any] = {"taxon_id": list(cls.taxon_ids), "photo_license": list(licenses)}
    excluded = sorted(set(exclude_taxon_ids))
    if excluded:
        base["without_taxon_id"] = excluded

    exact = above_species_taxa(cls.taxon_ids, taxa) if cls.taxon_level in ("group", "genus") else {}
    qualities: list[tuple[str, dict[str, Any]]] = [("research", {"quality_grade": "research"})]
    fallbacks: list[tuple[str, dict[str, Any]]] = []
    for rank, ids in exact.items():
        only_this = {"quality_grade": "needs_id", "taxon_id": ids, "rank": rank}
        qualities.append((f"{rank}-level", {**only_this, "identifications": "most_agree"}))
        fallbacks.append((f"{rank}-level-unconfirmed", only_this))
    if cls.cultivated:
        captive = {"quality_grade": "casual", "captive": "true"}
        qualities.append(("casual", {**captive, "identifications": "most_agree"}))
        fallbacks.append(("casual-unconfirmed", captive))

    tiers: list[Tier] = []
    for fill_to, quality_set in (("max", qualities), ("min", fallbacks)):
        for place in places:
            for quality, quality_params in quality_set:
                for variant, variant_params in _phenology_variants(place, cls.phenology_values, cls.months):
                    tiers.append(
                        Tier(
                            name=f"{place.name}/{quality}/{variant}",
                            place=place.name,
                            params={**base, **place.params(), **quality_params, **variant_params},
                            fill_to=fill_to,
                            quality=quality,
                            annotated=variant == "annotated",
                            page_size=page_size,
                        )
                    )
    return tiers


def simple_tiers(
    taxon_ids: Sequence[int],
    *,
    places: Sequence[Place],
    licenses: Sequence[str],
    phenology_values: Sequence[int] = (),
    exclude_taxon_ids: Iterable[int] = (),
    page_size: int = 200,
) -> list[Tier]:
    """Research-grade tiers for an "altro" source: annotated first (if asked), then any photo.

    Any phase is fine for "altro" (the taxon is not in the catalogue either way), but
    photos of the flowers or fruits make the hardest, most useful negatives.
    """
    base: dict[str, Any] = {"taxon_id": list(taxon_ids), "photo_license": list(licenses), "quality_grade": "research"}
    excluded = sorted(set(exclude_taxon_ids))
    if excluded:
        base["without_taxon_id"] = excluded
    tiers = []
    for place in places:
        if phenology_values:
            tiers.append(
                Tier(
                    name=f"{place.name}/research/annotated",
                    place=place.name,
                    params={**base, **place.params(), "term_id": PHENOLOGY_TERM, "term_value_id": list(phenology_values)},
                    annotated=True,
                    page_size=page_size,
                )
            )
        tiers.append(Tier(name=f"{place.name}/research/any", place=place.name, params={**base, **place.params()}, page_size=page_size))
    return tiers


def leaves_tiers(
    taxon_ids: Sequence[int], *, places: Sequence[Place], licenses: Sequence[str], page_size: int = 200
) -> list[Tier]:
    """Catalogue species annotated "No Flowers or Fruits": leaves only, learned as "altro"."""
    base = {
        "taxon_id": sorted(set(taxon_ids)),
        "photo_license": list(licenses),
        "quality_grade": "research",
        "term_id": PHENOLOGY_TERM,
        "term_value_id": [NO_FLOWERS_OR_FRUITS],
    }
    return [
        Tier(name=f"{place.name}/research/no-flowers-or-fruits", place=place.name, params={**base, **place.params()}, page_size=page_size)
        for place in places
        if place.place_id is not None  # Italy and Europe are plenty for a few thousand photos
    ]
