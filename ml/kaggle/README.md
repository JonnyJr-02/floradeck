# Training on Kaggle

The recogniser is trained in a Kaggle notebook (free GPU, about 30 hours a week; sessions up to 12 hours
that keep running with the browser closed). Kaggle replaced Colab because the dataset (~9 GB) would fill
a free Google Drive.

- `floradeck_train.py`: the notebook source, cells marked with `# %%` (edit this file).
- `floradeck-train.ipynb`: generated from it with `py -3.13 ml/kaggle/make_notebook.py` (upload this one).

## 1. Pack the dataset

```powershell
ml\.venv\Scripts\python -m floradeck_ml pack
```

It writes `ml/data/kaggle/`: `dataset.csv`, `classes.json` (class order = current catalogue order,
then `altro`), `catalog.json`, `attributions.csv`, `README.md` and `images-NN.zip` (uncompressed, about
2 GB each; about 7 GB in all). Images are shrunk to a 320 px short side (the model sees 256 px crops) with
the EXIF orientation applied; `--short-side 0` keeps them as they are. The pack stops before a shard would
leave less than 2 GB free on the disk. Images of species that have left the catalogue become `altro` (100 per species,
`source = altro/excluded`), so the model learns to answer "not in the catalogue" for them. After any
catalogue change, pack again and upload a new version of the dataset.

## 2. Create the Kaggle dataset (private)

kaggle.com → Datasets → New Dataset → drag in every file of `ml/data/kaggle/` → title "floradeck" →
**Private** → Create. Kaggle extracts the zips; the notebook also extracts them itself if they stay zipped.
Some photos are CC BY-NC: the dataset must stay private.

## 3. Run the notebook

kaggle.com → Code → New Notebook → File → Import Notebook → `floradeck-train.ipynb`. Then, in the right
panel: Add Input → the "floradeck" dataset; Session options → Accelerator **GPU T4 x2** (recent PyTorch
builds no longer run on the P100), Internet **On** (needs a phone-verified account).

1. Set `SMOKE = True`, Run All: a few minutes on 6 classes; it checks every step, export included.
2. Set `SMOKE = False`, Save Version → **Save & Run All (Commit)**. The three backbones train one after
   the other (roughly 1–2 hours each), then the winner is exported and calibrated.
3. When the version has finished: Output → download `floradeck-model.zip`.

If a run stops (time limit, error), start a new version with the previous version's output added as an
input: finished backbones are skipped and an unfinished one resumes from its last epoch.

## Output (`floradeck-model.zip`)

| File | Content |
|---|---|
| `model.onnx` | the model: input `image` (N×3×256×256, normalised RGB), outputs `logits` and `embedding` (L2-normalised) |
| `labels.json` | class order (catalogue ids + `altro`), preprocessing, test-time views, temperature, thresholds, embedding gate, version, `catalogHash`, headline metrics |
| `prototypes.bin` | float32 little-endian, one L2-normalised mean embedding per catalogue class (shape in `labels.json`) |
| `parity/` | 6 CC0/CC BY test photos with the expected input tensor (`.f32`) and outputs, for the app's parity test |
| `report/` | `metrics.json`, `per_class.csv`, `confusions.csv`, `risk_coverage.csv`, training histories |
| `LEGGIMI.md` | summary in Italian |

Decision rule (all numbers from `labels.json`): average the logits of the test-time views, divide by the
temperature, softmax; score = highest catalogue probability (`altro` excluded). Score ≥ `accept` → card;
≥ `unsure` → "Non sono sicuro" with the top 3; otherwise "not in the catalogue". When the embedding gate
is enabled, a photo whose embedding is far from every prototype is "not in the catalogue".

How the thresholds are chosen on validation (`ml/floradeck_ml/calibration.py`, pasted into the notebook by
`make_notebook.py`): `accept` is the lowest score at which the cards are still right ≥ 98 % of the time
(out-of-catalogue photos that get a card count as wrong); `unsure` is the lowest score at which the photos
between the two thresholds still have the right species among the 3 proposals ≥ 50 % of the time and at
most 10 % of the out-of-catalogue photos land there. (The first run, 2026-11-08, used a 95 % target and an
altro-quantile rule that left no grey zone; it was recalibrated locally, see below.)

## New thresholds without training again

```powershell
ml\.venv\Scripts\python ml\kaggle\model_outputs.py <model folder> ml\data\kaggle <tmp>\outputs.npz
ml\.venv\Scripts\python ml\kaggle\recalibrate.py <model folder> <tmp>\outputs.npz <tmp>\floradeck-model
```

`<model folder>` is the extracted `floradeck-model.zip`. The first script runs the model on the val and
test photos of the pack on the CPU (about 1 hour for 23,800 photos); the second refits temperature and
thresholds, evaluates test again and writes a new folder and zip with the updated `labels.json`, `report/`
and `LEGGIMI.md` (same `model.onnx`).

## Local check

The notebook also runs on a PC (CPU) for a smoke test, with torch, torchvision, timm, onnx, onnxruntime
and onnxscript installed in `ml/.venv` (`pip install torch torchvision --index-url
https://download.pytorch.org/whl/cpu` then `pip install timm onnx onnxruntime onnxscript`):

```powershell
ml\.venv\Scripts\python -m floradeck_ml pack --out <tmp>\input\floradeck --max-classes 6 --sample 30 --shard-gb 0.002
$env:FLORADECK_SMOKE = "1"; $env:FLORADECK_WORKERS = "0"
$env:FLORADECK_INPUT = "<tmp>\input"; $env:FLORADECK_WORK = "<tmp>\work"; $env:FLORADECK_EXTRACT = "<tmp>\extract"
ml\.venv\Scripts\python ml\kaggle\floradeck_train.py
```
