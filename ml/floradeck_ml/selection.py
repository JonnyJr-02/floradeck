"""Pick observations for one class (or one "altro" source) by walking its tiers.

Pure logic: pages come from an injected ``fetch(tier, id_below)`` function, so the
rules (targets, caps, global uniqueness, photo checks) are unit-tested offline.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Hashable, Iterable, Iterator, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field, replace

from .records import Observation, Photo
from .tiers import Tier

PageFetcher = Callable[[Tier, int | None], tuple[list[Observation], int]]
PhotoFilter = Callable[[Sequence[Photo]], Sequence[Photo]]


@dataclass(frozen=True)
class Cap:
    """At most ``limit`` observations per value of ``key`` (e.g. per observer)."""

    name: str
    key: Callable[[Observation], Hashable | None]
    limit: int


def by_observer(limit: int) -> Cap:
    return Cap("observer", lambda observation: observation.observer_key, limit)


@dataclass
class TierOutcome:
    name: str
    place: str
    quality: str
    annotated: bool
    fallback: bool
    queried: bool = False
    available: int | None = None  # total reported by the API for this tier
    pages: int = 0
    taken: int = 0
    duplicates: int = 0  # already taken by an earlier tier, class or source
    no_photo: int = 0  # no photo with an allowed licence and size
    capped: int = 0  # over a cap; kept in reserve


@dataclass
class Selection:
    key: str
    label: str
    source: str
    target_min: int
    target_max: int
    observations: list[Observation] = field(default_factory=list)
    tiers: list[TierOutcome] = field(default_factory=list)
    relaxed: int = 0  # observations added back from the reserve to reach target_min
    note: str = ""

    @property
    def images(self) -> int:
        return sum(len(observation.photos) for observation in self.observations)

    @property
    def below_min(self) -> bool:
        return len(self.observations) < self.target_min


def select(
    tiers: Sequence[Tier],
    fetch: PageFetcher,
    *,
    key: str,
    label: str,
    source: str,
    target_min: int,
    target_max: int,
    caps: Sequence[Cap] = (),
    taken_observations: set[str] | frozenset[str] = frozenset(),
    taken_photos: set[str] | frozenset[str] = frozenset(),
    photo_filter: PhotoFilter = lambda photos: photos,
    max_pages_per_tier: int = 100,
) -> Selection:
    """Walk the tiers, newest observations first, until the targets are met.

    - ``fill_to="max"`` tiers fill up to ``target_max``, ``fill_to="min"`` ones only up to
      ``target_min``;
    - an observation already taken (here or by an earlier class) is skipped, and so are
      photos already taken;
    - observations over a cap go to a reserve, used in order only if the class would
      otherwise stay below ``target_min``.
    """
    selection = Selection(key=key, label=label, source=source, target_min=target_min, target_max=target_max)
    counters: dict[str, Counter] = {cap.name: Counter() for cap in caps}
    reserve: list[Observation] = []
    seen: set[str] = set()
    outcomes: dict[str, TierOutcome] = {}

    def over_cap(observation: Observation) -> bool:
        for cap in caps:
            value = cap.key(observation)
            if value is not None and counters[cap.name][value] >= cap.limit:
                return True
        return False

    def count(observation: Observation) -> None:
        for cap in caps:
            value = cap.key(observation)
            if value is not None:
                counters[cap.name][value] += 1

    for tier in tiers:
        outcome = TierOutcome(tier.name, tier.place, tier.quality, tier.annotated, tier.fill_to == "min")
        selection.tiers.append(outcome)
        outcomes[tier.name] = outcome
        goal = target_max if tier.fill_to == "max" else target_min
        cursor: int | None = None
        while len(selection.observations) < goal and outcome.pages < max_pages_per_tier:
            page, total = fetch(tier, cursor)
            outcome.queried = True
            outcome.pages += 1
            if outcome.available is None:
                outcome.available = total
            for observation in page:
                if len(selection.observations) >= goal:
                    break
                if observation.key in seen or observation.key in taken_observations:
                    outcome.duplicates += 1
                    continue
                seen.add(observation.key)
                photos = tuple(p for p in photo_filter(observation.photos) if p.id not in taken_photos)
                if not photos:
                    outcome.no_photo += 1
                    continue
                observation = replace(observation, photos=photos, label=label, source=source, group=key, tier=tier.name)
                if over_cap(observation):
                    outcome.capped += 1
                    reserve.append(observation)
                    continue
                count(observation)
                selection.observations.append(observation)
                outcome.taken += 1
            if len(page) < tier.page_size:
                break  # tier exhausted
            cursor = min(int(observation.id) for observation in page)

    missing = target_min - len(selection.observations)
    if missing > 0 and reserve:
        extra = reserve[:missing]
        selection.observations.extend(extra)
        selection.relaxed = len(extra)
        for observation in extra:
            outcomes[observation.tier].taken += 1
    return selection


def trim_photos(selection: Selection, per_observation: int, per_observation_low: int) -> None:
    """Keep the first photos of each observation: more of them for classes below target."""
    keep = per_observation_low if selection.below_min else per_observation
    selection.observations = [
        replace(observation, photos=observation.photos[:keep]) for observation in selection.observations
    ]


def claim(selection: Selection, taken_observations: set[str], taken_photos: set[str]) -> int:
    """Mark a finished selection's observations and photos as used.

    Selections may be computed in parallel; claiming them one by one, in a fixed order,
    keeps the result deterministic: an observation or photo already claimed by an
    earlier selection is dropped from this one. Returns how many observations were dropped.
    """
    kept = []
    for observation in selection.observations:
        if observation.key in taken_observations:
            continue
        photos = tuple(p for p in observation.photos if p.id not in taken_photos)
        if not photos:
            continue
        if len(photos) != len(observation.photos):
            observation = replace(observation, photos=photos)
        kept.append(observation)
        taken_observations.add(observation.key)
        taken_photos.update(photo.id for photo in photos)
    dropped = len(selection.observations) - len(kept)
    selection.observations = kept
    return dropped


def parallel_map[T, R](fn: Callable[[T], R], items: Iterable[T], workers: int) -> Iterator[R]:
    """``map`` with a few threads, results in input order (the API client spaces the requests)."""
    items = list(items)
    if workers <= 1:
        for item in items:
            yield fn(item)
        return
    pool = ThreadPoolExecutor(max_workers=workers)
    try:
        futures = [pool.submit(fn, item) for item in items]
        for future in futures:
            yield future.result()
    finally:
        pool.shutdown(wait=True, cancel_futures=True)
