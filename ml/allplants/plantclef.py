"""Prototype: the PlantCLEF 2024 ViT-B/14 DINOv2 model (7,806 species of south-western Europe,
CC BY 4.0, Zenodo 10848263) as an offline "which plant is this" model for plants outside the catalogue.

    python ml/allplants/plantclef.py slim    <model_best.pth.tar> <out.pt>
    python ml/allplants/plantclef.py testset <ml/data> <species.csv> <out.csv> [--per-species 4] [--names names.csv]
    python ml/allplants/plantclef.py eval    <slim.pt> <testset.csv> <ml/data> <out.npz> --sizes 224 336 392 518
    python ml/allplants/plantclef.py export  <slim.pt> <out dir> --size 336
    python ml/allplants/plantclef.py eval-onnx <model.onnx> <testset.csv> <ml/data> <out.npz> --size 336
    python ml/allplants/plantclef.py split   <model.onnx> <out dir> [--mb 50]

Run with ml/.venv (torch, timm, onnx, onnxruntime). Artifacts go to ml/artifacts/ (git-ignored).
Preprocessing (timm eval for this model): EXIF orientation, resize the short side to the input size
(bicubic), centre crop, ImageNet mean/std.
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ARCH = "vit_base_patch14_reg4_dinov2"
NUM_CLASSES = 7806
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def binomial(name: str) -> str:
    """'Taxus baccata L.' -> 'Taxus baccata'; hybrids and subspecies keep their first two words."""
    parts = name.replace("×", "x").split()
    if len(parts) >= 3 and parts[1] == "x":
        return " ".join(parts[:3])
    return " ".join(parts[:2])


def preprocess(image: Image.Image, size: int) -> np.ndarray:
    w, h = image.size
    scale = size / min(w, h)
    nw, nh = max(size, round(w * scale)), max(size, round(h * scale))
    image = image.resize((nw, nh), Image.BICUBIC)
    left, top = (nw - size) // 2, (nh - size) // 2
    array = np.asarray(image.crop((left, top, left + size, top + size)), np.float32) / 255.0
    return ((array - MEAN) / STD).transpose(2, 0, 1)


def load_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def make_model(state: dict, size: int):
    import timm
    from timm.models.vision_transformer import checkpoint_filter_fn

    model = timm.create_model(ARCH, pretrained=False, num_classes=NUM_CLASSES, img_size=size)
    model.load_state_dict(checkpoint_filter_fn(state, model))
    return model.eval()


def cmd_slim(args) -> None:
    import torch

    # Downloaded file: load with the safe unpickler only (tensors and plain containers, never code).
    # timm checkpoints also store the training arguments as an argparse.Namespace: allow just that class.
    import argparse as _argparse

    torch.serialization.add_safe_globals([_argparse.Namespace])
    ckpt = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    print("checkpoint keys:", list(ckpt) if isinstance(ckpt, dict) else type(ckpt))
    state = ckpt.get("state_dict_ema") or ckpt.get("state_dict") or ckpt
    state = {k.removeprefix("module."): v for k, v in state.items()}
    torch.save(state, args.out)
    print(f"{len(state)} tensors, {sum(v.numel() for v in state.values()) / 1e6:.1f} M parameters -> {args.out}")


def cmd_testset(args) -> None:
    """Out-of-catalogue photos of the Kaggle pack (val + test) whose iNaturalist species is a PlantCLEF class."""
    data = Path(args.data)
    with open(args.species, encoding="utf-8", newline="") as handle:
        classes = {binomial(r["species"]): r["species_id"] for r in csv.DictReader(handle)}
    taxon = {}
    with (data / "manifest" / "selection.jsonl").open(encoding="utf-8") as handle:
        for line in handle:
            obs = json.loads(line)
            for photo in obs["photos"]:
                taxon[photo["id"]] = obs["taxon_name"]
    with (data / "kaggle" / "dataset.csv").open(encoding="utf-8", newline="") as handle:
        rows = [r for r in csv.DictReader(handle) if r["label"] == "altro" and r["split"] in ("val", "test")
                and r["source"] in ("altro/excluded", "altro/common", "altro/lookalike", "altro/leaves")]
    # names.csv (names.py) gives the current iNaturalist name of each class, also when PlantCLEF uses a synonym
    inat_to_class = {}
    if args.names:
        with open(args.names, encoding="utf-8", newline="") as handle:
            for r in csv.DictReader(handle):
                if r["inat_name"] and r["inat_name"] not in classes:
                    inat_to_class[r["inat_name"]] = r["scientific"]
    print(f"{len(inat_to_class)} classes whose iNaturalist name differs (synonyms)")
    kept, missing, per = [], defaultdict(int), defaultdict(int)
    for row in sorted(rows, key=lambda r: r["path"]):
        name = taxon.get(row["photo_id"], "")
        if len(name.split()) < 2:  # genus-level observation
            continue
        key = binomial(name)
        key = inat_to_class.get(key, key)
        if key not in classes:
            missing[(row["source"], key)] += 1
            continue
        if per[key] >= args.per_species:
            continue
        per[key] += 1
        kept.append({"path": row["path"], "source": row["source"], "species": key, "species_id": classes[key]})
    with open(args.out, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(kept[0]))
        writer.writeheader()
        writer.writerows(kept)
    by_source = defaultdict(int)
    for row in kept:
        by_source[row["source"]] += 1
    print(f"{len(kept)} photos of {len(per)} species -> {args.out}; by source {dict(by_source)}")
    names_missing = sorted({k for _, k in missing})
    print(f"{len(names_missing)} species not among the PlantCLEF classes (iNaturalist name), e.g. {names_missing[:15]}")


def read_testset(path: str) -> list[dict]:
    with open(path, encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def class_ids(mapping: Path) -> list[str]:
    return [line.strip() for line in mapping.read_text(encoding="utf-8").splitlines() if line.strip()]


def summarise(top: np.ndarray, rows: list[dict], ids: list[str], genus_of: dict[str, str]) -> dict:
    truth = [r["species_id"] for r in rows]
    pred = [[ids[i] for i in t] for t in top]
    out = {}
    for name, mask in [("all", [True] * len(rows))] + [
            (s, [r["source"] == s for r in rows]) for s in sorted({r["source"] for r in rows})]:
        sel = [i for i, m in enumerate(mask) if m]
        if not sel:
            continue
        out[name] = {
            "n": len(sel),
            "top1": float(np.mean([pred[i][0] == truth[i] for i in sel])),
            "top3": float(np.mean([truth[i] in pred[i][:3] for i in sel])),
            "top5": float(np.mean([truth[i] in pred[i][:5] for i in sel])),
            "genus_top1": float(np.mean([genus_of.get(pred[i][0]) == genus_of.get(truth[i]) for i in sel])),
        }
    return out


def genus_map(species_csv: Path) -> dict[str, str]:
    with species_csv.open(encoding="utf-8", newline="") as handle:
        return {r["species_id"]: r["genus"] for r in csv.DictReader(handle)}


def cmd_eval(args) -> None:
    import torch

    torch.set_num_threads(args.threads)
    state = torch.load(args.slim, map_location="cpu")
    rows = read_testset(args.testset)
    data = Path(args.data)
    models = {s: make_model(state, s) for s in args.sizes}
    tops = {s: np.zeros((len(rows), 10), np.int32) for s in args.sizes}
    probs = {s: np.zeros((len(rows), 10), np.float32) for s in args.sizes}
    seconds = defaultdict(float)
    with torch.no_grad():
        for i, row in enumerate(rows):
            image = load_rgb(data / row["path"])
            for s, model in models.items():
                x = torch.from_numpy(preprocess(image, s))[None]
                t0 = time.perf_counter()
                p = torch.softmax(model(x), 1)[0]
                seconds[s] += time.perf_counter() - t0
                v, k = p.topk(10)
                tops[s][i], probs[s][i] = k.numpy(), v.numpy()
            if (i + 1) % 50 == 0:
                print(f"{i + 1}/{len(rows)}", {s: round(seconds[s] / (i + 1), 3) for s in args.sizes}, flush=True)
    np.savez(args.out, **{f"top_{s}": tops[s] for s in args.sizes}, **{f"prob_{s}": probs[s] for s in args.sizes},
             seconds=np.array([seconds[s] / len(rows) for s in args.sizes]), sizes=np.array(args.sizes))
    report(args.out, rows, Path(args.mapping), Path(args.species))


def report(npz: str, rows: list[dict], mapping: Path, species: Path) -> None:
    d = np.load(npz)
    ids, genus = class_ids(mapping), genus_map(species)
    for s in d["sizes"]:
        print(f"--- {int(s)} px", json.dumps(summarise(d[f"top_{int(s)}"], rows, ids, genus), indent=None))


def cmd_export(args) -> None:
    import onnx
    import torch
    from onnxruntime.quantization import QuantType, quantize_dynamic

    state = torch.load(args.slim, map_location="cpu")
    model = make_model(state, args.size)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    fp32 = out / f"plantclef-{args.size}-fp32.onnx"
    probe = torch.randn(1, 3, args.size, args.size)
    torch.onnx.export(model, (probe,), str(fp32), opset_version=17, dynamo=False, input_names=["image"],
                      output_names=["logits"], dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}})
    print(f"{fp32.name}: {fp32.stat().st_size / 1e6:.1f} MB")
    int8 = out / f"plantclef-{args.size}-int8.onnx"
    quantize_dynamic(str(fp32), str(int8), weight_type=QuantType.QInt8, per_channel=True)
    print(f"{int8.name}: {int8.stat().st_size / 1e6:.1f} MB")
    from onnxruntime.transformers.float16 import convert_float_to_float16

    fp16 = out / f"plantclef-{args.size}-fp16.onnx"
    onnx.save(convert_float_to_float16(onnx.load(str(fp32)), keep_io_types=True), str(fp16))
    print(f"{fp16.name}: {fp16.stat().st_size / 1e6:.1f} MB")
    import onnxruntime as ort

    x = probe.numpy()
    ref = model(probe).detach().numpy()
    for path in (fp32, int8, fp16):
        got = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"]).run(None, {"image": x})[0]
        print(f"{path.name}: max |logit diff| vs torch {np.abs(got - ref).max():.4f}, same top-1 {got.argmax() == ref.argmax()}")


def cmd_eval_onnx(args) -> None:
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    session = ort.InferenceSession(args.model, options, providers=["CPUExecutionProvider"])
    rows = read_testset(args.testset)
    data = Path(args.data)
    top = np.zeros((len(rows), 10), np.int32)
    seconds = 0.0
    for i, row in enumerate(rows):
        x = preprocess(load_rgb(data / row["path"]), args.size)[None]
        t0 = time.perf_counter()
        logits = session.run(None, {"image": x})[0][0]
        seconds += time.perf_counter() - t0
        top[i] = np.argsort(-logits)[:10]
        if (i + 1) % 100 == 0:
            print(f"{i + 1}/{len(rows)} {seconds / (i + 1):.3f} s", flush=True)
    np.savez(args.out, **{f"top_{args.size}": top}, seconds=np.array([seconds / len(rows)]), sizes=np.array([args.size]))
    report(args.out, rows, Path(args.mapping), Path(args.species))


def split_file(path: Path, out_dir: Path, part_bytes: int = 50_000_000) -> dict:
    """Cut a model into parts of at most ``part_bytes`` (GitHub Pages serves files under 100 MB) and write
    ``<name>.parts.json``: the app downloads the parts in order, checks the SHA-256 and joins them."""
    import hashlib

    out_dir.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    parts = []
    for i, start in enumerate(range(0, len(data), part_bytes)):
        chunk = data[start:start + part_bytes]
        name = f"{path.stem}.part{i:02d}"
        (out_dir / name).write_bytes(chunk)
        parts.append({"file": name, "bytes": len(chunk), "sha256": hashlib.sha256(chunk).hexdigest()})
    manifest = {"model": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "parts": parts}
    (out_dir / f"{path.stem}.parts.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    return manifest


def cmd_split(args) -> None:
    manifest = split_file(Path(args.model), Path(args.out), int(args.mb * 1e6))
    print(f"{manifest['model']}: {len(manifest['parts'])} parts", [p["bytes"] for p in manifest["parts"]])


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("slim")
    p.add_argument("checkpoint")
    p.add_argument("out")
    p = sub.add_parser("testset")
    p.add_argument("data")
    p.add_argument("species")
    p.add_argument("out")
    p.add_argument("--per-species", type=int, default=4)
    p.add_argument("--names", help="names.csv from names.py (iNaturalist names of the classes)")
    for name in ("eval", "eval-onnx"):
        p = sub.add_parser(name)
        p.add_argument("model" if name == "eval-onnx" else "slim")
        p.add_argument("testset")
        p.add_argument("data")
        p.add_argument("out")
        p.add_argument("--mapping", required=True)
        p.add_argument("--species", required=True)
        p.add_argument("--threads", type=int, default=4)
        if name == "eval":
            p.add_argument("--sizes", type=int, nargs="+", default=[224, 336, 392, 518])
        else:
            p.add_argument("--size", type=int, default=336)
    p = sub.add_parser("split")
    p.add_argument("model")
    p.add_argument("out")
    p.add_argument("--mb", type=float, default=50)
    p = sub.add_parser("export")
    p.add_argument("slim")
    p.add_argument("out")
    p.add_argument("--size", type=int, default=336)
    args = parser.parse_args()
    {"slim": cmd_slim, "testset": cmd_testset, "eval": cmd_eval, "export": cmd_export,
     "eval-onnx": cmd_eval_onnx, "split": cmd_split}[args.cmd](args)


if __name__ == "__main__":
    main()
