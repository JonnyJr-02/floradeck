# ml

Python pipeline for the FloraDeck recogniser (plan phase 6). This folder holds step **a**, the dataset:
selection of iNaturalist observations for every catalogue class plus the "altro" class, resumable
rate-limited download with attributions, cleaning (decode check, minimum size, perceptual-hash
deduplication) and the train/val/test split. Training (Colab notebook), evaluation and ONNX export
come next. Decisions behind it: [docs/PLAN.md](../docs/PLAN.md) and the root `CLAUDE.md`.

## Setup

Python 3.13, a project venv in `ml/.venv` (git-ignored), dependencies Pillow and numpy only:

```powershell
py -3.13 -m venv ml\.venv
ml\.venv\Scripts\python -m pip install -e ml
```

All commands below run from the repository root.

## Commands

```powershell
# 1. Dry run: select observations (iNaturalist API, cached), estimate the download, write the report.
#    No image is downloaded. About 2,400 API requests the first time (1–1.5 h), seconds afterwards.
ml\.venv\Scripts\python -m floradeck_ml fetch --dry-run

# 2. Full run: the same selection (from the cache), then the download (resumable; ~5 GB/hour cap).
ml\.venv\Scripts\python -m floradeck_ml fetch

#    Only the download step, from the existing manifest (e.g. to resume the next day):
ml\.venv\Scripts\python -m floradeck_ml download

# 3. Cleaning and split -> ml/data/dataset.csv
ml\.venv\Scripts\python -m floradeck_ml clean

# 4. Bundle for the Kaggle dataset -> ml/data/kaggle/ (training: kaggle/README.md)
ml\.venv\Scripts\python -m floradeck_ml pack

# Tests, and lint (ruff comes with the dev extra: pip install -e "ml[dev]")
ml\.venv\Scripts\python -m unittest discover -s ml\tests
ml\.venv\Scripts\python -m ruff check ml
```

Useful options: `fetch --only bellis-perennis taraxacum` (a few classes, written to
`data/manifest/partial/`), `--no-altro`, `--target-min/--target-max`, `--offline` (cache only),
`download --limit 50`, `--data-dir` (another data folder). All settings, with comments, are in
[`dataset.toml`](dataset.toml); the defaults in `floradeck_ml/config.py` are the same values
(a test checks it).

## How observations are chosen

For each class of `catalog/species.json` (taxa from `inatTaxonIds`), observations are taken newest
first through ordered *tiers* until `target_max` (500) is reached:

1. **Geography:** Italy, then Europe without Italy, then the rest of the world. The queries never overlap.
2. **Identification:** research grade first. Group/genus classes also take observations identified only
   to that taxon (e.g. *Taraxacum*, *Muscari neglectum* complex) with community support
   (`identifications=most_agree`). Cultivated classes also take casual observations flagged
   captive/cultivated, again with community support: iNaturalist never makes garden plants research grade.
3. **Phenology:** observations annotated with the card's phase ("Flowers and Fruits" = Flowers 13 or
   Fruits or Seeds 14) first, then unannotated observations from the card's `bloomMonths` (no month
   filter outside Europe). Observations annotated with another phase are never used for a class.
   `dataset.toml` lists cards that train on both phases (Punica).

Other rules: at most 20 observations per observer and class (relaxed only for classes that would stay
below `target_min` = 300); fallback tiers without community support are used only below `target_min`;
photos must be CC0, CC BY or CC BY-NC, on the open-data bucket, and at least 224 px on the short side
once resized; one photo per observation (the observer's main photo), two for classes below
`target_min`. A class whose taxon contains another class's taxon excludes it (`without_taxon_id`),
and an observation or photo is never used twice.

## The "altro" class

| Part | Source | Licence |
|---|---|---|
| Lookalikes outside the catalogue | `lookalikesOutside` of every species, resolved on iNaturalist; research grade, Italy → Europe → world, flowers/fruits first; up to 100 observations each. A lookalike inside a catalogue taxon is skipped; a lookalike genus excludes the catalogue species it contains. | CC0 / CC BY / CC BY-NC, per photo |
| Common Italian plants | The 300 most observed vascular plants of Italy (research grade, open licence) that are not catalogue taxa, inside a catalogue taxon, or lookalikes; 20 observations each, Italy only. | as above |
| Leaves only | Catalogue species annotated "No Flowers or Fruits": a card needs the colourful part. Up to 10 per class, 2,000 in all. | as above |
| Non-plants (iNaturalist) | Fungi, birds, mammals, reptiles, amphibians, molluscs; 250 observations each. Insects and spiders are left out because they are usually photographed on flowers. | as above |
| Everyday scenes (Open Images) | Open Images V7 validation split: 2,000 images with no human-verified label naming a plant, plant part, garden or landscape; files from the public `open-images-dataset` bucket (CVDF), resized to 500 px. | CC BY 2.0 (Flickr photos); labels CC BY 4.0 (Google) |

The resolved list (which taxa, how many observations) is written to
[`reports/altro-sources.md`](reports/altro-sources.md) by every full `fetch`.

## Outputs (`ml/data/`, git-ignored)

The data belongs in the main checkout, `C:\Users\jjarb\floradeck\ml\data\` (the default when running from
there). From a git worktree, pass `--data-dir C:\Users\jjarb\floradeck\ml\data`: worktrees are deleted with
their session, and the images would go with them.

| Path | Content |
|---|---|
| `cache/inat/` | gzipped API responses; delete to refresh the data |
| `manifest/selection.jsonl` | one line per selected observation with the photos to download |
| `manifest/plan.json`, `manifest/report.md` | per-class summary, settings snapshot, size estimate |
| `images/<class>/<photo id>.jpg` | the photos (JPEG; recent iNaturalist "medium" files are quality ~100, about 180 KB, and are re-encoded at quality 90 when that saves at least 15 %) |
| `attributions.csv` | photo id, observation id, provider, label, source, observer, licence, attribution text, photo URL, observation URL, path: one row per image |
| `download-failures.csv` | photos that could not be downloaded (deleted, licence changed) |
| `clean/hashes.csv`, `clean/rejected.csv`, `clean/report.md` | decode/size/pHash cache, rejected images with the reason, per-class split counts |
| `dataset.csv` | path, label, split, source, provider, photo/observation/observer ids, tier, size, pHash |
| `classes.json` | class order (catalogue order, then `altro`) |

The committed reports in [`reports/`](reports/) are the last full dry run: `dataset-plan.md`
(per-class counts and download estimate) and `altro-sources.md`.

## Cleaning and split

- Every image is fully decoded (truncated files are rejected), measured and hashed (64-bit DCT pHash).
- Images below 224 px on the short side or more elongated than 3:1 are dropped.
- Near-duplicates (Hamming distance ≤ 4) are grouped across the whole dataset; the first copy (best tier)
  is kept, and groups whose copies carry different labels are dropped entirely.
- Split unit: the observation. Test is grouped by observer across all classes (10 %): a person's photos
  are all in test or none are. Validation (10 %) is drawn by observation from the remaining observers.
  Small classes get at least a few test and validation observations; test never takes more than half
  of a class. Assignments are seeded hashes, stable when data is added.

## Limits and etiquette

- API: about one request per second (two in flight, starts spaced by 1 s), at most 9,500 network
  requests per run (iNaturalist asks for ≤ 10,000 a day); generic User-Agent, no personal data.
- Media: ≤ 5 GB/hour and ≤ 24 GB per run (iNaturalist guidance); a run that hits the daily cap stops
  and the next one resumes. Interrupted downloads leave only `.part` files, which are redone.
