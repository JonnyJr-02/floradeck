"""Where things live. Everything under ``ml/data/`` is git-ignored."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = ML_DIR.parent
CATALOG_SPECIES = REPO_DIR / "catalog" / "species.json"
DEFAULT_CONFIG = ML_DIR / "dataset.toml"
REPORTS_DIR = ML_DIR / "reports"
DEFAULT_DATA_DIR = ML_DIR / "data"


@dataclass(frozen=True)
class DataPaths:
    root: Path

    @property
    def api_cache(self) -> Path:
        return self.root / "cache" / "inat"

    @property
    def openimages_cache(self) -> Path:
        return self.root / "cache" / "openimages"

    @property
    def size_cache(self) -> Path:
        return self.root / "cache" / "photo-sizes.json"

    @property
    def manifest_dir(self) -> Path:
        return self.root / "manifest"

    @property
    def manifest(self) -> Path:
        """One JSON line per selected observation, with the photos to download."""
        return self.manifest_dir / "selection.jsonl"

    @property
    def plan(self) -> Path:
        """Per-class summary of the selection, plus settings and API statistics."""
        return self.manifest_dir / "plan.json"

    @property
    def report(self) -> Path:
        return self.manifest_dir / "report.md"

    @property
    def images(self) -> Path:
        return self.root / "images"

    @property
    def attributions(self) -> Path:
        return self.root / "attributions.csv"

    @property
    def download_failures(self) -> Path:
        return self.root / "download-failures.csv"

    @property
    def clean_dir(self) -> Path:
        return self.root / "clean"

    @property
    def hashes(self) -> Path:
        return self.clean_dir / "hashes.csv"

    @property
    def rejected(self) -> Path:
        return self.clean_dir / "rejected.csv"

    @property
    def dataset(self) -> Path:
        """The training table: one row per image with its label and split."""
        return self.root / "dataset.csv"

    @property
    def classes(self) -> Path:
        return self.root / "classes.json"

    @property
    def clean_report(self) -> Path:
        return self.clean_dir / "report.md"
