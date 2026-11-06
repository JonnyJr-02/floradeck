"""Build the selection: which observations and photos a full run downloads.

This is all a dry run does: it reads metadata only (iNaturalist API responses, the
Open Images index, and HEAD requests for a sample of photos to estimate their size)
and writes the manifest, ``plan.json`` and the report. No image is downloaded.
"""

from __future__ import annotations

import hashlib
import json
import statistics
import time
import urllib.error
import urllib.request
from collections import Counter
from collections.abc import Callable, Iterable, Sequence
from dataclasses import asdict, dataclass, field, replace
from datetime import datetime
from pathlib import Path
from typing import Any

from . import inat
from .altro import AltroTaxon, select_altro
from .catalog import CatalogClass
from .config import Settings
from .openimages import plan_openimages
from .records import Observation, Photo, eligible_photos, parse_inat
from .selection import PageFetcher, PhotoFilter, Selection, by_observer, claim, parallel_map, select, trim_photos
from .taxonomy import nested_exclusions
from .tiers import class_tiers

Log = Callable[[str], None]
RESIZED_LONG_SIDE = {"small": 240, "medium": 500, "large": 1024, "original": 2048}


@dataclass
class PlanResult:
    selections: list[Selection]
    altro_sources: list[AltroTaxon] = field(default_factory=list)
    openimages: dict[str, Any] = field(default_factory=dict)
    taxa_problems: list[str] = field(default_factory=list)

    @property
    def observations(self) -> list[Observation]:
        return [o for s in self.selections for o in s.observations]


def make_fetcher(client: inat.ApiClient, photo_size: str, fields: str = inat.OBSERVATION_FIELDS) -> PageFetcher:
    def fetch(tier, id_below):
        raw, total = inat.observation_page(client, tier.params, tier.page_size, id_below, fields)
        return [parse_inat(item, photo_size) for item in raw], total

    return fetch


def make_photo_filter(settings: Settings) -> PhotoFilter:
    def photo_filter(photos: Sequence[Photo]) -> Sequence[Photo]:
        return eligible_photos(
            photos,
            licenses=settings.inat.licenses,
            host=settings.inat.photo_host,
            resized_long_side=RESIZED_LONG_SIDE.get(settings.inat.photo_size, 500),
            min_side=settings.classes.min_side,
            max_aspect=settings.classes.max_aspect,
        )

    return photo_filter


def build_plan(
    settings: Settings,
    client: inat.ApiClient,
    classes: Sequence[CatalogClass],
    *,
    openimages_cache: Path,
    only: Iterable[str] | None = None,
    include_altro: bool = True,
    log: Log = print,
) -> PlanResult:
    only = set(only or ())
    unknown = sorted(only - {c.id for c in classes})
    if unknown:
        raise ValueError(f"not in the catalogue: {', '.join(unknown)}")
    chosen = [c for c in classes if not only or c.id in only]

    taxa = inat.taxa_by_ids(client, {t for c in classes for t in c.taxon_ids})
    problems = []
    for cls in classes:
        for taxon_id in cls.taxon_ids:
            taxon = taxa.get(taxon_id)
            if taxon is None:
                problems.append(f"{cls.id}: taxon {taxon_id} not found on iNaturalist")
            elif not taxon.get("is_active", True):
                problems.append(f"{cls.id}: taxon {taxon_id} ({taxon.get('name')}) is no longer active")
    nested = nested_exclusions(classes, taxa)

    fetch = make_fetcher(client, settings.inat.photo_size)
    fetch_with_ancestry = make_fetcher(client, settings.inat.photo_size, inat.OBSERVATION_FIELDS + ",taxon.ancestor_ids")
    photo_filter = make_photo_filter(settings)
    taken_observations: set[str] = set()
    taken_photos: set[str] = set()
    c = settings.classes
    selections: list[Selection] = []

    def select_class(cls: CatalogClass) -> Selection:
        excluded = nested.get(cls.id, set())
        tiers = class_tiers(
            cls,
            places=settings.inat.places,
            licenses=settings.inat.licenses,
            taxa=taxa,
            exclude_taxon_ids=excluded,
            page_size=settings.inat.page_size,
        )
        selection = select(
            tiers,
            fetch,
            key=cls.id,
            label=cls.id,
            source="catalog",
            target_min=c.target_min,
            target_max=c.target_max,
            caps=[by_observer(c.max_per_observer)],
            photo_filter=photo_filter,
        )
        if excluded:
            selection.note = "excludes taxa of other classes: " + ", ".join(map(str, sorted(excluded)))
        trim_photos(selection, c.photos_per_observation, c.photos_per_observation_low)
        return selection

    # Classes are selected a few at a time, then claimed in catalogue order (deterministic).
    for index, selection in enumerate(parallel_map(select_class, chosen, settings.inat.concurrency), start=1):
        dropped = claim(selection, taken_observations, taken_photos)
        if dropped:
            selection.note = "; ".join(filter(None, [selection.note, f"{dropped} observations already used by another class"]))
        selections.append(selection)
        places = Counter(o.tier.split("/")[0] for o in selection.observations)
        log(
            f"[{index:3}/{len(chosen)}] {selection.key:<30} {len(selection.observations):>4} obs "
            f"(IT {places.get('italy', 0):>3}, EU {places.get('europe', 0):>3}, world {places.get('world', 0):>3}) "
            f"{selection.images:>4} img  requests {client.network_requests}"
            + ("  BELOW TARGET" if selection.below_min else "")
        )

    result = PlanResult(selections=selections, taxa_problems=problems)
    if include_altro:
        log("altro:")
        altro_selections, sources = select_altro(
            client=client,
            settings=settings,
            classes=classes,
            catalog_taxa=taxa,
            fetch=fetch,
            fetch_with_ancestry=fetch_with_ancestry,
            photo_filter=photo_filter,
            taken_observations=taken_observations,
            taken_photos=taken_photos,
            log=log,
        )
        result.selections.extend(altro_selections)
        result.altro_sources = sources
        if settings.altro.openimages_count > 0:
            observations, stats = plan_openimages(
                openimages_cache, settings.altro.openimages_count, settings.split.seed, settings.inat.user_agent
            )
            oi = Selection(
                key="openimages",
                label=settings.altro.label,
                source="altro/openimages",
                target_min=settings.altro.openimages_count,
                target_max=settings.altro.openimages_count,
            )
            oi.observations = [
                replace(o, label=settings.altro.label, source="altro/openimages", group="openimages", tier="validation")
                for o in observations
            ]
            result.selections.append(oi)
            result.openimages = stats
            log(f"  altro/openimages {len(oi.observations)} images ({stats['candidates']} candidates without plant labels)")
    return result


# --- size estimate -------------------------------------------------------------------


def head_size(url: str, user_agent: str, timeout_s: float = 30.0) -> int | None:
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": user_agent})
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            length = response.headers.get("Content-Length")
            return int(length) if length else None
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def sample_photos(photos: Sequence[tuple[str, str]], count: int, seed: str) -> list[tuple[str, str]]:
    return sorted(photos, key=lambda p: hashlib.sha256(f"{seed}|{p[0]}".encode()).hexdigest())[:count]


def estimate_sizes(
    photos: Sequence[tuple[str, str]],
    cache_path: Path,
    user_agent: str,
    *,
    sample: int,
    seed: str,
    interval_s: float = 0.2,
    head: Callable[[str, str], int | None] = head_size,
) -> dict[str, Any]:
    """Mean file size from HEAD requests on a deterministic sample (no image is downloaded)."""
    cache: dict[str, int | None] = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    chosen = sample_photos(photos, sample, seed)
    for photo_id, url in chosen:
        if photo_id not in cache:
            cache[photo_id] = head(url, user_agent)
            time.sleep(interval_s)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=0), encoding="utf-8", newline="\n")
    sizes = [cache[p] for p, _ in chosen if cache.get(p)]
    if not sizes:
        return {"sample": 0, "mean": None, "stdev": None, "missing": len(chosen)}
    return {
        "sample": len(sizes),
        "mean": statistics.fmean(sizes),
        "stdev": statistics.stdev(sizes) if len(sizes) > 1 else 0.0,
        "median": statistics.median(sizes),
        "missing": len(chosen) - len(sizes),
    }


# --- plan.json ------------------------------------------------------------------------


def selection_summary(selection: Selection) -> dict[str, Any]:
    observations = selection.observations
    return {
        "key": selection.key,
        "label": selection.label,
        "source": selection.source,
        "targetMin": selection.target_min,
        "targetMax": selection.target_max,
        "observations": len(observations),
        "images": selection.images,
        "observers": len({o.observer_key for o in observations}),
        "relaxed": selection.relaxed,
        "belowMin": selection.below_min,
        "note": selection.note,
        "byPlace": dict(Counter(o.tier.split("/")[0] for o in observations if "/" in o.tier)),
        "byQuality": dict(Counter(o.tier.split("/")[1] for o in observations if o.tier.count("/") >= 2)),
        "annotated": sum(1 for o in observations if o.tier.endswith("/annotated")),
        "tiers": [asdict(t) for t in selection.tiers if t.queried],
    }


def plan_document(
    result: PlanResult,
    settings: Settings,
    client: inat.ApiClient,
    sizes: dict[str, Any],
    *,
    partial: bool,
) -> dict[str, Any]:
    return {
        "created": datetime.now().isoformat(timespec="seconds"),
        "partial": partial,
        "settings": settings.snapshot(),
        "api": {
            "networkRequests": client.network_requests,
            "cachedRequests": client.cached_requests,
            "networkBytes": client.network_bytes,
        },
        "taxaProblems": result.taxa_problems,
        "selections": [selection_summary(s) for s in result.selections],
        "altroSources": [item.as_dict() for item in result.altro_sources],
        "openimages": result.openimages,
        "sizes": sizes,
    }


def write_plan(path: Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
