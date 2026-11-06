"""Everyday scenes without plants, from the Open Images V7 validation split.

- Images: Flickr photos that Open Images lists as CC BY 2.0 (attribution: author and
  Flickr page, kept per image). Files come from the public ``open-images-dataset``
  bucket hosted by the Common Visual Data Foundation.
- Labels: human-verified image-level labels (CC BY 4.0, Google). An image is kept when
  it has at least one positive label and no positive label that names a plant, a
  plant part, a garden or a natural landscape. Labels are not exhaustive, so a few
  kept images may still show some vegetation in the background.
"""

from __future__ import annotations

import csv
import hashlib
import re
import urllib.request
from collections.abc import Iterable, Sequence
from pathlib import Path

from .records import OPENIMAGES, Observation, Photo

IMAGES_CSV = "https://storage.googleapis.com/openimages/2018_04/validation/validation-images-with-rotation.csv"
LABELS_CSV = "https://storage.googleapis.com/openimages/v7/oidv7-val-annotations-human-imagelabels.csv"
CLASSES_CSV = "https://storage.googleapis.com/openimages/v7/oidv7-class-descriptions.csv"
IMAGE_URL = "https://open-images-dataset.s3.amazonaws.com/validation/{image_id}.jpg"
CC_BY_2 = "https://creativecommons.org/licenses/by/2.0/"

# Whole words (singular or plural) and word prefixes that mark a plant-related label.
_PLANT_WORDS = (
    "plant flower flora bloom blossom petal tree leaf leaves foliage grass lawn meadow prairie pasture shrub bush hedge "
    "herb garden yard park botany fruit berry berries vegetable vegetation moss fern cactus cacti succulent palm "
    "bouquet vine ivy forest wood woods woodland jungle orchard vineyard field crop wheat grain maize corn seedling "
    "sapling bamboo conifer pine oak maple willow birch cypress spruce cedar twig branch rose lily lilies tulip "
    "daisy daisies sunflower lavender poppy poppies orchid dandelion clover thistle wildflower weed lemon lime "
    "orange apple grape tomato pepper pumpkin squash cucumber eggplant aubergine pomegranate fig olive citrus melon "
    "banana pear peach plum apricot nature landscape groundcover evergreen deciduous perennial houseplant "
    "flowerpot salad lettuce cabbage spinach basil mint rosemary thyme sage parsley seed nut acorn pinecone hay "
    "reed algae seaweed hedgerow topiary greenhouse ikebana wreath pineapple grapefruit watermelon coconut "
    "avocado mango kiwi bonsai shrubbery"
).split()
_PLANT_PREFIXES = ("botan", "floral", "flower", "strawberr", "cherr", "blueberr", "raspberr", "horticult", "agricult")
PLANT_LABEL = re.compile(
    r"\b(?:(?:" + "|".join(_PLANT_WORDS) + r")(?:s|es)?\b|(?:" + "|".join(_PLANT_PREFIXES) + r"))",
    re.IGNORECASE,
)


def plant_label_ids(classes: Iterable[tuple[str, str]]) -> set[str]:
    """Label ids (MIDs) whose display name matches a plant-related word."""
    return {mid for mid, name in classes if PLANT_LABEL.search(name)}


def images_without_plants(labels: Iterable[tuple[str, str, str]], plant_ids: set[str]) -> set[str]:
    """Images with at least one positive label and no positive plant-related label.

    ``labels`` holds (ImageID, LabelName, Confidence) rows; Confidence "1" is a verified
    positive, "0" a verified negative.
    """
    positive: set[str] = set()
    with_plants: set[str] = set()
    for image_id, label, confidence in labels:
        if confidence.strip() not in ("1", "1.0"):
            continue
        positive.add(image_id)
        if label in plant_ids:
            with_plants.add(image_id)
    return positive - with_plants


def sample_ids(ids: Iterable[str], count: int, seed: str) -> list[str]:
    """A deterministic sample: the ids with the smallest seeded hash."""
    def rank(image_id: str) -> str:
        return hashlib.sha256(f"{seed}|{image_id}".encode()).hexdigest()

    return sorted(ids, key=rank)[:count]


def observation_from_row(row: dict[str, str]) -> Observation | None:
    if row.get("License", "").strip() != CC_BY_2:
        return None
    image_id = row["ImageID"]
    author = row.get("Author", "").strip() or "unknown"
    landing = row.get("OriginalLandingURL", "").strip()
    return Observation(
        provider=OPENIMAGES,
        id=image_id,
        observer_id=row.get("AuthorProfileURL", "").strip() or author,
        observer_login=author,
        observer_name=author,
        taxon_id=None,
        taxon_name="",
        quality="",
        observed_on=None,
        page_url=landing,
        photos=(
            Photo(
                id=f"oi-{image_id}",
                url=IMAGE_URL.format(image_id=image_id),
                license="cc-by-2.0",
                attribution=f"{author}, CC BY 2.0 (Flickr, via Open Images)",
            ),
        ),
    )


def download_file(url: str, dest: Path, user_agent: str, timeout_s: float = 120.0) -> int:
    """Fetch a metadata file once; later runs reuse it. Returns the bytes fetched (0 if cached)."""
    if dest.exists():
        return 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    temp = dest.with_suffix(dest.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": user_agent})
    size = 0
    with urllib.request.urlopen(request, timeout=timeout_s) as response, temp.open("wb") as handle:
        while chunk := response.read(1 << 20):
            handle.write(chunk)
            size += len(chunk)
    temp.replace(dest)
    return size


def _rows(path: Path) -> Iterable[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)


def _class_rows(path: Path) -> Iterable[tuple[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if len(row) >= 2 and row[0] != "LabelName":
                yield row[0], row[1]


def _label_rows(path: Path) -> Iterable[tuple[str, str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        next(reader, None)
        for row in reader:
            if len(row) >= 4:
                yield row[0], row[2], row[3]


def plan_openimages(
    cache_dir: Path, count: int, seed: str, user_agent: str, exclude: Sequence[str] = ()
) -> tuple[list[Observation], dict[str, int]]:
    """Choose ``count`` images; returns the observations and some statistics."""
    files = {name: cache_dir / name for name in ("images.csv", "labels.csv", "classes.csv")}
    fetched = 0
    for name, url in (("images.csv", IMAGES_CSV), ("labels.csv", LABELS_CSV), ("classes.csv", CLASSES_CSV)):
        fetched += download_file(url, files[name], user_agent)
    plant_ids = plant_label_ids(_class_rows(files["classes.csv"]))
    candidates = images_without_plants(_label_rows(files["labels.csv"]), plant_ids) - set(exclude)
    rows = {row["ImageID"]: row for row in _rows(files["images.csv"])}
    candidates &= set(rows)
    observations = []
    for image_id in sample_ids(candidates, len(candidates), seed):
        observation = observation_from_row(rows[image_id])
        if observation is not None:
            observations.append(observation)
        if len(observations) >= count:
            break
    stats = {
        "metadata_bytes_fetched": fetched,
        "plant_labels": len(plant_ids),
        "images": len(rows),
        "candidates": len(candidates),
        "selected": len(observations),
    }
    return observations, stats
