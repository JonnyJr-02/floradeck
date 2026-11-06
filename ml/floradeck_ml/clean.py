"""Cleaning and split: decode every image, drop the unusable ones and the
near-duplicates, split by observation, write ``dataset.csv``.

Steps (``python -m floradeck_ml clean``):

1. decode each downloaded image (truncated or corrupt files are rejected), measure it
   and compute its perceptual hash; results are cached in ``clean/hashes.csv``;
2. reject images whose shorter side is below ``min_side`` or that are too elongated;
3. group near-duplicates (pHash Hamming distance <= ``phash_max_distance``) across the
   whole dataset: keep the first copy, or drop all copies when their labels disagree;
4. split by observation into train/val/test, test grouped by observer (``split.py``).
"""

from __future__ import annotations

import csv
import json
import os
from collections import Counter, defaultdict
from collections.abc import Callable, Sequence
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

from .dedupe import near_duplicate_groups, resolve_duplicates
from .phash import from_hex, phash, to_hex
from .records import Observation, image_path
from .split import TEST, TRAIN, VAL, SplitItem, assign_splits

Log = Callable[[str], None]
DATASET_FIELDS = [
    "path",
    "label",
    "split",
    "source",
    "group",
    "provider",
    "photo_id",
    "observation_id",
    "observer",
    "tier",
    "width",
    "height",
    "phash",
]


@dataclass(frozen=True)
class ImageInfo:
    width: int
    height: int
    phash: str  # hex; empty when the file could not be decoded
    error: str = ""


def analyse(path: str) -> ImageInfo:
    """Decode the whole file (catches truncation), measure it and hash it."""
    try:
        with Image.open(path) as image:
            width, height = image.size
            image.draft("L", (64, 64))  # JPEG: decode at reduced scale, much faster
            image.load()
            image = ImageOps.exif_transpose(image)
            return ImageInfo(width, height, to_hex(phash(image)))
    except Exception as err:  # noqa: BLE001 - any decoding failure rejects the file
        return ImageInfo(0, 0, "", f"{type(err).__name__}: {err}")


def _load_hash_cache(path: Path) -> dict[str, tuple[int, int, ImageInfo]]:
    cache: dict[str, tuple[int, int, ImageInfo]] = {}
    if path.exists():
        with path.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                info = ImageInfo(int(row["width"]), int(row["height"]), row["phash"], row["error"])
                cache[row["path"]] = (int(row["size"]), int(row["mtime_ns"]), info)
    return cache


def _save_hash_cache(path: Path, cache: dict[str, tuple[int, int, ImageInfo]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["path", "size", "mtime_ns", "width", "height", "phash", "error"])
        for key in sorted(cache):
            size, mtime, info = cache[key]
            writer.writerow([key, size, mtime, info.width, info.height, info.phash, info.error])
    temp.replace(path)


def analyse_all(paths: Sequence[Path], root: Path, cache_path: Path, workers: int, log: Log) -> dict[str, ImageInfo]:
    """ImageInfo for each path (keyed by POSIX path relative to ``root``), cached by size and mtime."""
    cache = _load_hash_cache(cache_path)
    results: dict[str, ImageInfo] = {}
    todo: list[tuple[str, Path, int, int]] = []
    for path in paths:
        key = path.relative_to(root).as_posix()
        stat = path.stat()
        cached = cache.get(key)
        if cached and cached[0] == stat.st_size and cached[1] == stat.st_mtime_ns:
            results[key] = cached[2]
        else:
            todo.append((key, path, stat.st_size, stat.st_mtime_ns))
    log(f"{len(paths):,} images on disk, {len(results):,} already analysed, {len(todo):,} to analyse")
    if todo:
        with ProcessPoolExecutor(max_workers=workers or os.cpu_count() or 1) as pool:
            for index, (item, info) in enumerate(
                zip(todo, pool.map(analyse, [str(t[1]) for t in todo], chunksize=64), strict=True), start=1
            ):
                key, _, size, mtime = item
                cache[key] = (size, mtime, info)
                results[key] = info
                if index % 5000 == 0:
                    log(f"  analysed {index:,}/{len(todo):,}")
                    _save_hash_cache(cache_path, cache)
        _save_hash_cache(cache_path, cache)
    return results


@dataclass(frozen=True)
class Candidate:
    path: str
    observation: Observation
    photo_id: str
    info: ImageInfo


def size_problem(info: ImageInfo, min_side: int, max_aspect: float) -> str:
    if info.error or not info.phash:
        return "unreadable"
    short, long = sorted((info.width, info.height))
    if short < min_side:
        return "too-small"
    if long / short > max_aspect:
        return "too-elongated"
    return ""


def build_dataset(
    observations: Sequence[Observation],
    data_root: Path,
    *,
    hashes_path: Path,
    min_side: int,
    max_aspect: float,
    max_distance: int,
    split_settings: dict,
    class_order: Sequence[str],
    workers: int,
    log: Log = print,
) -> dict:
    images_dir = data_root / "images"
    entries = []
    for observation in observations:
        for photo in observation.photos:
            path = images_dir / image_path(observation, photo)
            if path.exists():
                entries.append((path, observation, photo.id))
    infos = analyse_all([e[0] for e in entries], data_root, hashes_path, workers, log)

    rejected: list[tuple[str, str, str]] = []  # path, label, reason
    candidates: list[Candidate] = []
    for path, observation, photo_id in entries:
        key = path.relative_to(data_root).as_posix()
        info = infos[key]
        problem = size_problem(info, min_side, max_aspect)
        if problem:
            rejected.append((key, observation.label, problem))
        else:
            candidates.append(Candidate(key, observation, photo_id, info))

    groups = near_duplicate_groups([from_hex(c.info.phash) for c in candidates], max_distance)
    dropped = resolve_duplicates(groups, [c.observation.label for c in candidates])
    kept = [c for i, c in enumerate(candidates) if i not in dropped]
    rejected += [(candidates[i].path, candidates[i].observation.label, reason) for i, reason in sorted(dropped.items())]
    log(f"{len(groups):,} near-duplicate groups; {len(dropped):,} images dropped, {len(kept):,} kept")

    split = assign_splits(
        [SplitItem(c.observation.key, c.observation.observer_key, c.observation.label) for c in kept],
        test=split_settings["test"],
        val=split_settings["val"],
        seed=split_settings["seed"],
        min_test=split_settings["min_test_per_class"],
        min_val=split_settings["min_val_per_class"],
    )
    rows = []
    for c in kept:
        o = c.observation
        rows.append(
            {
                "path": c.path,
                "label": o.label,
                "split": split[o.key],
                "source": o.source,
                "group": o.group,
                "provider": o.provider,
                "photo_id": c.photo_id,
                "observation_id": o.id,
                "observer": o.observer_key,
                "tier": o.tier,
                "width": c.info.width,
                "height": c.info.height,
                "phash": c.info.phash,
            }
        )
    labels_present = {row["label"] for row in rows}
    classes = [label for label in class_order if label in labels_present]
    selected = {o.label for o in observations}
    missing = [label for label in class_order if label in selected and label not in labels_present]
    if missing:
        log(f"WARNING: {len(missing)} selected classes have no usable image: {', '.join(missing)}")
    return {"rows": rows, "rejected": rejected, "classes": classes, "missing": missing, "groups": len(groups)}


def write_dataset(result: dict, dataset_path: Path, rejected_path: Path, classes_path: Path, report_path: Path) -> None:
    dataset_path.parent.mkdir(parents=True, exist_ok=True)
    with dataset_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=DATASET_FIELDS)
        writer.writeheader()
        writer.writerows(result["rows"])
    rejected_path.parent.mkdir(parents=True, exist_ok=True)
    with rejected_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["path", "label", "reason"])
        writer.writerows(result["rejected"])
    classes_path.write_text(
        json.dumps({"classes": result["classes"]}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n"
    )
    report_path.write_text(render_clean_report(result), encoding="utf-8", newline="\n")


def render_clean_report(result: dict) -> str:
    per_class: dict[str, Counter] = defaultdict(Counter)
    observers: dict[str, dict[str, set]] = defaultdict(lambda: defaultdict(set))
    for row in result["rows"]:
        per_class[row["label"]][row["split"]] += 1
        observers[row["split"]][row["label"]].add(row["observer"])
    reasons = Counter(reason for _, _, reason in result["rejected"])
    total = Counter()
    for counts in per_class.values():
        total.update(counts)
    test_observers = set().union(*observers[TEST].values()) if observers[TEST] else set()
    other_observers = set()
    for part in (TRAIN, VAL):
        for values in observers[part].values():
            other_observers |= values
    lines = [
        "# Pulizia e split del dataset",
        "",
        f"- Immagini nel dataset: {sum(total.values()):,} (train {total[TRAIN]:,}, val {total[VAL]:,}, test {total[TEST]:,}).",
        f"- Scartate: {len(result['rejected']):,}"
        + (" (" + ", ".join(f"{r} {n:,}" for r, n in reasons.most_common()) + ")." if reasons else "."),
        f"- Gruppi di quasi-duplicati: {result['groups']:,}.",
        f"- Osservatori in test: {len(test_observers):,}; in comune con train/val: {len(test_observers & other_observers)}.",
    ]
    if result.get("missing"):
        lines.append(f"- **Classi del manifest senza immagini utilizzabili** (escluse da classes.json): {', '.join(result['missing'])}.")
    lines += [
        "",
        "| Classe | Train | Val | Test |",
        "|---|---:|---:|---:|",
    ]
    for label in result["classes"]:
        counts = per_class[label]
        lines.append(f"| `{label}` | {counts[TRAIN]} | {counts[VAL]} | {counts[TEST]} |")
    lines.append("")
    return "\n".join(lines)
