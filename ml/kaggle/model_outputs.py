"""Run a trained FloraDeck model on the val and test images of the Kaggle pack, on the CPU.

    ml\\.venv\\Scripts\\python ml/kaggle/model_outputs.py <model folder> <pack folder> <out.npz>

<model folder> is the extracted floradeck-model.zip (model.onnx, labels.json); <pack folder> is
ml/data/kaggle (dataset.csv and the images-NN.zip shards, read without extracting them).
The preprocessing is the notebook's: EXIF orientation, short side resized (PIL bilinear), centre
crop, the test-time views of labels.json; logits averaged over the views, embeddings averaged and
L2-normalised. The .npz holds logits, embeddings, labels and split for ml/kaggle/recalibrate.py.
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys
import time
import zipfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps


def eval_view(image: Image.Image, resize_short: int, crop: int, flip: bool) -> Image.Image:
    w, h = image.size
    scale = resize_short / min(w, h)
    nw, nh = max(crop, int(w * scale + 0.5)), max(crop, int(h * scale + 0.5))
    image = image.resize((nw, nh), Image.BILINEAR)
    left, top = (nw - crop) // 2, (nh - crop) // 2
    image = image.crop((left, top, left + crop, top + crop))
    return image.transpose(Image.FLIP_LEFT_RIGHT) if flip else image


def main(model_dir: Path, pack_dir: Path, out: Path, batch: int = 16) -> None:
    labels = json.loads((model_dir / "labels.json").read_text(encoding="utf-8"))
    classes = labels["classes"]
    index = {c: i for i, c in enumerate(classes)}
    mean = np.asarray(labels["input"]["mean"], np.float32)
    std = np.asarray(labels["input"]["std"], np.float32)
    views = labels["tta"]
    with (pack_dir / "dataset.csv").open(encoding="utf-8", newline="") as handle:
        rows = [r for r in csv.DictReader(handle) if r["split"] in ("val", "test")]
    shard_of: dict[str, zipfile.ZipFile] = {}
    for shard in sorted(pack_dir.glob("images-*.zip")):
        archive = zipfile.ZipFile(shard)
        for name in archive.namelist():
            shard_of[name] = archive
    options = ort.SessionOptions()
    options.intra_op_num_threads = os.cpu_count() or 2
    session = ort.InferenceSession(str(model_dir / labels["model"]["file"]), options, providers=["CPUExecutionProvider"])

    n, v = len(rows), len(views)
    all_logits = np.zeros((n, len(classes)), np.float32)
    all_emb = np.zeros((n, 1280), np.float32)
    start = time.time()
    for first in range(0, n, batch):
        chunk = rows[first:first + batch]
        tensors = []
        for row in chunk:
            with Image.open(io.BytesIO(shard_of[row["path"]].read(row["path"]))) as raw:
                image = ImageOps.exif_transpose(raw).convert("RGB")
            for view in views:
                crop = eval_view(image, view["resizeShortSide"], view["crop"], view["flip"])
                tensors.append(((np.asarray(crop, np.float32) / 255.0 - mean) / std).transpose(2, 0, 1))
        logits, emb = session.run(None, {"image": np.stack(tensors)})
        b = len(chunk)
        if emb.shape[1] != all_emb.shape[1]:
            all_emb = np.zeros((n, emb.shape[1]), np.float32)
        all_logits[first:first + b] = logits.reshape(b, v, -1).mean(1)
        e = emb.reshape(b, v, -1).mean(1)
        all_emb[first:first + b] = e / np.linalg.norm(e, axis=1, keepdims=True)
        done = first + b
        if done % (batch * 50) == 0 or done == n:
            rate = done / (time.time() - start)
            print(f"{done:,}/{n:,} images, {rate:.1f}/s, about {(n - done) / rate / 60:.0f} min left", flush=True)
    np.savez(
        out,
        logits=all_logits,
        embeddings=all_emb,
        labels=np.array([index[r["label"]] for r in rows], np.int64),
        split=np.array([r["split"] for r in rows]),
        source=np.array([r["source"] for r in rows]),
        path=np.array([r["path"] for r in rows]),
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
