# FloraDeck

Personal PWA for collecting Italian wild flowers and plants as trading cards ("figurine"), for two players: the user and their partner. On-device plant recognition, albums to complete, gifts between the two phones.

- Original spec (Italian, authoritative for requirements): [docs/SPEC.md](docs/SPEC.md)
- Agreed plan with rationale (Italian): [docs/PLAN.md](docs/PLAN.md)

## Working agreement

- Talk to the user in Italian. Code, comments and commit messages in English; all app UI copy in Italian.
- One phase at a time. At the end of each phase: run build and tests, list what to try by hand on the phones (Android Chrome, iPhone Safari PWA), then stop and wait.
- Commit at the end of every significant step.
- Ask before any global install or any command that changes the system outside this folder (npm -g, winget, Playwright browser downloads, Impeccable engine download, pip outside a venv).
- Budget zero: free tools and services only, no Apple/Google developer accounts.
- Never invent botanical data: leave the field empty and flag it. Italian species texts stay marked "da verificare" until the user checks them.
- Keep this file current: decisions, commands, structure.

## Environment

- Windows 11, PowerShell (ExecutionPolicy RemoteSigned); Git Bash also available. If `npx` misbehaves, use `npx.cmd`.
- Node 26.13, npm 11.20, git 2.56 (identity configured globally). No `gh` CLI.
- Python: use `py -3.13` (plain `python` is 3.9).
- GPU: GeForce MX130 2 GB, not usable for training. Training runs on Google Colab (free T4); download, cleaning and ONNX export run locally on CPU.
- Google Chrome is installed (Playwright MCP default browser). No Playwright-managed browsers yet: downloading WebKit needs the user's OK.

## Skills and MCP

- **Design:** `impeccable` (v4.8) is the main design skill for all UI work except motion. `/teach-impeccable` is now `impeccable teach` (alias of `init`, writes PRODUCT.md). Its Windows launcher downloads an engine binary on first run: ask first. Run its critique/audit/polish at the end of every UI phase.
- **Motion:** Emil Kowalski's skills only (`animate`, `choreograph`, `apple-design`, `animation-performance`, `emil-design-eng`). Do not use Impeccable's `animate` command (overlapping rules). Also `mobile-native` for native feel on phones, `break-ui` for worst-case data.
- `review-animations`, `prototype` and `pick-ui-library` cannot be model-invoked. Before closing a phase with animations: ask the user to run `/review-animations`, or read `.claude/skills/review-animations/SKILL.md` and `STANDARDS.md` and apply them, saying so.
- `design-taste-frontend`: only for one of the phase-2 mockups. If the user picks that direction, it replaces Impeccable as the main design skill. Never combine two general design skills with conflicting rules: ask.
- State in one line which skill is in use at every UI step.
- **Playwright MCP** (`.mcp.json`, verified 2026-11-06): after every UI change check 390×844 and 360×800, light and dark; fix visual issues; also test WebKit. Real camera and real iOS cannot be tested here: give the user a manual checklist. Screenshots land in `.playwright-mcp/` (git-ignored).
- Skills are installed per project in `.claude/skills/` (sources and hashes in `skills-lock.json`); that folder is git-ignored like a dependency folder.

## Decisions (2026-11-06)

- **Stack:** Vite + React + TS, Tailwind CSS v4, Motion (ex Framer Motion), Dexie + `navigator.storage.persist()`, vite-plugin-pwa (Workbox), ONNX Runtime Web in a Web Worker (WASM-SIMD by default; WebGPU only if benchmarks justify it), Vitest + fake-indexeddb, Playwright Test (Android/Chromium and iPhone/WebKit projects).
- **Hosting:** GitHub Pages via GitHub Actions, public repo (user's GitHub account still to confirm before phase 3). Fallback: Cloudflare Pages.
- **Catalog:** 10 albums × 20–30 species (about 260; the user changed this from 8 × 10–12 on 2026-11-06), exactly 1 rare per album, plus 1 secret legendary species (Cypripedium calceolus). Albums added: "Orchidee spontanee" and "Orto, frutteto ed erbe aromatiche"; all orchids live in the orchid album. Species widespread across Italy (user's region unknown). `catalog/` is the single source of truth: schema-validated, read by `ml/`, imported by the app at build time.
- **Catalog data:** `species.json` is generated, never edited by hand. Months (`bloomMonths`, with `phenology` flowering/fruiting), `regions` (north/centre/south shares corrected for observer density), `altitude` (5th–95th percentile of EU-DEM elevations at iNaturalist observation points; wild species only) and `family` come from data. Habitat, size, description, fun fact and safety flags are hand-written in `catalog/texts/<album>.json` and stay `textStatus: "da-verificare"` until the user ticks them in the review page. `protected`: true = legally protected, null = possibly protected in some regions (to verify), false = no. `toxic`: true shows a warning; false only means no warning, the app never claims a plant is edible. "Fotografala, non raccoglierla" is shown for every non-cultivated species, stronger for protected ones.
- **Illustrations:** public-domain botanical plates (Thomé, Sturm, Köhler, Curtis's Botanical Magazine, Sibthorp) from Wikimedia Commons/BHL, with attributions; empty-slot silhouettes derived by script.
- **ML:** approach A: fine-tune a mobile CNN with timm (bake-off: MobileNetV4-M, EfficientNet-B0, ConvNeXt-Nano) on catalog species plus an "altro" class. The model also outputs its penultimate embedding for a prototype-distance OOD score (idea from approach C). Targets: < 30 MB, < 2 s, top-1 ≥ 85 %, top-3 ≥ 95 % on the catalog test set. With ~260 classes these targets are tight: after the phase-6 confusion analysis, merge confusable classes to group/genus level or swap them. Species whose card covers flowers and fruits (e.g. Punica) train on both phases.
- **Data:** iNaturalist research grade, CC0/CC-BY/CC-BY-NC, Italy first then Europe, prefer phenology annotations (flowering/fruiting); attributions CSV. Split by observation; test set also grouped by observer. No hue jitter in augmentation (colour is the key feature). Cultivated plants are always "casual" on iNaturalist, so garden species need casual observations too; genus/group classes can also use observations identified only to genus.
- **Dataset selection (phase 6a, `ml/`):** per class, newest first, Italy → Europe → world; research grade, plus community-agreed genus/group-level IDs (group/genus classes) and captive casual (cultivated); annotated phase first, then unannotated from `bloomMonths`; 300–800 observations, ≤ 20 per observer; 1 photo per observation (2 below 300). Recent iNaturalist "medium" files are JPEG quality ~100 (~180 KB), so downloads are re-encoded at quality 90. "Altro" = lookalikes + 300 common Italian plants + catalogue species without flowers/fruits + non-plant iNaturalist taxa + Open Images scenes without plants (CC BY 2.0).
- **Calibration:** temperature scaling; threshold from a risk–coverage curve on in- and out-of-catalog validation data. Parity test checks model and preprocessing separately. `ml/` exports `labels.json` plus metadata (temperature, thresholds, normalisation, version): no hard-coded constants in the app.
- **Recognition UX:** confidence ≥ threshold → card; grey zone → "Non sono sicuro" + top-3 to confirm; "altro"/OOD → not in catalog + shooting tips. 2–3 crop TTA. `MockRecognizer` with forceable scenarios (sure / unsure / out of catalog) behind the same interface until the real model ships.
- **Photos:** long side 1080 px; WebP when the browser can encode it, else JPEG (runtime check); separate thumbnail.
- **Location:** opt-in only, rounded to ~1 km, nearest comune computed offline (ISTAT list).
- **Gifts and couple:** serverless first. A gift is a link with the payload in the URL fragment (or a `.floradeck` file): species id, compressed photo (~15–20 KB), date, sender, message, unique `giftId`. On iPhone the link opens in Safari, whose storage is separate from the Home-screen app → bridge "Copia regalo" → "Incolla regalo". QR codes for pairing and progress snapshots (≈3 KB max, no photos). The duplicate leaves the sender's collection when the gift is created (resend = same `giftId`); the receiver stores imported `giftId`s, also in backups. Partner albums are read-only snapshots; the couple album is the union. Optional backend in phase 8 (Supabase free pauses idle projects; also evaluate Cloudflare Workers + D1).
- **Order:** backup export/import moved to phase 5; ML scripts start right after phase 1 and run in parallel with the UI phases (the user runs Colab training); weekly challenges in phase 9.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup, plan, CLAUDE.md, repo | ✅ 2026-11-06 |
| 1 | Catalog: albums + species list → user validates → `species.json`, schema, review sheet; iNat photo counts per species | ✅ 2026-11-06 (texts still to verify) |
| 2 | Design: `impeccable teach`, 3 static mockups (2 Impeccable, 1 Taste) → user picks | next |
| 3 | PWA skeleton: nav, themes, offline fonts, Dexie, offline, install guide + iOS warning, deploy | |
| 4 | Camera + mock recognizer + shot → card → collection, unpacking animation | |
| 5 | Albums, rarity, duplicates, cover photo, diary, "In fiore questo mese", celebrations, legendary card, backup | |
| 6 | ML pipeline, Colab notebook, evaluation, ONNX export (scripts start after phase 1) | 6a dataset pipeline ✅ 2026-11-06 (download waits for the user's OK) |
| 7 | Real model in the app, threshold calibration, tests on real photos | |
| 8 | Profiles, gifts, couple features; optional backend | |
| 9 | Polish (Impeccable audit/polish, animation review), device tests, weekly challenges, optional Capacitor APK | |

## Commands

Catalog (Python 3.13, standard library only; run from the repo root):
- `py -3.13 catalog/scripts/inat_stats.py`: fetch iNaturalist stats for `catalog/proposal/candidates.json` (responses cached in `catalog/.cache/`, about 1 request/s; `--only <key> ...` refreshes single entries).
- `py -3.13 catalog/scripts/render_proposal.py`: regenerate `catalog/proposta-specie.md` from the candidates and the stats.
- `py -3.13 catalog/scripts/build_catalog.py`: build `catalog/species.json` and `catalog/albums.json` (candidates + stats + `texts/` + optional `review/status.json`).
- `py -3.13 catalog/scripts/validate_catalog.py`: check the built catalogue (errors fail; warnings list what to complete).
- `py -3.13 -m unittest discover -s catalog/scripts -p "test_*.py"`: catalog unit tests.
- `py -3.13 catalog/scripts/build_review.py`: build the review page `catalog/review/index.html` (open it in a browser; its export goes to `catalog/review/status.json`).
- To change a species: edit `catalog/proposal/candidates.json` (and its text in `catalog/texts/`), run `inat_stats.py --only <key>`, then build, validate, review.

ML dataset (Python 3.13 venv in `ml/.venv`, Pillow + numpy; run from the repo root; details in `ml/README.md`, settings in `ml/dataset.toml`):
- `py -3.13 -m venv ml\.venv` then `ml\.venv\Scripts\python -m pip install -e ml`: set up the venv.
- `ml\.venv\Scripts\python -m floradeck_ml fetch --dry-run`: select iNaturalist observations for every class and "altro" (API cached in `ml/data/cache/`, ~1 request/s), estimate the download, write `ml/reports/dataset-plan.md` and `ml/reports/altro-sources.md`; downloads no image. `--only <class> ...` for a few classes.
- `ml\.venv\Scripts\python -m floradeck_ml fetch`: the same selection, then the resumable download (≤ 5 GB/hour, ≤ 24 GB per run) and `ml/data/attributions.csv`; `... download` resumes from the manifest.
- `ml\.venv\Scripts\python -m floradeck_ml clean`: decode check, size filter, pHash dedupe, observer-grouped split → `ml/data/dataset.csv`, `ml/data/classes.json`.
- `ml\.venv\Scripts\python -m unittest discover -s ml\tests`: dataset pipeline tests.

Dev, build, test and training commands are added here as each phase lands.

## Structure

```
floradeck/
├─ app/              PWA (Vite + React + TS), from phase 3
│  ├─ src/domain/      pure logic: collection, duplicates, gifts, seasonality (fully unit-tested)
│  ├─ src/db/          Dexie schema, migrations, backup
│  ├─ src/recognition/ Recognizer interface, mock, ONNX worker, preprocessing
│  ├─ src/features/    explore · albums · journal · couple · settings
│  ├─ src/ui/          design system components, tokens, themes, fonts
│  └─ e2e/             Playwright tests
├─ catalog/
│  ├─ species.json, albums.json   generated catalogue (do not edit)
│  ├─ proposal/        candidates.json (species choice), inat_stats.json (data)
│  ├─ texts/           hand-written Italian texts per album
│  ├─ schema/          species.schema.json
│  ├─ review/          index.html (review page), status.json (user's checks)
│  ├─ scripts/         stats, build, validate, review, tests
│  └─ proposta-specie.md   the validated proposal (tables with data)
├─ ml/               Python pipeline (phase 6): dataset now; train, eval, export and Colab notebook next
│  ├─ floradeck_ml/    dataset package and CLI (python -m floradeck_ml): selection, download, clean, split
│  ├─ tests/           unit tests (unittest)
│  ├─ dataset.toml     dataset settings (targets, tiers, altro sources, rate limits, split)
│  ├─ reports/         last full dry run: dataset-plan.md, altro-sources.md (generated)
│  └─ data/            API cache, manifest, images, attributions.csv, dataset.csv (git-ignored)
├─ docs/             SPEC.md, PLAN.md, mockups/ (phase 2)
├─ .claude/skills/   project skills (git-ignored)
├─ .mcp.json         Playwright MCP
├─ skills-lock.json  skill sources and hashes
└─ CLAUDE.md
```
