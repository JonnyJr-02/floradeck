"""Observation and photo records, as stored in the selection manifest."""

from __future__ import annotations

import json
from collections.abc import Iterable, Iterator
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from typing import Any

INAT = "inaturalist"
OPENIMAGES = "openimages"


@dataclass(frozen=True)
class Photo:
    id: str
    url: str  # the file to download
    license: str
    attribution: str
    width: int | None = None  # original dimensions, when known
    height: int | None = None


@dataclass(frozen=True)
class Observation:
    provider: str  # inaturalist | openimages
    id: str
    observer_id: str
    observer_login: str
    observer_name: str
    taxon_id: int | None
    taxon_name: str
    quality: str
    observed_on: str | None
    page_url: str
    photos: tuple[Photo, ...]
    # Filled in by the selection:
    label: str = ""
    source: str = ""  # catalog | altro/lookalike | altro/common | altro/leaves | altro/nonplant | altro/openimages
    group: str = ""  # the class id, or the altro sub-source it belongs to
    tier: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.provider}:{self.id}"

    @property
    def observer_key(self) -> str:
        return f"{self.provider}:{self.observer_id}"


def medium_url(square_url: str, size: str) -> str:
    """iNaturalist returns the square thumbnail; the other sizes share the path."""
    head, _, tail = square_url.rpartition("/")
    _, dot, extension = tail.partition(".")
    return f"{head}/{size}{dot}{extension}"


def parse_inat(raw: dict[str, Any], photo_size: str) -> Observation:
    user = raw.get("user") or {}
    taxon = raw.get("taxon") or {}
    photos = []
    for item in raw.get("photos") or []:
        url = item.get("url") or ""
        dims = item.get("original_dimensions") or {}
        photos.append(
            Photo(
                id=str(item["id"]),
                url=medium_url(url, photo_size) if url else "",
                license=(item.get("license_code") or "").lower(),
                attribution=item.get("attribution") or "",
                width=dims.get("width"),
                height=dims.get("height"),
            )
        )
    observation_id = str(raw["id"])
    return Observation(
        provider=INAT,
        id=observation_id,
        observer_id=str(user.get("id", "")),
        observer_login=user.get("login") or "",
        observer_name=user.get("name") or "",
        taxon_id=taxon.get("id"),
        taxon_name=taxon.get("name") or "",
        quality=raw.get("quality_grade") or "",
        observed_on=raw.get("observed_on"),
        page_url=f"https://www.inaturalist.org/observations/{observation_id}",
        photos=tuple(photos),
        extra={"ancestor_ids": taxon["ancestor_ids"]} if taxon.get("ancestor_ids") else {},
    )


def eligible_photos(
    photos: Iterable[Photo],
    *,
    licenses: Iterable[str],
    host: str,
    resized_long_side: int,
    min_side: int,
    max_aspect: float,
) -> tuple[Photo, ...]:
    """Photos with an allowed licence, on the open-data host, big enough once resized.

    ``resized_long_side`` is the long side of the downloaded size (500 for "medium");
    photos without known dimensions pass and are checked again after download.
    """
    allowed = {code.lower() for code in licenses}
    kept = []
    for photo in photos:
        if photo.license not in allowed or not photo.url or f"//{host}/" not in photo.url:
            continue
        if photo.width and photo.height:
            long_side, short_side = max(photo.width, photo.height), min(photo.width, photo.height)
            scale = min(1.0, resized_long_side / long_side)
            if short_side * scale < min_side or long_side / short_side > max_aspect:
                continue
        kept.append(photo)
    return tuple(kept)


def to_json(observation: Observation) -> str:
    return json.dumps(asdict(observation), ensure_ascii=False, separators=(",", ":"))


def from_json(line: str) -> Observation:
    data = json.loads(line)
    data["photos"] = tuple(Photo(**photo) for photo in data["photos"])
    return Observation(**data)


def write_manifest(path: Path, observations: Iterable[Observation]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    count = 0
    with temp.open("w", encoding="utf-8", newline="\n") as handle:
        for observation in observations:
            handle.write(to_json(observation) + "\n")
            count += 1
    temp.replace(path)
    return count


def read_manifest(path: Path) -> Iterator[Observation]:
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield from_json(line)


def with_photos(observation: Observation, photos: Iterable[Photo]) -> Observation:
    return replace(observation, photos=tuple(photos))


def image_path(observation: Observation, photo: Photo) -> Path:
    """Relative path of a photo inside ``ml/data/images``: always a JPEG (see download.prepare_image)."""
    return Path(observation.label) / f"{photo.id}.jpg"
