"""Settings for the dataset pipeline.

Defaults live here; ``ml/dataset.toml`` overrides them key by key and the CLI
overrides a few more. Unknown keys are an error, so a typo never goes unnoticed.
"""

from __future__ import annotations

import dataclasses
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Place:
    name: str
    place_id: int | None = None
    not_in_place: int | None = None

    def params(self) -> dict[str, int]:
        params: dict[str, int] = {}
        if self.place_id is not None:
            params["place_id"] = self.place_id
        if self.not_in_place is not None:
            params["not_in_place"] = self.not_in_place
        return params


@dataclass(frozen=True)
class NamedTaxon:
    id: int
    name: str


@dataclass(frozen=True)
class InatSettings:
    api: str = "https://api.inaturalist.org/v2"
    user_agent: str = "FloraDeck-dataset/0.1 (personal non-commercial project)"
    min_interval_s: float = 1.0
    max_requests_per_run: int = 9500
    licenses: tuple[str, ...] = ("cc0", "cc-by", "cc-by-nc")
    photo_size: str = "medium"
    photo_host: str = "inaturalist-open-data.s3.amazonaws.com"
    page_size: int = 200
    concurrency: int = 2
    places: tuple[Place, ...] = (
        Place("italy", 6973),
        Place("europe", 97391, 6973),
        Place("world", None, 97391),
    )


@dataclass(frozen=True)
class ClassSettings:
    target_min: int = 300
    target_max: int = 500
    max_per_observer: int = 20
    photos_per_observation: int = 1
    photos_per_observation_low: int = 2
    min_side: int = 224
    max_aspect: float = 3.0
    extra_phenology: dict[str, tuple[str, ...]] = field(
        default_factory=lambda: {"punica-granatum": ("flowering",)}
    )


@dataclass(frozen=True)
class AltroSettings:
    label: str = "altro"
    lookalike_target: int = 100
    lookalike_max_per_observer: int = 10
    common_root_taxon: int = 211194
    common_species: int = 300
    common_target: int = 20
    common_max_per_observer: int = 5
    leaves_target: int = 2000
    leaves_max_per_class: int = 10
    leaves_max_per_observer: int = 5
    nonplant_target: int = 250
    nonplant_max_per_observer: int = 10
    nonplant_taxa: tuple[NamedTaxon, ...] = (
        NamedTaxon(47170, "Fungi"),
        NamedTaxon(3, "Aves"),
        NamedTaxon(40151, "Mammalia"),
        NamedTaxon(26036, "Reptilia"),
        NamedTaxon(20978, "Amphibia"),
        NamedTaxon(47115, "Mollusca"),
    )
    openimages_count: int = 2000


@dataclass(frozen=True)
class DownloadSettings:
    max_gb_per_hour: float = 5.0
    max_gb_per_day: float = 24.0
    workers: int = 8
    timeout_s: float = 60.0
    retries: int = 4
    openimages_max_side: int = 500
    jpeg_quality: int = 90
    min_free_gb: float = 2.0


@dataclass(frozen=True)
class CleanSettings:
    min_side: int = 224
    max_aspect: float = 3.0
    phash_max_distance: int = 4
    workers: int = 0


@dataclass(frozen=True)
class SplitSettings:
    test: float = 0.10
    val: float = 0.10
    seed: str = "floradeck-v1"
    min_test_per_class: int = 10
    min_val_per_class: int = 5


@dataclass(frozen=True)
class Settings:
    inat: InatSettings = field(default_factory=InatSettings)
    classes: ClassSettings = field(default_factory=ClassSettings)
    altro: AltroSettings = field(default_factory=AltroSettings)
    download: DownloadSettings = field(default_factory=DownloadSettings)
    clean: CleanSettings = field(default_factory=CleanSettings)
    split: SplitSettings = field(default_factory=SplitSettings)

    def snapshot(self) -> dict[str, Any]:
        """Plain-JSON view, stored next to the manifest for reproducibility."""
        return dataclasses.asdict(self)


class ConfigError(ValueError):
    pass


def _convert(section: str, key: str, value: Any, default: Any) -> Any:
    if key == "places":
        return tuple(Place(**item) for item in value)
    if key == "nonplant_taxa":
        return tuple(NamedTaxon(**item) for item in value)
    if key == "extra_phenology":
        allowed = {"flowering", "fruiting"}
        converted = {species: tuple(phases) for species, phases in value.items()}
        for species, phases in converted.items():
            if not set(phases) <= allowed:
                raise ConfigError(f"[{section}] extra_phenology.{species}: phases must be in {sorted(allowed)}")
        return converted
    if isinstance(default, tuple):
        return tuple(value)
    if isinstance(default, float) and isinstance(value, int):
        return float(value)
    if default is not None and not isinstance(value, type(default)):
        raise ConfigError(f"[{section}] {key}: expected {type(default).__name__}, got {type(value).__name__}")
    return value


def _apply(section: str, current: Any, overrides: dict[str, Any]) -> Any:
    known = {f.name: getattr(current, f.name) for f in dataclasses.fields(current)}
    unknown = sorted(set(overrides) - set(known))
    if unknown:
        raise ConfigError(f"[{section}] unknown keys: {', '.join(unknown)}")
    values = {key: _convert(section, key, value, known[key]) for key, value in overrides.items()}
    return dataclasses.replace(current, **values)


def load_settings(path: Path | None) -> Settings:
    """Defaults, updated with the TOML file when it exists."""
    settings = Settings()
    if path is None or not path.exists():
        return settings
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    sections = {f.name for f in dataclasses.fields(settings)}
    unknown = sorted(set(data) - sections)
    if unknown:
        raise ConfigError(f"{path.name}: unknown sections: {', '.join(unknown)}")
    updates = {name: _apply(name, getattr(settings, name), values) for name, values in data.items()}
    settings = dataclasses.replace(settings, **updates)
    validate(settings)
    return settings


def validate(settings: Settings) -> None:
    c = settings.classes
    if not 0 < c.target_min <= c.target_max:
        raise ConfigError("classes: need 0 < target_min <= target_max")
    if c.photos_per_observation < 1 or c.photos_per_observation_low < c.photos_per_observation:
        raise ConfigError("classes: need 1 <= photos_per_observation <= photos_per_observation_low")
    s = settings.split
    if not (0 < s.test < 1 and 0 < s.val < 1 and s.test + s.val < 1):
        raise ConfigError("split: test and val must be fractions with test + val < 1")
    if not 1 <= settings.inat.concurrency <= 3:
        raise ConfigError("inat: concurrency must be between 1 and 3")
    if settings.inat.min_interval_s < 1.0:
        raise ConfigError("inat: min_interval_s below 1 s would break iNaturalist's rate guidance")
    if not 0 < settings.download.max_gb_per_hour <= 5.0:
        raise ConfigError("download: max_gb_per_hour must be in (0, 5]")
    if not settings.inat.places:
        raise ConfigError("inat: at least one place is needed")
