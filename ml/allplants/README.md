# All-plants prototype (PlantCLEF 2024)

Offline "which plant is this?" for photos the card model calls *not in the catalogue*: the PlantCLEF 2024
model of the Pl@ntNet team, ViT-B/14 DINOv2 fine-tuned on ~1.4 million photos of **7,806 species of the
flora of south-western Europe**. Licence **CC BY 4.0** ([Zenodo 10848263](https://zenodo.org/records/10848263)):
the app must credit it, e.g. "Goëau H., Lombardo J.-C., Affouard A., Espitalier V., Bonnet P., Joly A. (2024),
PlantCLEF 2024 pretrained models on the flora of the south western Europe (Pl@ntNet), CC BY 4.0" (authors and
title as on the Zenodo record).
It gives a name only, never a card, and runs only when the user asks (decided 2026-11-08).

Prototype only: nothing here is wired into the app. Artifacts live in `ml/artifacts/plantclef2024/`
(git-ignored) in the main checkout.

## Steps (ml/.venv, run from the repo root)

```powershell
# 1. Download only the fine-tuned model from the 2.3 GB Zenodo tar (parallel range requests)
py -3.13 -I ml/allplants/fetch_tar_member.py <zenodo tar url> ml/artifacts/plantclef2024 "then_all/,class_mapping.txt,species_id_to_name.txt"
# 2. Keep the EMA weights (370 MB); the checkpoint is read with torch.load(weights_only=True)
ml\.venv\Scripts\python ml/allplants/plantclef.py slim <model_best.pth.tar> ml/artifacts/plantclef2024/plantclef-ema.pt
# 3. ONNX fp32 -> int8 (dynamic, per channel) and fp16, at a fixed input size
ml\.venv\Scripts\python ml/allplants/plantclef.py export <ema.pt> ml/artifacts/plantclef2024/onnx --size 336
# 4. Parts of at most 50 MB for GitHub Pages, with a SHA-256 manifest
ml\.venv\Scripts\python ml/allplants/plantclef.py split <model.onnx> <out dir>
# 5. Test set: out-of-catalogue photos (val + test of the Kaggle pack) whose species is a PlantCLEF class
ml\.venv\Scripts\python ml/allplants/plantclef.py testset ml/data <species.csv> <testset.csv> --per-species 1
# 6. Accuracy at several input sizes (PyTorch fp32), or of one ONNX file
ml\.venv\Scripts\python ml/allplants/plantclef.py eval <ema.pt> <testset.csv> ml/data <out.npz> --mapping <class_mapping.txt> --species <species.csv>
ml\.venv\Scripts\python ml/allplants/plantclef.py eval-onnx <model.onnx> <testset.csv> ml/data <out.npz> --size 336 --mapping ... --species ...
# 7. Italian names: iNaturalist taxonomy export, iNaturalist API for synonyms, then GBIF
ml\.venv\Scripts\python ml/allplants/names.py <species.csv> <inaturalist-taxonomy.dwca.zip> <names.csv> --inat-api --gbif
```

Browser speed: `py -3.13 ml/allplants/serve.py <onnx dir> 8765` (like GitHub Pages: no COOP/COEP, so WASM is
single-threaded) or `... 8766 --isolated` (WASM threads), then open
`http://127.0.0.1:8765/bench.html?model=plantclef-336-int8.onnx&ep=wasm&threads=1&size=336`
(`ep=webgpu` with the fp16 file; `parts=web/<name>.parts.json` loads a split model and checks its SHA-256).

Preprocessing (timm eval config of the model): EXIF orientation, short side resized to the input size
(bicubic), centre crop, ImageNet mean/std, NCHW float32; output `logits` over the 7,806 classes in the order
of `class_mapping.txt` (Pl@ntNet species ids; names in `species_id_to_name.txt`).

Results and recommendation: see the report in the session notes (2026-11-08) and `report.md` next to the
artifacts.
