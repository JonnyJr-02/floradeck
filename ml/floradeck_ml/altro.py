"""Sources of the "altro" class (plants outside the catalogue and non-plants).

1. ``lookalike``: every ``lookalikesOutside`` taxon of the catalogue (iNaturalist,
   research grade, Italy then Europe then world; flowers/fruits first).
2. ``common``: the most observed vascular plants of Italy on iNaturalist (research grade,
   open licence) that are not catalogue taxa, inside a catalogue taxon or already a
   lookalike.
3. ``leaves``: catalogue species annotated "No Flowers or Fruits": the card collects the
   colourful part, so a plant without it must not become a card.
4. ``nonplant``: iNaturalist fungi and vertebrates/molluscs (no insects or spiders, often
   photographed on flowers).
5. ``openimages``: everyday scenes without plants (see ``openimages.py``).

iNaturalist photos keep the licence chosen by each observer (CC0, CC BY or CC BY-NC
only); Open Images files are CC BY 2.0. Every image gets a row in attributions.csv.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from typing import Any

from . import inat
from .catalog import CatalogClass
from .config import Settings
from .records import Observation
from .selection import Cap, PageFetcher, PhotoFilter, Selection, by_observer, claim, parallel_map, select, trim_photos
from .taxonomy import catalog_classes_containing, catalog_taxa_inside, class_of, lineage, taxon_owner
from .tiers import leaves_tiers, simple_tiers

Log = Callable[[str], None]


@dataclass(frozen=True)
class AltroTaxon:
    part: str
    name: str
    taxon_id: int | None = None
    rank: str = ""
    inat_name: str = ""
    exclude: tuple[int, ...] = ()
    phenology_values: tuple[int, ...] = ()
    listed_by: tuple[str, ...] = ()
    italian_observations: int | None = None
    skip_reason: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "part": self.part,
            "name": self.name,
            "taxonId": self.taxon_id,
            "rank": self.rank,
            "inatName": self.inat_name,
            "exclude": list(self.exclude),
            "listedBy": list(self.listed_by),
            "italianObservations": self.italian_observations,
            "skipReason": self.skip_reason,
        }


def resolve_lookalikes(
    client: inat.ApiClient,
    classes: Sequence[CatalogClass],
    catalog_taxa: dict[int, dict[str, Any]],
    workers: int = 1,
) -> list[AltroTaxon]:
    owner = taxon_owner(classes)
    listed: dict[str, list[CatalogClass]] = {}
    for cls in classes:
        for name in cls.lookalikes_outside:
            listed.setdefault(name, []).append(cls)
    names = sorted(listed)
    found = parallel_map(lambda name: inat.search_taxon(client, name), names, workers)
    resolved = []
    for name, taxon in zip(names, found):
        by = tuple(c.id for c in listed[name])
        values = tuple(sorted({v for c in listed[name] for v in c.phenology_values}))
        if taxon is None:
            resolved.append(AltroTaxon("lookalike", name, listed_by=by, skip_reason="not found on iNaturalist"))
            continue
        inside = catalog_classes_containing(taxon, owner)
        resolved.append(
            AltroTaxon(
                "lookalike",
                name,
                taxon_id=int(taxon["id"]),
                rank=taxon.get("rank", ""),
                inat_name=taxon.get("name", ""),
                exclude=tuple(sorted(catalog_taxa_inside(int(taxon["id"]), catalog_taxa))),
                phenology_values=values,
                listed_by=by,
                skip_reason=f"already inside catalogue class {', '.join(sorted(inside))}" if inside else "",
            )
        )
    return resolved


def choose_common_plants(
    counts: Sequence[dict[str, Any]],
    *,
    owner: dict[int, str],
    catalog_taxa: dict[int, dict[str, Any]],
    lookalike_ids: set[int],
    limit: int,
) -> list[AltroTaxon]:
    """Pure: the first ``limit`` ranked taxa that are not catalogue taxa or lookalikes."""
    chosen = []
    for entry in counts:
        taxon = entry.get("taxon") or {}
        if not taxon.get("id"):
            continue
        taxon_id = int(taxon["id"])
        if catalog_classes_containing(taxon, owner) or lineage(taxon) & lookalike_ids:
            continue
        chosen.append(
            AltroTaxon(
                "common",
                taxon.get("name", ""),
                taxon_id=taxon_id,
                rank=taxon.get("rank", ""),
                inat_name=taxon.get("name", ""),
                exclude=tuple(sorted(catalog_taxa_inside(taxon_id, catalog_taxa))),
                phenology_values=(13,),
                italian_observations=int(entry.get("count") or 0),
            )
        )
        if len(chosen) >= limit:
            break
    return chosen


@dataclass(frozen=True)
class _Job:
    key: str
    source: str
    tiers: tuple
    target: int
    caps: tuple
    fetcher: PageFetcher


def select_altro(
    *,
    client: inat.ApiClient,
    settings: Settings,
    classes: Sequence[CatalogClass],
    catalog_taxa: dict[int, dict[str, Any]],
    fetch: PageFetcher,
    fetch_with_ancestry: PageFetcher,
    photo_filter: PhotoFilter,
    taken_observations: set[str],
    taken_photos: set[str],
    log: Log = print,
) -> tuple[list[Selection], list[AltroTaxon]]:
    a = settings.altro
    places = settings.inat.places
    licenses = settings.inat.licenses
    page = settings.inat.page_size
    per_obs, per_obs_low = settings.classes.photos_per_observation, settings.classes.photos_per_observation_low
    owner = taxon_owner(classes)
    jobs: list[_Job] = []

    def small_page(target: int) -> int:
        return min(page, max(30, 3 * target))

    # 1. Lookalikes outside the catalogue.
    lookalikes = resolve_lookalikes(client, classes, catalog_taxa, settings.inat.concurrency)
    for item in lookalikes:
        if item.skip_reason or item.taxon_id is None:
            log(f"  altro/lookalike {item.name}: skipped ({item.skip_reason})")
            continue
        tiers = simple_tiers(
            [item.taxon_id],
            places=places,
            licenses=licenses,
            phenology_values=item.phenology_values,
            exclude_taxon_ids=item.exclude,
            page_size=small_page(a.lookalike_target),
        )
        jobs.append(_Job(f"lookalike/{item.name}", "altro/lookalike", tuple(tiers), a.lookalike_target,
                         (by_observer(a.lookalike_max_per_observer),), fetch))

    # 2. Common Italian plants outside the catalogue.
    italy = places[0]
    counts = inat.species_counts(
        client,
        {"taxon_id": a.common_root_taxon, "quality_grade": "research", "photo_license": list(licenses), **italy.params()},
        limit=a.common_species + 700,
    )
    lookalike_ids = {item.taxon_id for item in lookalikes if item.taxon_id is not None}
    common = choose_common_plants(
        counts, owner=owner, catalog_taxa=catalog_taxa, lookalike_ids=lookalike_ids, limit=a.common_species
    )
    for item in common:
        tiers = simple_tiers(
            [item.taxon_id],
            places=[italy],
            licenses=licenses,
            phenology_values=item.phenology_values,
            exclude_taxon_ids=item.exclude,
            page_size=small_page(a.common_target),
        )
        jobs.append(_Job(f"common/{item.name}", "altro/common", tuple(tiers), a.common_target,
                         (by_observer(a.common_max_per_observer),), fetch))

    # 3. Catalogue species without flowers or fruits.
    def class_key(observation: Observation) -> str | None:
        return class_of(observation.extra.get("ancestor_ids") or [], owner)

    tiers = leaves_tiers(sorted(owner), places=places, licenses=licenses, page_size=page)
    jobs.append(_Job("leaves", "altro/leaves", tuple(tiers), a.leaves_target,
                     (by_observer(a.leaves_max_per_observer), Cap("class", class_key, a.leaves_max_per_class)),
                     fetch_with_ancestry))

    # 4. Non-plant iNaturalist observations.
    for taxon in a.nonplant_taxa:
        tiers = simple_tiers([taxon.id], places=[p for p in places if p.place_id is not None], licenses=licenses,
                             page_size=page)
        jobs.append(_Job(f"nonplant/{taxon.name}", "altro/nonplant", tuple(tiers), a.nonplant_target,
                         (by_observer(a.nonplant_max_per_observer),), fetch))

    def compute(job: _Job) -> Selection:
        selection = select(
            job.tiers,
            job.fetcher,
            key=job.key,
            label=a.label,
            source=job.source,
            target_min=job.target,
            target_max=job.target,
            caps=job.caps,
            photo_filter=photo_filter,
        )
        trim_photos(selection, per_obs, per_obs_low)
        return selection

    selections: list[Selection] = []
    common_done = 0
    for selection in parallel_map(compute, jobs, settings.inat.concurrency):
        claim(selection, taken_observations, taken_photos)
        if selection.key == "leaves":
            selection.observations = [replace(o, extra={"catalog_class": class_key(o)}) for o in selection.observations]
        selections.append(selection)
        if selection.source == "altro/common":
            common_done += 1
            if common_done % 25 == 0 or common_done == len(common):
                log(f"  altro/common {common_done}/{len(common)} (last: {selection.key[7:]}, {len(selection.observations)} obs)")
        else:
            log(f"  altro/{selection.key:<40} {len(selection.observations):>5} obs")
    return selections, lookalikes + common
