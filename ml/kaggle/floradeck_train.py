# %% [markdown]
# # FloraDeck · addestramento del riconoscitore
#
# Questo notebook insegna a un piccolo modello a riconoscere le specie del catalogo FloraDeck dalle foto,
# più la classe **altro** (tutto ciò che non è una carta: piante fuori catalogo, sole foglie, animali, scene).
#
# **Cosa fa, in ordine**
# 1. trova il dataset FloraDeck allegato al notebook (gli zip di immagini vengono estratti se serve);
# 2. addestra uno dopo l'altro i modelli in `BACKBONES` (fine-tuning di reti già allenate su ImageNet);
# 3. sceglie il migliore sulla validazione, lo esporta in ONNX e prova la versione compressa int8;
# 4. calibra la confidenza (temperature scaling) e le soglie *carta / non sono sicuro / non è nel catalogo*;
# 5. misura tutto sul test set e scrive `floradeck-model.zip` nella cartella Output.
#
# **Impostazioni di Kaggle (pannello a destra):** Accelerator **GPU T4 x2** (la P100 non è più supportata
# dalle versioni recenti di PyTorch), Internet **On** (serve per scaricare i pesi pre-allenati).
# Prima prova con `SMOKE = True` (pochi minuti), poi `SMOKE = False` e **Save Version → Save & Run All**:
# l'addestramento completo dura alcune ore e continua anche a browser chiuso.
#
# **Se la sessione si interrompe:** crea una nuova versione aggiungendo come input l'Output della versione
# precedente (Add Input → Your Work → questo notebook): il notebook riprende dagli ultimi checkpoint.

# %%
# ---- Settings (edit here) ----
import os

SMOKE = os.environ.get("FLORADECK_SMOKE", "0") == "1"  # True: tiny run that checks the whole notebook
BACKBONES = os.environ.get(
    "FLORADECK_BACKBONES",
    "efficientnet_b0.ra_in1k,mobilenetv4_conv_medium.e500_r256_in1k,convnext_nano.in12k_ft_in1k",
).split(",")  # cheapest first: on a tie (within PREFER_SMALLER_WITHIN) the earlier one wins
LEARNING_RATES = {"efficientnet_b0": 1e-3, "mobilenetv4": 5e-4, "convnext": 4e-4}
EPOCHS = int(os.environ.get("FLORADECK_EPOCHS", "20"))
BATCH_SIZE = 128
IMG_SIZE = 256  # model input; the app crops the same square
RESIZE_SHORT = 292  # eval: short side resized to this, then centre crop IMG_SIZE (256 / 0.875)
ZOOM_SHORT = 320  # third test-time view: a tighter centre crop (the packed images have a 320 px short side)
WEIGHT_DECAY = 0.05
LABEL_SMOOTHING = 0.1
TARGET_PRECISION = 0.95  # accepted cards must be right at least this often (validation)
GREY_ALTRO_SHARE = 0.10  # at most this share of non-catalogue photos may reach "Non sono sicuro"
PREFER_SMALLER_WITHIN = 0.01  # val top-1 tolerance for preferring the earlier (cheaper) backbone
INT8_MAX_DROP = 0.01  # keep int8 if its top-1 is at most this much below fp32
MAX_MODEL_MB = 30
PROTOTYPES_PER_CLASS = 40
TIME_LIMIT_H = float(os.environ.get("FLORADECK_TIME_LIMIT_H", "11.0"))  # Kaggle stops sessions at 12 h
EXPORT_RESERVE_H = 1.25  # time kept for export, calibration and reports
SEED = 42

# %%
# ---- Setup ----
import subprocess
import sys
import time

START = time.time()
ON_KAGGLE = os.path.exists("/kaggle/input")
if ON_KAGGLE:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", "-U", "timm>=1.0.9", "onnx>=1.16", "onnxruntime>=1.19"],
        check=True,
    )

import csv
import hashlib
import json
import math
import random
import shutil
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import onnxruntime as ort
import timm
import timm.data
import timm.optim
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import v2 as T

INPUT_ROOT = Path(os.environ.get("FLORADECK_INPUT", "/kaggle/input"))
WORK = Path(os.environ.get("FLORADECK_WORK", "/kaggle/working"))
EXTRACT_DIR = Path(os.environ.get("FLORADECK_EXTRACT", "/tmp/floradeck-images"))
OUT = WORK / "floradeck-model"
RUNS = WORK / "runs"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
WORKERS = int(os.environ.get("FLORADECK_WORKERS", str(min(8, os.cpu_count() or 2))))
if SMOKE:
    EPOCHS = min(EPOCHS, 1)
    BATCH_SIZE = 16
    PROTOTYPES_PER_CLASS = 4

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.backends.cudnn.benchmark = True
for folder in (OUT, RUNS):
    folder.mkdir(parents=True, exist_ok=True)
print(f"torch {torch.__version__}, timm {timm.__version__}, onnxruntime {ort.__version__}, device {DEVICE}, "
      f"{WORKERS} loader workers, smoke={SMOKE}")
if DEVICE.type == "cuda":
    print(torch.cuda.get_device_name(0))


def elapsed_h() -> float:
    return (time.time() - START) / 3600


def short_name(backbone: str) -> str:
    return backbone.split(".")[0]


# %%
# ---- Find the dataset (and earlier checkpoints) ----
def index_input(root: Path) -> tuple[dict[str, Path], dict[str, list[Path]], list[Path]]:
    """Image files by '<folder>/<file>', metadata files by name, zip shards."""
    images: dict[str, Path] = {}
    files: dict[str, list[Path]] = defaultdict(list)
    zips: list[Path] = []
    for dirpath, _, names in os.walk(root):
        for name in names:
            path = Path(dirpath) / name
            if name.endswith(".jpg"):
                images[f"{path.parent.name}/{name}"] = path
            elif name.endswith(".zip") and name.startswith("images-"):
                zips.append(path)
            else:
                files[name].append(path)
    return images, files, sorted(zips)


images_index, input_files, zip_shards = index_input(INPUT_ROOT)
data_dirs = [p.parent for p in input_files.get("dataset.csv", []) if (p.parent / "classes.json").exists()]
if not data_dirs:
    raise SystemExit("No FloraDeck dataset found: add it with 'Add Input' (it must contain dataset.csv and classes.json).")
DATA = data_dirs[0]
print(f"Dataset: {DATA}; {len(images_index):,} images found, {len(zip_shards)} zip shards")

with (DATA / "dataset.csv").open(encoding="utf-8", newline="") as handle:
    ROWS = list(csv.DictReader(handle))
CLASSES_META = json.loads((DATA / "classes.json").read_text(encoding="utf-8"))
CATALOG = {s["id"]: s for s in json.loads((DATA / "catalog.json").read_text(encoding="utf-8"))} if (DATA / "catalog.json").exists() else {}
ATTRIBUTIONS = {}
if (DATA / "attributions.csv").exists():
    with (DATA / "attributions.csv").open(encoding="utf-8", newline="") as handle:
        ATTRIBUTIONS = {r["path"]: r for r in csv.DictReader(handle)}

CLASSES = list(CLASSES_META["classes"])
ALTRO = CLASSES_META.get("altro", "altro")
if SMOKE:  # a few classes, a few images per class and split
    CLASSES = CLASSES[:6] + [ALTRO]
    keep = set(CLASSES)
    per_cell: Counter = Counter()
    rows = []
    for row in sorted(ROWS, key=lambda r: hashlib.sha256(r["path"].encode()).hexdigest()):
        cell = (row["label"], row["split"])
        cap = 24 if row["split"] == "train" else 8
        if row["label"] in keep and per_cell[cell] < cap:
            per_cell[cell] += 1
            rows.append(row)
    ROWS = rows
CLASS_INDEX = {c: i for i, c in enumerate(CLASSES)}
ALTRO_INDEX = CLASS_INDEX[ALTRO]
NUM_CLASSES = len(CLASSES)


def image_key(path: str) -> str:
    return "/".join(path.split("/")[-2:])


missing = [r for r in ROWS if image_key(r["path"]) not in images_index]
if missing and zip_shards:
    print(f"Extracting {len(zip_shards)} zip shards to {EXTRACT_DIR} ...")
    wanted = {r["path"] for r in missing}
    for shard in zip_shards:
        with zipfile.ZipFile(shard) as archive:
            for name in archive.namelist():
                if name in wanted:
                    archive.extract(name, EXTRACT_DIR)
    extra, _, _ = index_input(EXTRACT_DIR)
    images_index.update(extra)
    missing = [r for r in ROWS if image_key(r["path"]) not in images_index]
if missing:
    raise SystemExit(f"{len(missing):,} images listed in dataset.csv were not found, e.g. {missing[0]['path']}")

for row in ROWS:
    row["file"] = str(images_index[image_key(row["path"])])
    row["y"] = CLASS_INDEX[row["label"]]
SPLITS = {name: [r for r in ROWS if r["split"] == name] for name in ("train", "val", "test")}
print({name: len(rows) for name, rows in SPLITS.items()}, f"{NUM_CLASSES} classes (altro = {ALTRO_INDEX})")

# Checkpoints from an earlier version of this notebook (added as input) are copied back, to resume.
for name in ("last.pt", "best.pt", "done.json", "history.json"):
    for path in input_files.get(name, []):
        if path.parent.parent.name == "runs":
            target = RUNS / path.parent.name / name
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
                print(f"Resuming from {path}")


# %%
# ---- Images and preprocessing ----
def load_rgb(path: str) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def eval_view(image: Image.Image, resize_short: int, crop: int, flip: bool) -> Image.Image:
    """Exactly what the app does: resize the short side (bilinear, antialiased), centre crop, optional mirror."""
    w, h = image.size
    scale = resize_short / min(w, h)
    nw, nh = max(crop, int(w * scale + 0.5)), max(crop, int(h * scale + 0.5))
    image = image.resize((nw, nh), Image.BILINEAR)
    left, top = (nw - crop) // 2, (nh - crop) // 2
    image = image.crop((left, top, left + crop, top + crop))
    return image.transpose(Image.FLIP_LEFT_RIGHT) if flip else image


TTA_VIEWS = [
    {"name": "center", "resizeShortSide": RESIZE_SHORT, "crop": IMG_SIZE, "flip": False},
    {"name": "flip", "resizeShortSide": RESIZE_SHORT, "crop": IMG_SIZE, "flip": True},
    {"name": "zoom", "resizeShortSide": ZOOM_SHORT, "crop": IMG_SIZE, "flip": False},
]


class TrainImages(Dataset):
    """Random crops and geometric/quality augmentations on the CPU; colour jitter runs on the GPU.
    No hue changes: colour is what tells many species apart."""

    def __init__(self, rows):
        self.rows = rows
        steps = [
            T.RandomResizedCrop(IMG_SIZE, scale=(0.30, 1.0), antialias=True),
            T.RandomHorizontalFlip(),
            T.RandomApply([T.RandomRotation(20)], p=0.3),
            T.RandomApply([T.GaussianBlur(5, sigma=(0.1, 2.0))], p=0.15),
            T.PILToTensor(),
        ]
        if hasattr(T, "JPEG"):
            steps.append(T.RandomApply([T.JPEG((40, 95))], p=0.3))
        self.transform = T.Compose(steps)

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        row = self.rows[i]
        return self.transform(load_rgb(row["file"])), row["y"]


class EvalImages(Dataset):
    """Normalised float32 views (V, 3, S, S), computed with numpy like the app will."""

    def __init__(self, rows, views, mean, std):
        self.rows, self.views = rows, views
        self.mean = np.asarray(mean, dtype=np.float32)
        self.std = np.asarray(std, dtype=np.float32)

    def __len__(self):
        return len(self.rows)

    def tensor(self, image, view):
        crop = eval_view(image, view["resizeShortSide"], view["crop"], view["flip"])
        array = (np.asarray(crop, dtype=np.float32) / 255.0 - self.mean) / self.std
        return array.transpose(2, 0, 1).copy()

    def __getitem__(self, i):
        image = load_rgb(self.rows[i]["file"])
        return np.stack([self.tensor(image, v) for v in self.views]), self.rows[i]["y"]


def gpu_color_jitter(x, brightness=0.3, contrast=0.3, saturation=0.15):
    n = x.shape[0]

    def factor(r):
        return 1 + (torch.rand(n, 1, 1, 1, device=x.device) * 2 - 1) * r

    def gray(t):
        return (0.299 * t[:, 0] + 0.587 * t[:, 1] + 0.114 * t[:, 2]).unsqueeze(1)

    x = x * factor(brightness)
    mean = gray(x).mean((2, 3), keepdim=True)
    x = (x - mean) * factor(contrast) + mean
    g = gray(x)
    x = (x - g) * factor(saturation) + g
    return x.clamp(0, 1)


def loader(dataset, shuffle, batch_size=BATCH_SIZE, drop_last=False):
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        drop_last=drop_last,
        num_workers=WORKERS,
        pin_memory=DEVICE.type == "cuda",
        persistent_workers=WORKERS > 0,
        prefetch_factor=4 if WORKERS > 0 else None,
    )


# %%
# ---- Model ----
class ExportModel(nn.Module):
    """Outputs the logits and the L2-normalised penultimate embedding (for the prototype check)."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, image):
        features = self.model.forward_features(image)
        embedding = self.model.forward_head(features, pre_logits=True)
        logits = self.model.get_classifier()(embedding)
        return logits, F.normalize(embedding, dim=1)


def make_model(backbone: str, pretrained: bool = True):
    return timm.create_model(backbone, pretrained=pretrained, num_classes=NUM_CLASSES, drop_rate=0.2, drop_path_rate=0.1)


def norm_stats(model):
    config = timm.data.resolve_model_data_config(model)
    return list(config["mean"]), list(config["std"])


def learning_rate(backbone: str) -> float:
    return next((lr for key, lr in LEARNING_RATES.items() if backbone.startswith(key)), 5e-4)


@torch.no_grad()
def torch_outputs(model, rows, mean, std, views=TTA_VIEWS[:1]):
    """Logits averaged over the views and the mean embedding, with the PyTorch model."""
    model.eval()
    wrapped = ExportModel(model)
    all_logits, all_emb, labels = [], [], []
    for batch, y in loader(EvalImages(rows, views, mean, std), shuffle=False, batch_size=max(BATCH_SIZE // len(views), 8)):
        b, v = batch.shape[:2]
        x = batch.view(b * v, *batch.shape[2:]).to(DEVICE, non_blocking=True).to(memory_format=torch.channels_last)
        with torch.autocast(DEVICE.type, dtype=torch.float16, enabled=DEVICE.type == "cuda"):
            logits, emb = wrapped(x)
        all_logits.append(logits.float().view(b, v, -1).mean(1).cpu())
        all_emb.append(F.normalize(emb.float().view(b, v, -1).mean(1), dim=1).cpu())
        labels.append(y)
    return torch.cat(all_logits), torch.cat(all_emb), torch.cat(labels)


def topk_accuracy(logits, labels, k):
    return (logits.topk(k, dim=1).indices == labels[:, None]).any(1).float().mean().item()


# %%
# ---- Training (one backbone at a time, resumable) ----
class OutOfTime(Exception):
    pass


def train_backbone(backbone: str) -> dict:
    run = RUNS / short_name(backbone)
    run.mkdir(parents=True, exist_ok=True)
    if (run / "done.json").exists():
        print(f"{backbone}: already trained")
        return json.loads((run / "done.json").read_text(encoding="utf-8"))

    model = make_model(backbone).to(DEVICE).to(memory_format=torch.channels_last)
    mean, std = norm_stats(model)
    mean_t = torch.tensor(mean, device=DEVICE).view(1, 3, 1, 1)
    std_t = torch.tensor(std, device=DEVICE).view(1, 3, 1, 1)
    train_loader = loader(TrainImages(SPLITS["train"]), shuffle=True, drop_last=len(SPLITS["train"]) > BATCH_SIZE)
    steps = EPOCHS * len(train_loader)
    warmup = max(1, len(train_loader))
    lr = learning_rate(backbone)
    optimizer = timm.optim.create_optimizer_v2(model, "adamw", lr=lr, weight_decay=WEIGHT_DECAY)
    schedule = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lambda s: (s + 1) / warmup if s < warmup else 0.01 + 0.99 * 0.5 * (1 + math.cos(math.pi * (s - warmup) / max(1, steps - warmup))),
    )
    scaler = torch.amp.GradScaler(DEVICE.type, enabled=DEVICE.type == "cuda")
    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)
    history, start_epoch, best = [], 0, -1.0
    if (run / "last.pt").exists():
        state = torch.load(run / "last.pt", map_location=DEVICE, weights_only=False)
        model.load_state_dict(state["model"])
        optimizer.load_state_dict(state["optimizer"])
        schedule.load_state_dict(state["schedule"])
        scaler.load_state_dict(state["scaler"])
        history, start_epoch, best = state["history"], state["epoch"] + 1, state["best"]
        print(f"{backbone}: resuming at epoch {start_epoch + 1}")

    print(f"{backbone}: {sum(p.numel() for p in model.parameters()) / 1e6:.1f} M parameters, lr {lr}, "
          f"{EPOCHS} epochs of {len(train_loader)} steps")
    for epoch in range(start_epoch, EPOCHS):
        if history:
            per_epoch_h = sum(h["seconds"] for h in history[-2:]) / len(history[-2:]) / 3600
            if elapsed_h() + per_epoch_h * 1.1 > TIME_LIMIT_H - EXPORT_RESERVE_H:
                raise OutOfTime(f"{backbone}: no time left for epoch {epoch + 1}")
        t0 = time.time()
        model.train()
        total, seen = 0.0, 0
        for x, y in train_loader:
            x = x.to(DEVICE, non_blocking=True).float().div_(255)
            x = ((gpu_color_jitter(x) - mean_t) / std_t).contiguous(memory_format=torch.channels_last)
            y = y.to(DEVICE, non_blocking=True)
            with torch.autocast(DEVICE.type, dtype=torch.float16, enabled=DEVICE.type == "cuda"):
                loss = criterion(model(x), y)
            optimizer.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), 2.0)
            scaler.step(optimizer)
            scaler.update()
            schedule.step()
            total += loss.item() * len(y)
            seen += len(y)
        logits, _, labels = torch_outputs(model, SPLITS["val"], mean, std)
        val_top1, val_top3 = topk_accuracy(logits, labels, 1), topk_accuracy(logits, labels, 3)
        entry = {"epoch": epoch + 1, "loss": total / max(1, seen), "val_top1": val_top1, "val_top3": val_top3,
                 "lr": schedule.get_last_lr()[0], "seconds": time.time() - t0}
        history.append(entry)
        if val_top1 > best:
            best = val_top1
            torch.save(model.state_dict(), run / "best.pt")
        torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(), "schedule": schedule.state_dict(),
                    "scaler": scaler.state_dict(), "history": history, "epoch": epoch, "best": best}, run / "last.pt")
        (run / "history.json").write_text(json.dumps(history, indent=1), encoding="utf-8")
        print(f"  epoch {epoch + 1:>2}/{EPOCHS}  loss {entry['loss']:.3f}  val top-1 {val_top1:.3f}  top-3 {val_top3:.3f}  "
              f"{entry['seconds'] / 60:.1f} min  (elapsed {elapsed_h():.2f} h)")
    result = {"backbone": backbone, "val_top1": best, "epochs": len(history), "mean": mean, "std": std,
              "params_m": sum(p.numel() for p in model.parameters()) / 1e6}
    (run / "done.json").write_text(json.dumps(result, indent=1), encoding="utf-8")
    (run / "last.pt").unlink(missing_ok=True)  # the best weights are kept; free the output space
    return result


results, complete = [], True
for backbone in BACKBONES:
    try:
        results.append(train_backbone(backbone))
    except OutOfTime as stop:
        print(f"STOP: {stop}. Re-run with this output as input to continue.")
        complete = False
        break
    if DEVICE.type == "cuda":
        torch.cuda.empty_cache()

if not results:  # nothing finished: fall back to the best partial run, so the session still yields a model
    for backbone in BACKBONES:
        run = RUNS / short_name(backbone)
        if (run / "best.pt").exists():
            history = json.loads((run / "history.json").read_text(encoding="utf-8"))
            mean, std = norm_stats(make_model(backbone, pretrained=False))
            results.append({"backbone": backbone, "val_top1": max(h["val_top1"] for h in history), "epochs": len(history),
                            "mean": mean, "std": std, "partial": True})
if not results:
    raise SystemExit("No trained model available.")

# Pick the winner: best validation top-1; an earlier (cheaper) backbone wins within PREFER_SMALLER_WITHIN.
best_top1 = max(r["val_top1"] for r in results)
winner = next(r for r in results if r["val_top1"] >= best_top1 - PREFER_SMALLER_WITHIN)
print("Bake-off:", [(short_name(r["backbone"]), round(r["val_top1"], 4)) for r in results], "->", winner["backbone"])

# %%
# ---- Export to ONNX (fp32 and int8) ----
from onnxruntime.quantization import CalibrationDataReader, QuantFormat, QuantType, quantize_static
from onnxruntime.quantization.shape_inference import quant_pre_process

model = make_model(winner["backbone"], pretrained=False)
model.load_state_dict(torch.load(RUNS / short_name(winner["backbone"]) / "best.pt", map_location="cpu"))
model.eval()
MEAN, STD = winner["mean"], winner["std"]
export = ExportModel(model).eval()
with torch.no_grad():
    probe = torch.randn(2, 3, IMG_SIZE, IMG_SIZE)
    assert torch.allclose(export(probe)[0], model(probe), atol=1e-4), "embedding head does not reproduce the logits"

FP32 = WORK / "model-fp32.onnx"
INT8 = WORK / "model-int8.onnx"
dynamic = {"image": {0: "batch"}, "logits": {0: "batch"}, "embedding": {0: "batch"}}
names = {"input_names": ["image"], "output_names": ["logits", "embedding"], "dynamic_axes": dynamic}
try:
    torch.onnx.export(export, (probe,), str(FP32), opset_version=17, dynamo=False, **names)
except TypeError:  # older torch without the dynamo switch
    torch.onnx.export(export, (probe,), str(FP32), opset_version=17, **names)
except Exception as err:  # torch without the TorchScript exporter
    print(f"TorchScript export failed ({err}); trying the dynamo exporter")
    torch.onnx.export(export, (probe,), str(FP32), opset_version=18, dynamo=True, external_data=False, **names)


def ort_session(path: Path):
    options = ort.SessionOptions()
    options.intra_op_num_threads = os.cpu_count() or 2
    return ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


check = ort_session(FP32).run(None, {"image": probe.numpy()})
with torch.no_grad():
    reference = export(probe)
print("ONNX fp32 vs PyTorch, max |logit diff|:", float(np.abs(check[0] - reference[0].numpy()).max()))


class CalibrationImages(CalibrationDataReader):
    def __init__(self, rows):
        self.batches = iter(loader(EvalImages(rows, TTA_VIEWS[:1], MEAN, STD), shuffle=False, batch_size=16))

    def get_next(self):
        batch = next(self.batches, None)
        return None if batch is None else {"image": batch[0][:, 0].numpy()}


calibration_rows = random.Random(SEED).sample(SPLITS["train"], min(256, len(SPLITS["train"])))
PRE = WORK / "model-pre.onnx"
quant_pre_process(str(FP32), str(PRE), skip_symbolic_shape=True)
quantize_static(str(PRE), str(INT8), CalibrationImages(calibration_rows), quant_format=QuantFormat.QDQ,
                per_channel=True, activation_type=QuantType.QUInt8, weight_type=QuantType.QInt8)
PRE.unlink(missing_ok=True)


def ort_outputs(session, rows, views=TTA_VIEWS):
    all_logits, all_emb, labels = [], [], []
    for batch, y in loader(EvalImages(rows, views, MEAN, STD), shuffle=False, batch_size=max(32 // len(views), 4)):
        b, v = batch.shape[:2]
        logits, emb = session.run(None, {"image": batch.view(b * v, *batch.shape[2:]).numpy()})
        all_logits.append(torch.from_numpy(logits).view(b, v, -1).mean(1))
        all_emb.append(F.normalize(torch.from_numpy(emb).view(b, v, -1).mean(1), dim=1))
        labels.append(y)
    return torch.cat(all_logits), torch.cat(all_emb), torch.cat(labels)


compare_rows = random.Random(SEED + 1).sample(SPLITS["val"], min(2000, len(SPLITS["val"])))
fp32_logits, _, compare_labels = ort_outputs(ort_session(FP32), compare_rows, TTA_VIEWS[:1])
int8_logits, _, _ = ort_outputs(ort_session(INT8), compare_rows, TTA_VIEWS[:1])
fp32_top1, int8_top1 = topk_accuracy(fp32_logits, compare_labels, 1), topk_accuracy(int8_logits, compare_labels, 1)
sizes_mb = {"fp32": FP32.stat().st_size / 1e6, "int8": INT8.stat().st_size / 1e6}
use_int8 = int8_top1 >= fp32_top1 - INT8_MAX_DROP or sizes_mb["fp32"] > MAX_MODEL_MB
CHOSEN = INT8 if use_int8 else FP32
print(f"val top-1 on {len(compare_rows)} images: fp32 {fp32_top1:.4f} ({sizes_mb['fp32']:.1f} MB), "
      f"int8 {int8_top1:.4f} ({sizes_mb['int8']:.1f} MB) -> {CHOSEN.name}")
if CHOSEN.stat().st_size / 1e6 > MAX_MODEL_MB:
    print(f"WARNING: the model is larger than {MAX_MODEL_MB} MB")

# %%
# ---- Calibration and thresholds (on validation, with the exported model and the app's test-time views) ----
session = ort_session(CHOSEN)
proto_rows = [r for c in range(NUM_CLASSES) if c != ALTRO_INDEX
              for r in sorted((r for r in SPLITS["train"] if r["y"] == c), key=lambda r: r["path"])[:PROTOTYPES_PER_CLASS]]
_, proto_emb, proto_labels = ort_outputs(session, proto_rows, TTA_VIEWS[:1])
CATALOG_INDICES = [c for c in range(NUM_CLASSES) if c != ALTRO_INDEX]
PROTOTYPES = torch.stack([F.normalize(proto_emb[proto_labels == c].mean(0), dim=0) for c in CATALOG_INDICES])

val_logits, val_emb, val_labels = ort_outputs(session, SPLITS["val"])
test_logits, test_emb, test_labels = ort_outputs(session, SPLITS["test"])


def fit_temperature(logits, labels) -> float:
    log_t = torch.zeros(1, requires_grad=True)
    optimizer = torch.optim.LBFGS([log_t], lr=0.1, max_iter=200)

    def closure():
        optimizer.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), labels)
        loss.backward()
        return loss

    optimizer.step(closure)
    return float(log_t.detach().exp().item())


def expected_calibration_error(probs, labels, bins=15) -> float:
    confidence, prediction = probs.max(1)
    correct = (prediction == labels).float()
    edges = torch.linspace(0, 1, bins + 1)
    ece = 0.0
    for lo, hi in zip(edges[:-1], edges[1:], strict=True):
        inside = (confidence > lo) & (confidence <= hi)
        if inside.any():
            ece += inside.float().mean().item() * abs(confidence[inside].mean().item() - correct[inside].mean().item())
    return ece


def decide(logits, emb, temperature, accept, unsure, gate):
    """The app's rule: score = highest catalogue probability; the embedding gate can veto a card."""
    probs = F.softmax(logits / temperature, dim=1)
    catalog_probs = probs.clone()
    catalog_probs[:, ALTRO_INDEX] = -1
    score, prediction = catalog_probs.max(1)
    similarity = (emb @ PROTOTYPES.T).max(1).values
    gated = similarity < gate
    card = (score >= accept) & ~gated
    grey = ~card & (score >= unsure) & ~gated
    top3 = catalog_probs.topk(3, dim=1).indices
    return {"probs": probs, "score": score, "prediction": prediction, "similarity": similarity, "card": card,
            "grey": grey, "top3": top3}


def accept_threshold(score, prediction, labels, target):
    """Lowest score whose accepted set still reaches the target precision (out-of-catalogue photos count as wrong)."""
    order = torch.argsort(score, descending=True)
    correct = ((prediction == labels) & (labels != ALTRO_INDEX))[order].float()
    precision = correct.cumsum(0) / torch.arange(1, len(correct) + 1)
    ok = torch.nonzero(precision >= target).flatten()
    if len(ok) == 0:
        return 1.0
    return float(score[order][ok[-1]])


def calibrate(logits, emb, labels, temperature, gate):
    d = decide(logits, emb, temperature, 0.0, 0.0, gate)
    score = torch.where(d["similarity"] < gate, torch.zeros_like(d["score"]), d["score"])
    accept = accept_threshold(score, d["prediction"], labels, TARGET_PRECISION)
    altro_scores = score[labels == ALTRO_INDEX]
    unsure = float(torch.quantile(altro_scores, 1 - GREY_ALTRO_SHARE)) if len(altro_scores) else accept / 2
    return accept, min(unsure, accept)


def summarise(d, labels):
    catalog = labels != ALTRO_INDEX
    altro = ~catalog
    right = d["prediction"] == labels
    in_top3 = (d["top3"] == labels[:, None]).any(1)
    n_cat, n_alt = max(1, int(catalog.sum())), max(1, int(altro.sum()))
    accepted = d["card"]
    return {
        "card_precision": float((accepted & right & catalog).sum() / max(1, int(accepted.sum()))),
        "catalog_card_correct": float((accepted & right & catalog).sum() / n_cat),
        "catalog_card_wrong": float((accepted & ~right & catalog).sum() / n_cat),
        "catalog_unsure_with_answer_in_top3": float((d["grey"] & in_top3 & catalog).sum() / n_cat),
        "catalog_unsure_without_answer": float((d["grey"] & ~in_top3 & catalog).sum() / n_cat),
        "catalog_rejected": float((~accepted & ~d["grey"] & catalog).sum() / n_cat),
        "altro_rejected": float((~accepted & ~d["grey"] & altro).sum() / n_alt),
        "altro_unsure": float((d["grey"] & altro).sum() / n_alt),
        "altro_card": float((accepted & altro).sum() / n_alt),
    }


TEMPERATURE = fit_temperature(val_logits, val_labels)
val_correct_sim = (val_emb @ PROTOTYPES.T).max(1).values[(val_labels != ALTRO_INDEX)]
best_gate, best_coverage = -1.0, -1.0
for percentile in (0, 1, 2, 5, 10):  # 0 = no gate
    gate = -1.0 if percentile == 0 else float(torch.quantile(val_correct_sim, percentile / 100))
    accept, unsure = calibrate(val_logits, val_emb, val_labels, TEMPERATURE, gate)
    coverage = summarise(decide(val_logits, val_emb, TEMPERATURE, accept, unsure, gate), val_labels)["catalog_card_correct"]
    print(f"gate p{percentile:>2} ({gate:+.3f}): accept {accept:.3f}, unsure {unsure:.3f}, val coverage {coverage:.3f}")
    if coverage > best_coverage + (0.01 if percentile else 0):  # a gate must earn its keep (1 point)
        best_gate, best_coverage = gate, coverage
ACCEPT, UNSURE = calibrate(val_logits, val_emb, val_labels, TEMPERATURE, best_gate)
GATE = best_gate
print(f"temperature {TEMPERATURE:.3f}; thresholds accept {ACCEPT:.3f}, unsure {UNSURE:.3f}; gate {GATE:+.3f}")

# %%
# ---- Test-set evaluation and reports ----
REPORT = OUT / "report"
REPORT.mkdir(parents=True, exist_ok=True)
test_rows = SPLITS["test"]
decision = decide(test_logits, test_emb, TEMPERATURE, ACCEPT, UNSURE, GATE)
raw_probs = F.softmax(test_logits, dim=1)
catalog_mask = test_labels != ALTRO_INDEX
metrics = {
    "smoke": SMOKE,
    "complete": complete,
    "backbone": winner["backbone"],
    "format": "int8" if use_int8 else "fp32",
    "model_mb": round(CHOSEN.stat().st_size / 1e6, 2),
    "test_images": len(test_rows),
    "top1_all": topk_accuracy(test_logits, test_labels, 1),
    "top1_catalog": topk_accuracy(test_logits[catalog_mask], test_labels[catalog_mask], 1),
    "top3_catalog": topk_accuracy(test_logits[catalog_mask], test_labels[catalog_mask], 3),
    "ece_before": expected_calibration_error(raw_probs, test_labels),
    "ece_after": expected_calibration_error(decision["probs"], test_labels),
    "temperature": TEMPERATURE,
    "thresholds": {"accept": ACCEPT, "unsure": UNSURE, "gate": GATE},
    "decisions": summarise(decision, test_labels),
    "bakeoff": results,
    "int8_check": {"fp32_top1": fp32_top1, "int8_top1": int8_top1, "sizes_mb": sizes_mb, "images": len(compare_rows)},
    "elapsed_h": elapsed_h(),
}

by_source: dict[str, Counter] = defaultdict(Counter)
for i, row in enumerate(test_rows):
    if row["label"] == ALTRO:
        outcome = "card" if decision["card"][i] else "unsure" if decision["grey"][i] else "rejected"
        by_source[row["source"]][outcome] += 1
metrics["altro_by_source"] = {s: dict(c) for s, c in sorted(by_source.items())}
(REPORT / "metrics.json").write_text(json.dumps(metrics, indent=1, ensure_ascii=False), encoding="utf-8")

prediction = test_logits.argmax(1)
top3 = test_logits.topk(3, dim=1).indices
with (REPORT / "per_class.csv").open("w", encoding="utf-8", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["class", "name", "test_images", "top1", "top3", "cards", "card_precision", "most_confused_with"])
    for c, label in enumerate(CLASSES):
        mask = test_labels == c
        n = int(mask.sum())
        if not n:
            continue
        wrong = Counter(CLASSES[int(p)] for p in prediction[mask] if int(p) != c)
        cards = decision["card"] & (decision["prediction"] == c)
        writer.writerow([label, CATALOG.get(label, {}).get("commonNameIt", ""), n,
                         round(float((prediction[mask] == c).float().mean()), 4),
                         round(float((top3[mask] == c).any(1).float().mean()), 4), int(cards.sum()),
                         round(float((test_labels[cards] == c).float().mean()), 4) if cards.any() else "",
                         "; ".join(f"{k} ({v})" for k, v in wrong.most_common(3))])

pairs = Counter((CLASSES[int(t)], CLASSES[int(p)]) for t, p in zip(test_labels, prediction, strict=True) if t != p)
with (REPORT / "confusions.csv").open("w", encoding="utf-8", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["true", "predicted", "count", "true_test_images"])
    totals = Counter(CLASSES[int(t)] for t in test_labels)
    for (t, p), n in pairs.most_common(100):
        writer.writerow([t, p, n, totals[t]])

# Risk-coverage curve (score threshold sweep on the test set)
with (REPORT / "risk_coverage.csv").open("w", encoding="utf-8", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["threshold", "card_precision", "catalog_coverage", "altro_card_rate"])
    for threshold in np.linspace(0.05, 0.99, 48):
        s = summarise(decide(test_logits, test_emb, TEMPERATURE, float(threshold), float(threshold), GATE), test_labels)
        writer.writerow([round(float(threshold), 3), round(s["card_precision"], 4), round(s["catalog_card_correct"], 4),
                         round(s["altro_card"], 4)])
for r in results:
    history_file = RUNS / short_name(r["backbone"]) / "history.json"
    if history_file.exists():
        shutil.copy2(history_file, REPORT / f"history-{short_name(r['backbone'])}.json")

# %%
# ---- Files for the app ----
shutil.copy2(CHOSEN, OUT / "model.onnx")
PROTOTYPES.numpy().astype("<f4").tofile(OUT / "prototypes.bin")
class_hash = hashlib.sha256("\n".join(CLASSES).encode()).hexdigest()[:16]
version = time.strftime("%Y%m%d") + "-" + short_name(winner["backbone"]) + ("-smoke" if SMOKE else "")
labels_json = {
    "version": version,
    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "backbone": winner["backbone"],
    "catalogHash": class_hash if SMOKE else CLASSES_META.get("catalogHash", class_hash),
    "classes": CLASSES,
    "altroIndex": ALTRO_INDEX,
    "model": {"file": "model.onnx", "format": "int8-qdq" if use_int8 else "fp32", "bytes": (OUT / "model.onnx").stat().st_size,
              "input": "image", "outputs": ["logits", "embedding"]},
    "input": {
        "size": IMG_SIZE, "layout": "NCHW", "channels": "RGB", "dtype": "float32",
        "resize": "short side to resizeShortSide with bilinear antialiased resampling (PIL BILINEAR), "
                  "long side = floor(long * scale + 0.5); then crop at floor((w - crop) / 2), floor((h - crop) / 2)",
        "scale": "pixel / 255, then (x - mean) / std", "mean": MEAN, "std": STD,
        "orientation": "apply the EXIF orientation before resizing",
    },
    "tta": TTA_VIEWS,
    "aggregation": "average the logits over the views; average the embeddings and L2-normalise",
    "temperature": TEMPERATURE,
    "decision": {
        "score": "highest softmax(logits / temperature) among catalogue classes (altro excluded)",
        "accept": ACCEPT, "unsure": UNSURE, "targetPrecision": TARGET_PRECISION,
        "rule": "card if score >= accept; 'Non sono sicuro' with the top 3 if score >= unsure; else not in the catalogue. "
                "If embeddingGate is enabled and max cosine similarity to the prototypes < minSimilarity: not in the catalogue.",
    },
    "embeddingGate": {"enabled": GATE > -1, "minSimilarity": GATE},
    "prototypes": {"file": "prototypes.bin", "dtype": "float32-le", "shape": list(PROTOTYPES.shape),
                   "classes": [CLASSES[c] for c in CATALOG_INDICES]},
    "metrics": {k: metrics[k] for k in ("top1_catalog", "top3_catalog", "ece_after", "decisions")},
}
(OUT / "labels.json").write_text(json.dumps(labels_json, indent=1, ensure_ascii=False), encoding="utf-8")

# Parity fixtures for the app's tests: a few openly licensed test photos (no NC: the app repository is public),
# the centre-view tensor computed here and the expected outputs.
PARITY = OUT / "parity"
PARITY.mkdir(exist_ok=True)
open_rows = [r for r in test_rows if r["label"] != ALTRO and ATTRIBUTIONS.get(r["path"], {}).get("license") in ("cc0", "cc-by")]
fixtures = []
center = EvalImages([], TTA_VIEWS[:1], MEAN, STD)
for row in random.Random(SEED).sample(open_rows, min(6, len(open_rows))):
    name = Path(row["path"]).name
    shutil.copy2(row["file"], PARITY / name)
    tensor = center.tensor(load_rgb(row["file"]), TTA_VIEWS[0])[None]
    tensor.astype("<f4").tofile(PARITY / f"{Path(name).stem}.f32")
    logits, emb = session.run(None, {"image": tensor})
    attribution = ATTRIBUTIONS.get(row["path"], {})
    fixtures.append({"image": name, "tensor": f"{Path(name).stem}.f32", "label": row["label"],
                     "logits": [round(float(v), 5) for v in logits[0]], "embedding": [round(float(v), 5) for v in emb[0]],
                     "license": attribution.get("license"), "attribution": attribution.get("attribution"),
                     "source": attribution.get("observation_url")})
(PARITY / "parity.json").write_text(json.dumps({"view": TTA_VIEWS[0], "fixtures": fixtures}, indent=1, ensure_ascii=False), encoding="utf-8")

d = metrics["decisions"]
bakeoff_text = ", ".join(short_name(r["backbone"]) + " " + format(r["val_top1"], ".1%") for r in results)
summary = f"""# FloraDeck · risultato dell'addestramento

- Modello: **{winner['backbone']}** ({metrics['format']}, {metrics['model_mb']} MB){' — PROVA RIDOTTA (SMOKE)' if SMOKE else ''}
- Addestramento completo: {'sì' if complete else 'NO, interrotto per tempo: rilancia con questo output come input'}
- Confronto modelli (validazione, top-1): {bakeoff_text}

## Sul test set ({len(test_rows):,} foto mai viste, di fotografi diversi)

- Specie giusta al primo tentativo: **{metrics['top1_catalog']:.1%}**; tra le prime tre: **{metrics['top3_catalog']:.1%}** (obiettivi: 85 % e 95 %)
- Con le soglie dell'app, su 100 foto di specie del catalogo:
  - {d['catalog_card_correct']:.0%} carta giusta, {d['catalog_card_wrong']:.0%} carta sbagliata;
  - {d['catalog_unsure_with_answer_in_top3']:.0%} "Non sono sicuro" con la risposta tra le tre proposte, {d['catalog_unsure_without_answer']:.0%} senza;
  - {d['catalog_rejected']:.0%} "non è nel catalogo".
- Su 100 foto fuori catalogo: {d['altro_rejected']:.0%} riconosciute come fuori catalogo, {d['altro_unsure']:.0%} "Non sono sicuro", {d['altro_card']:.0%} carta sbagliata.
- Precisione delle carte date: {d['card_precision']:.1%} (obiettivo {TARGET_PRECISION:.0%}).

Dettagli: `report/metrics.json`, `report/per_class.csv`, `report/confusions.csv`.
"""
(OUT / "LEGGIMI.md").write_text(summary, encoding="utf-8")
archive = shutil.make_archive(str(WORK / "floradeck-model"), "zip", OUT)
print(summary)
print(f"Scarica {archive} dalla sezione Output. Tempo totale: {elapsed_h():.2f} h")
