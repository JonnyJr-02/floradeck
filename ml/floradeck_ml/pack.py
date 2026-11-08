"""Pack the cleaned dataset for upload to a Kaggle dataset (``python -m floradeck_ml pack``).

The training notebook (``ml/kaggle/``) reads this bundle. Steps:

1. read ``dataset.csv`` and the *current* catalogue (``catalog/species.json``);
2. images of species that have left the catalogue become examples of "altro"
   (at most ``excluded_per_class`` per former species, chosen by a seeded hash, split
   kept): the model then learns to say "not in the catalogue" for them;
3. optionally keep a small sample (``max_classes`` / ``sample``) for quick tests;
4. write the images in uncompressed zip shards of about ``shard_gb``, shrunk to a
   ``short_side`` of 320 px by default (the model sees 256 px crops; smaller files upload and
   decode faster) with the EXIF orientation applied; stop before the disk gets full;
5. write ``dataset.csv`` (with the new sizes), ``classes.json``, ``catalog.json``,
   ``attributions.csv`` and a dataset card.

Paths inside the zips are the ``path`` column (``images/<folder>/<photo id>.jpg``), so the
notebook can find each file whatever folder Kaggle extracts the shards into.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import shutil
import zipfile
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable, Iterator, Sequence
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

from .clean import DATASET_FIELDS

Log = Callable[[str], None]
EXCLUDED_SOURCE = "altro/excluded"
CATALOG_FIELDS = ("id", "number", "albumId", "scientificName", "commonNameIt", "rarity", "lookalikes")


class OutOfSpace(RuntimeError):
    pass


def _rank(seed: str, key: str) -> str:
    return hashlib.sha256(f"{seed}:{key}".encode()).hexdigest()


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def select_rows(
    rows: Sequence[dict[str, str]],
    catalog_ids: Sequence[str],
    *,
    altro: str = "altro",
    excluded_per_class: int = 100,
    seed: str = "floradeck-v1",
    max_classes: int | None = None,
    sample: int | None = None,
) -> tuple[list[dict[str, str]], list[str], dict[str, int]]:
    """Rows of the packed dataset, the class order and how many images each former species gave to altro."""
    classes = list(catalog_ids[:max_classes] if max_classes else catalog_ids) + [altro]
    in_catalog = set(catalog_ids)
    kept: list[dict[str, str]] = []
    excluded: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        label = row["label"]
        if label in in_catalog or label == altro:
            kept.append(dict(row))
        else:
            excluded[label].append(row)
    given: dict[str, int] = {}
    for label in sorted(excluded):
        chosen = sorted(excluded[label], key=lambda r: _rank(seed, r["path"]))[:excluded_per_class]
        given[label] = len(chosen)
        for row in chosen:
            kept.append({**row, "label": altro, "source": EXCLUDED_SOURCE, "group": label})
    wanted = set(classes)
    kept = [row for row in kept if row["label"] in wanted]
    if sample:
        by_cell: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
        for row in kept:
            by_cell[(row["label"], row["split"])].append(row)
        kept = []
        for cell_rows in by_cell.values():
            kept.extend(sorted(cell_rows, key=lambda r: _rank(seed, r["path"]))[:sample])
    order = {label: i for i, label in enumerate(classes)}
    kept.sort(key=lambda r: (order[r["label"]], r["path"]))
    return kept, classes, given


def shrink(job: tuple[str, int | None, int]) -> tuple[bytes, int, int]:
    """The bytes to pack and the image size: resized so the short side is at most ``short_side``,
    EXIF orientation applied. An upright JPEG that is small enough is kept byte for byte."""
    path, short_side, quality = job
    data = Path(path).read_bytes()
    with Image.open(io.BytesIO(data)) as image:
        upright = image.getexif().get(0x0112, 1) == 1
        w, h = image.size
        too_big = short_side is not None and min(w, h) > short_side
        if image.format == "JPEG" and upright and not too_big:
            return data, w, h
        image = ImageOps.exif_transpose(image).convert("RGB")
        w, h = image.size
        if short_side is not None and min(w, h) > short_side:
            scale = short_side / min(w, h)
            w, h = max(1, int(w * scale + 0.5)), max(1, int(h * scale + 0.5))
            image = image.resize((w, h), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, "JPEG", quality=quality, optimize=True)
        return output.getvalue(), w, h


def _shrink_all(jobs: Iterable[tuple[str, int | None, int]], workers: int) -> Iterator[tuple[bytes, int, int]]:
    if workers == 1:
        yield from map(shrink, jobs)
        return
    with ProcessPoolExecutor(max_workers=workers or None) as pool:
        yield from pool.map(shrink, jobs, chunksize=64)


def write_shards(
    data_dir: Path,
    rows: Sequence[dict[str, str]],
    out_dir: Path,
    *,
    shard_bytes: int,
    short_side: int | None,
    quality: int,
    workers: int,
    min_free_bytes: int,
    disk_free: Callable[[Path], int],
    log: Log,
) -> int:
    """Zip the images in row order; a new shard starts when the current one would pass ``shard_bytes``.
    Updates ``width``/``height`` of the rows; returns the number of shards. Before each shard the disk
    must have room for it plus ``min_free_bytes``, else ``OutOfSpace`` (unfinished shards are removed)."""
    jobs = [(str(data_dir / row["path"]), short_side, quality) for row in rows]
    state = {"shard": 0, "size": 0, "count": 0, "archive": None, "tmp": None}

    def close() -> None:
        if state["archive"] is not None:
            state["archive"].close()
            target = state["tmp"].with_name(state["tmp"].name.removesuffix(".part"))
            state["tmp"].replace(target)
            state["archive"] = None
            log(f"  {target.name}: {state['count']:,} images, {target.stat().st_size / 1e9:.2f} GB")

    try:
        for row, (body, w, h) in zip(rows, _shrink_all(jobs, workers), strict=True):
            if state["archive"] is None or state["size"] + len(body) > shard_bytes:
                close()
                if disk_free(out_dir) < shard_bytes + min_free_bytes:
                    raise OutOfSpace(f"less than {(shard_bytes + min_free_bytes) / 1e9:.1f} GB free on the disk")
                state["shard"] += 1
                state["size"], state["count"] = 0, 0
                state["tmp"] = out_dir / f"images-{state['shard']:02d}.zip.part"
                state["archive"] = zipfile.ZipFile(state["tmp"], "w", compression=zipfile.ZIP_STORED, allowZip64=True)
            state["archive"].writestr(row["path"], body)
            state["size"] += len(body)
            state["count"] += 1
            row["width"], row["height"] = str(w), str(h)
        close()
    except BaseException:
        if state["archive"] is not None:
            state["archive"].close()
        for part in out_dir.glob("images-*.zip.part"):
            part.unlink()
        raise
    return state["shard"]


def catalog_hash(classes: Sequence[str]) -> str:
    return hashlib.sha256("\n".join(classes).encode()).hexdigest()[:16]


def dataset_card(
    classes: Sequence[str], rows: Sequence[dict[str, str]], given: dict[str, int], shards: int, short_side: int | None
) -> str:
    splits = Counter(row["split"] for row in rows)
    sources = Counter(row["source"] for row in rows)
    size_note = f" (JPEG, upright, short side at most {short_side} px)" if short_side else ""
    lines = [
        "# FloraDeck training images",
        "",
        "Training data for the FloraDeck plant recogniser (a personal, non-commercial project).",
        f"{len(rows):,} images, {len(classes)} classes ({len(classes) - 1} catalogue species + `altro`); "
        f"train {splits['train']:,}, val {splits['val']:,}, test {splits['test']:,}. {shards} image shards.",
        "",
        "## Files",
        "",
        "- `dataset.csv`: one row per image (`path`, `label`, `split`, `source`, observer, ...).",
        "- `classes.json`: class order used by the model (catalogue order, then `altro`).",
        "- `catalog.json`: catalogue species (id, names, album, lookalikes) for the reports.",
        "- `attributions.csv`: licence and author of every image.",
        f"- `images-NN.zip`: the images, at `images/<folder>/<photo id>.jpg`{size_note}.",
        "",
        "## Licences",
        "",
        "Photos from iNaturalist under CC0, CC BY or CC BY-NC (author and licence per image in",
        "`attributions.csv`); Open Images photos under CC BY 2.0. Some licences are non-commercial:",
        "**keep this dataset private** and do not redistribute it.",
        "",
        "## Sources of the altro class",
        "",
    ]
    lines += [f"- `{source}`: {count:,}" for source, count in sorted(sources.items()) if source != "catalog"]
    if given:
        lines += ["", f"`{EXCLUDED_SOURCE}`: species removed from the catalogue, up to {max(given.values())} images each."]
    return "\n".join(lines) + "\n"


def pack(
    data_dir: Path,
    species_json: Path,
    out_dir: Path,
    *,
    excluded_per_class: int = 100,
    shard_gb: float = 2.0,
    seed: str = "floradeck-v1",
    max_classes: int | None = None,
    sample: int | None = None,
    images: bool = True,
    short_side: int | None = 320,
    quality: int = 90,
    workers: int = 0,
    min_free_gb: float = 2.0,
    disk_free: Callable[[Path], int] | None = None,
    log: Log = print,
) -> dict:
    species = json.loads(species_json.read_text(encoding="utf-8"))
    catalog_ids = [s["id"] for s in species]
    rows, classes, given = select_rows(
        read_rows(data_dir / "dataset.csv"),
        catalog_ids,
        excluded_per_class=excluded_per_class,
        seed=seed,
        max_classes=max_classes,
        sample=sample,
    )
    counts = Counter(row["label"] for row in rows)
    empty = [label for label in classes if not counts[label]]
    if empty:
        log(f"WARNING: {len(empty)} classes have no image: {', '.join(empty)}")
    if given:
        log(f"{len(given)} species no longer in the catalogue give {sum(given.values()):,} images to altro")

    out_dir.mkdir(parents=True, exist_ok=True)
    for old in [*out_dir.glob("images-*.zip"), *out_dir.glob("images-*.zip.part")]:
        old.unlink()
    shards = 0
    if images:
        shards = write_shards(
            data_dir,
            rows,
            out_dir,
            shard_bytes=int(shard_gb * 1e9),
            short_side=short_side,
            quality=quality,
            workers=workers,
            min_free_bytes=int(min_free_gb * 1e9),
            disk_free=disk_free or (lambda path: shutil.disk_usage(path).free),
            log=log,
        )
    with (out_dir / "dataset.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=DATASET_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (out_dir / "classes.json").write_text(
        json.dumps({"classes": classes, "altro": classes[-1], "catalogHash": catalog_hash(classes)}, ensure_ascii=False, indent=1)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    wanted = set(classes)
    catalog = [{key: s.get(key) for key in CATALOG_FIELDS} for s in species if s["id"] in wanted]
    (out_dir / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    paths = {row["path"] for row in rows}
    with (data_dir / "attributions.csv").open(encoding="utf-8", newline="") as src, \
            (out_dir / "attributions.csv").open("w", encoding="utf-8", newline="") as dst:
        reader = csv.DictReader(src)
        writer = csv.DictWriter(dst, fieldnames=reader.fieldnames or [])
        writer.writeheader()
        writer.writerows(r for r in reader if r["path"] in paths)
    card = dataset_card(classes, rows, given, shards, short_side if images else None)
    (out_dir / "README.md").write_text(card, encoding="utf-8", newline="\n")
    return {"rows": len(rows), "classes": len(classes), "excluded": given, "shards": shards, "empty": empty}
