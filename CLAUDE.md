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
- GPU: GeForce MX130 2 GB, not usable for training. Training, evaluation and ONNX export run in a Kaggle notebook (free T4, chosen over Colab on 2026-11-07: the ~9 GB dataset would fill a free Drive); download, cleaning and packing run locally on CPU.
- Google Chrome is installed: Playwright MCP default browser and the Android E2E project (`channel: 'chrome'`). Playwright's WebKit was downloaded on 2026-11-07 with the user's OK (`%LOCALAPPDATA%\ms-playwright`).
- Disk C: is small and nearly full (237 GB; on 2026-11-07 it ran out completely, then about 11 GB were free): check `df -h /c` before large downloads.

## Skills and MCP

- **Design:** `design-taste-frontend` (tasteskill 2.5) is the main design skill for all UI work except motion, since the user picked its mockup C on 2026-11-07. It is written for websites, so for the app take its tokens and type pairing (`docs/mockups/taste/style.css`: Fraunces + Figtree, round radius, ivory / midnight blue with one poppy-red accent), its one-system rules (one button pair, one card style, one radius scale, one link look, two boxes deep at most, one heading scale, text contrast), equal edges, real photographs, and no violet or lavender as a design colour (flower photos keep theirs). Its website-only parts (page kinds, dealers, hero and one section per screen, no labels under pictures, footer credits, `consistency.mjs`) do not apply to app screens. Where it clashes with the user's rules, the user's rules win: motion follows Emil's skills, not Taste's motion layer or hover rules; checks use the Playwright MCP; the legendary card keeps the spec's tilt-driven holographic effect despite Taste's no-tilt rule.
- **Impeccable** (v4.8) is retired from design work. `PRODUCT.md` stays as product context. Do not run its critique/audit/polish on the Taste direction (two general design skills with different rules): end-of-phase design checks are Taste's checklist where it fits an app, the Playwright checks and accessibility tests; ask the user before bringing Impeccable back. Its launcher `.claude/skills/impeccable/scripts/impeccable.cmd` uses an engine binary downloaded on 2026-11-06 with the user's OK.
- **Motion:** Emil Kowalski's skills only (`animate`, `choreograph`, `apple-design`, `animation-performance`, `emil-design-eng`). Do not use Impeccable's `animate` command (overlapping rules). Also `mobile-native` for native feel on phones, `break-ui` for worst-case data.
- `review-animations`, `prototype` and `pick-ui-library` cannot be model-invoked. Before closing a phase with animations: ask the user to run `/review-animations`, or read `.claude/skills/review-animations/SKILL.md` and `STANDARDS.md` and apply them, saying so.
- Never combine two general design skills with conflicting rules: ask.
- State in one line which skill is in use at every UI step.
- **Playwright MCP** (`.mcp.json`, verified 2026-11-06): after every UI change check 390×844 and 360×800, light and dark; fix visual issues; also test WebKit (the MCP runs Chrome: use the E2E `iphone` project or a short script with `@playwright/test`'s `webkit`). Real camera and real iOS cannot be tested here: give the user a manual checklist. Screenshots land in `.playwright-mcp/` (git-ignored).
- Skills are installed per project in `.claude/skills/` (sources and hashes in `skills-lock.json`); that folder is git-ignored like a dependency folder.

## Decisions (2026-11-06)

- **Stack:** Vite + React + TS, Tailwind CSS v4, Motion (ex Framer Motion), Dexie + `navigator.storage.persist()`, vite-plugin-pwa (Workbox), ONNX Runtime Web in a Web Worker (WASM-SIMD by default; WebGPU only if benchmarks justify it), Vitest + fake-indexeddb, Playwright Test (Android/Chromium and iPhone/WebKit projects).
- **Hosting:** GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`), public repo. Repository https://github.com/JonnyJr-02/floradeck (public), site https://jonnyjr-02.github.io/floradeck/ (Pages source: GitHub Actions, enabled by the user on 2026-11-08). No `gh` CLI and the unauthenticated GitHub API allows 60 requests/hour: check deploys by fetching the site, not by polling the API. Commits keep the global git identity and email (user's choice on 2026-11-07: no noreply address, no history rewrite). Fallback: Cloudflare Pages.
- **Catalog:** 8 albums × 20–30 species (209), exactly 1 rare per album, plus 1 secret legendary species (Cypripedium calceolus); all orchids live in the "Orchidee spontanee" album. Only colourful wild flowers and plants (flowers or bright berries) that catch the eye on walks and hikes: on 2026-11-07 the user dropped the "Giardini, parchi e balconi" and "Orto, frutteto ed erbe aromatiche" albums (borage moved to a wild album). On 2026-11-08 the user also dropped rosemary (small pale flowers on a shrub that reads green). History: 8 × 10–12 → 10 × 20–30 (2026-11-06) → 8 × 20–30 wild (2026-11-07) → 209 (2026-11-08). The 2026-11-08 model still has a rosemary class: in phase 7 a class missing from the catalogue counts as "not in the catalogue"; the next `pack` turns its photos into altro. Species widespread across Italy (user's region unknown). `catalog/` is the single source of truth: schema-validated, read by `ml/`, imported by the app at build time.
- **Catalog data:** `species.json` is generated, never edited by hand. Months (`bloomMonths`, with `phenology` flowering/fruiting), `regions` (north/centre/south shares corrected for observer density), `altitude` (5th–95th percentile of EU-DEM elevations at iNaturalist observation points; wild species only) and `family` come from data. Habitat, size, description, fun fact and safety flags are hand-written in `catalog/texts/<album>.json` and stay `textStatus: "da-verificare"` until the user ticks them in the review page. `protected`: true = legally protected, null = possibly protected in some regions (to verify), false = no. `toxic`: true shows a warning; false only means no warning, the app never claims a plant is edible. "Fotografala, non raccoglierla" is shown for every non-cultivated species, stronger for protected ones.
- **Illustrations:** public-domain botanical plates (Thomé, Sturm, Köhler, Curtis's Botanical Magazine, Sibthorp) from Wikimedia Commons/BHL, with attributions; empty-slot silhouettes derived by script.
- **ML:** approach A: fine-tune a mobile CNN with timm (bake-off: MobileNetV4-M, EfficientNet-B0, ConvNeXt-Nano) on catalog species plus an "altro" class. The model also outputs its penultimate embedding for a prototype-distance OOD score (idea from approach C). Targets: < 30 MB, < 2 s, top-1 ≥ 85 %, top-3 ≥ 95 % on the catalog test set. With ~210 classes these targets are tight: after the phase-6 confusion analysis, merge confusable classes to group/genus level or swap them. Species removed from the catalogue keep 100 images each in "altro" (`altro/excluded`), so the app says "not in the catalogue" for garden and vegetable plants.
- **Data:** iNaturalist research grade, CC0/CC-BY/CC-BY-NC, Italy first then Europe, prefer phenology annotations (flowering/fruiting); attributions CSV. Split by observation; test set also grouped by observer. No hue jitter in augmentation (colour is the key feature). Cultivated plants are always "casual" on iNaturalist, so garden species need casual observations too; genus/group classes can also use observations identified only to genus.
- **Dataset selection (phase 6a, `ml/`):** per class, newest first, Italy → Europe → world; research grade, plus community-agreed genus/group-level IDs (group/genus classes) and captive casual (cultivated); annotated phase first, then unannotated from `bloomMonths`; 300–500 observations (800 until 2026-11-07, lowered by the user to cut the download; the 500 selection is a prefix of the 800 one, so raising it later only adds photos), ≤ 20 per observer; 1 photo per observation (2 below 300). Recent iNaturalist "medium" files are JPEG quality ~100 (~145 KB on average), so downloads are re-encoded at quality 90. Dry run of 2026-11-07: 148k images, ~22 GB to download (~4.4 h at 5 GB/h), ~9 GB stored; only `crocus-sativus` stays below 300 observations. Data lives in the main checkout, `C:\Users\jjarb\floradeck\ml\data\` (git-ignored), never in a worktree (worktrees get deleted): from a worktree pass `--data-dir C:\Users\jjarb\floradeck\ml\data`. "Altro" = lookalikes + 300 common Italian plants + catalogue species without flowers/fruits + non-plant iNaturalist taxa + Open Images scenes without plants (CC BY 2.0).
- **Calibration:** temperature scaling; thresholds on in- and out-of-catalog validation data (`ml/floradeck_ml/calibration.py`): card when cards stay ≥ 98 % right, "Non sono sicuro" + top 3 below it while the right species is among the 3 for ≥ 50 % of those photos and ≤ 10 % of non-catalogue photos land there. A card is added only above `accept` or when the user confirms one of the 3 proposals (SPEC). Parity test checks model and preprocessing separately. `ml/` exports `labels.json` plus metadata (temperature, thresholds, normalisation, version): no hard-coded constants in the app.
- **Recognition UX:** confidence ≥ threshold → card; grey zone → "Non sono sicuro" + top-3 to confirm; "altro"/OOD → not in catalog + shooting tips. 2–3 crop TTA. `MockRecognizer` with forceable scenarios (sure / unsure / out of catalog) behind the same interface until the real model ships.
- **Photos:** long side 1080 px; WebP when the browser can encode it, else JPEG (runtime check); separate thumbnail.
- **Location:** opt-in only, rounded to ~1 km, nearest comune computed offline (ISTAT list).
- **Gifts and couple:** serverless first. A gift is a link with the payload in the URL fragment (or a `.floradeck` file): species id, compressed photo (~15–20 KB), date, sender, message, unique `giftId`. On iPhone the link opens in Safari, whose storage is separate from the Home-screen app → bridge "Copia regalo" → "Incolla regalo". QR codes for pairing and progress snapshots (≈3 KB max, no photos). The duplicate leaves the sender's collection when the gift is created (resend = same `giftId`); the receiver stores imported `giftId`s, also in backups. Partner albums are read-only snapshots; the couple album is the union. Optional backend in phase 8 (Supabase free pauses idle projects; also evaluate Cloudflare Workers + D1).
- **Order:** backup export/import moved to phase 5; ML scripts start right after phase 1 and run in parallel with the UI phases (the user runs the Kaggle training); weekly challenges in phase 9.
- **Design (phase 2, closed 2026-11-07):** the user picked mockup C "Foto in primo piano" (`docs/mockups/taste/`): full-bleed photo with a rounded bottom edge, Fraunces titles and Figtree text, pill buttons and chips, rounded tiles, album filter chips (Tutte / Trovate / Da trovare / In fiore ora), the rare slot as an accent ring with a "Rara" pill, "Non sono sicuro" as a bottom sheet over the camera. Still to add to C because the spec asks for them: light paper texture, gold-leaf border for rare cards, light holographic legendary card. Known risk of C: it can feel like any recognition app, so the game feel must come from motion (card unpacking, slot filling, petal confetti) and from the rarity treatments. Mockups A "Tavola" and B "Figurina" (Impeccable) stay in `docs/mockups/` as references only. `PRODUCT.md` holds the product context (users, purpose, principles, accessibility). The app is a surprise for the partner: the first opening should feel like a present.
- **App shell (phase 3, 2026-11-07):** `app/` is a standalone npm project (Vite 8, React 19, TypeScript 7, Tailwind 4, vite-plugin-pwa 2, Vitest 5, Playwright 1.65). Routing with wouter on real paths under `import.meta.env.BASE_URL` (the URL fragment stays free for gift payloads); `404.html` is a copy of the app so GitHub Pages deep links work before the service worker. Base path `/floradeck/`; CI passes `BASE_PATH=/<repository>/`. Tabs: Esplora (`/`, full-screen camera stand-in), Album, Diario, Coppia; Impostazioni and Installa are secondary screens with Back and no tab bar. Theme preference in localStorage `floradeck:theme`, applied by an inline script before the first paint; `theme-color` follows the theme (a unit test keeps it in step with `--p-bg` and index.html) and turns dark on the camera screen. Fonts from @fontsource-variable, Latin subsets only (Fraunces full axes, Figtree normal and italic), precached. Service worker in prompt mode: «È pronta una nuova versione» with «Aggiorna», «FloraDeck ora funziona anche senza rete» once, hourly update check. Dexie schema v1 (cards, photos, settings, importedGifts with unique giftId) is provisional until phase 4 stores real cards; `navigator.storage.persist()` is requested at start-up and shown in Impostazioni. Install guide at `/installa` (the user agent picks which platform comes first, for instructions only) and a dismissible install card on Esplora, with the iOS warning that Safari and the Home-screen app keep separate data. On iPhone, text follows Dynamic Type through `font: -apple-system-body` (iOS only; needs a real device to check). `robots.txt` and `noindex` keep the public site out of search engines. Motion so far: press feedback (scale 0.97, 160 ms, `--ease-out`) and the status toast (400 ms `ease`), both from the animate skill recipes with reduced-motion variants; reviewed against review-animations STANDARDS.md on 2026-11-07.
- **Capture (phase 4, 2026-11-08):** Esplora runs the rear camera with getUserMedia; it starts on its own only after the first «Apri la fotocamera» succeeded (localStorage `floradeck:camera-allowed`), so the first opening shows no permission prompt, and it stops when the app goes to the background. Gallery picker (file input) for photos already taken and as the fallback when the camera is blocked or missing. Photos: 1080 px long side + 480 px thumbnail, WebP if the canvas encodes it, else JPEG, stored as ArrayBuffer + type (WebKit refuses Blobs in IndexedDB in private and ephemeral contexts). `src/recognition/`: `Recognizer` interface, `decide()` = the rule of `ml/floradeck_ml/calibration.py` fed by labels.json-shaped metadata, `MockRecognizer` running invented probabilities through the same rule; scenario forced in Impostazioni → «Riconoscimento di prova» (localStorage `floradeck:mock-scenario`: random/sure/unsure/out; the section disappears with the real model). A card is saved with its photo in one transaction when the recogniser is sure or the user picks one of the top 3 (`identifiedBy`, `confidence`, `recognizer`, `source` on the card); a second card of a species is a duplicate. «Non sono sicuro» and «Non la trovo nel catalogo» are bottom sheets on a modal `<dialog>`. Card screen `/carta/:id` (mockup C): photo, name, rarity/number/album chips, date, description, «Metti nell'album» (goes to Album for now; slot filling in phase 5), species sheet with months, habitat, altitude, regions, size, safety notes and «Testi della scheda ancora da verificare». Motion (animate skill, checked against review-animations STANDARDS.md): sheet 500 ms `--ease-drawer` transition; unpacking on arrival only (history state `reveal`, cleared after) = card 500 ms ease-out from scale 0.94, photo opening out of a poppy-red wrapper with clip-path 700 ms ease-in-out, text stagger 60 ms; camera feed fades in 250 ms; reduced motion keeps only fades. Location on cards is not in yet (opt-in, later). E2E: Chrome's fake camera on the android project; WebKit here has no camera and tests the gallery fallback.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup, plan, CLAUDE.md, repo | ✅ 2026-11-06 |
| 1 | Catalog: albums + species list → user validates → `species.json`, schema, review sheet; iNat photo counts per species | ✅ 2026-11-06 (texts still to verify) |
| 2 | Design: `impeccable teach`, 3 static mockups (2 Impeccable, 1 Taste) → user picks | ✅ 2026-11-07: direction C (Taste) |
| 3 | PWA skeleton: nav, themes, offline fonts, Dexie, offline, install guide + iOS warning, deploy | ✅ 2026-11-08: deployed to GitHub Pages |
| 4 | Camera + mock recognizer + shot → card → collection, unpacking animation | ✅ 2026-11-08 (phone checks pending) |
| 5 | Albums, rarity, duplicates, cover photo, diary, "In fiore questo mese", celebrations, legendary card, backup | |
| 6 | ML pipeline, Kaggle notebook, evaluation, ONNX export (scripts start after phase 1) | ✅ 2026-11-08: EfficientNet-B0 fp32 17 MB, test top-1 93.6 %, top-3 98.1 %; thresholds recalibrated locally (cards 98.1 % right, 6 % of catalogue photos to the top-3 choice); model zip on the user's Desktop (`floradeck-model-ricalibrato.zip`) |
| 7 | Real model in the app, threshold calibration, tests on real photos | |
| 8 | Profiles, gifts, couple features; optional backend | |
| 9 | Polish (Taste checklist, accessibility, animation review), device tests, weekly challenges, optional Capacitor APK | |

## Commands

Catalog (Python 3.13, standard library only; run from the repo root):
- `py -3.13 catalog/scripts/inat_stats.py`: fetch iNaturalist stats for `catalog/proposal/candidates.json` (responses cached in `catalog/.cache/`, about 1 request/s; `--only <key> ...` refreshes single entries).
- `py -3.13 catalog/scripts/render_proposal.py`: regenerate `catalog/proposta-specie.md` from the candidates and the stats.
- `py -3.13 catalog/scripts/build_catalog.py`: build `catalog/species.json` and `catalog/albums.json` (candidates + stats + `texts/` + optional `review/status.json`).
- `py -3.13 catalog/scripts/validate_catalog.py`: check the built catalogue (errors fail; warnings list what to complete).
- `py -3.13 -m unittest discover -s catalog/scripts -p "test_*.py"`: catalog unit tests.
- `py -3.13 catalog/scripts/build_review.py`: build the review page `catalog/review/index.html` (open it in a browser; its export goes to `catalog/review/status.json`).
- To change a species: edit `catalog/proposal/candidates.json` (and its text in `catalog/texts/`), run `inat_stats.py --only <key>`, then build, validate, review.

Design mockups: `py -3.13 -m http.server 8766 --bind 127.0.0.1 --directory docs/mockups`, then open http://127.0.0.1:8766/ (the Playwright MCP blocks `file:` URLs). Photos and fonts load from the internet.

App (run inside `app/`):
- `npm run dev`: dev server at http://127.0.0.1:5173/floradeck/ (in the desktop app: `preview_start` with "app" from `.claude/launch.json`, a local untracked file).
- `npm run build`: type-check, then the production build with service worker in `app/dist`.
- `npm run preview`: serve the build at http://127.0.0.1:4173/floradeck/.
- `npm test`: unit tests (Vitest, fake-indexeddb). `npm run typecheck`: TypeScript only.
- `npm run e2e`: Playwright on the production build, projects `android` (installed Chrome, Pixel 7) and `iphone` (WebKit, iPhone 15). One worker, because WebKit on Windows crashes when several run at once; the axe accessibility scans run on `android` only.
- `npm run icons`: regenerate the PWA icons in `public/` from `public/favicon.svg` (commit the PNGs).
- Deploy: every push to `main` runs `.github/workflows/deploy.yml` (unit tests, build, GitHub Pages). One-time setup on GitHub: Settings → Pages → Source: GitHub Actions.

ML dataset (Python 3.13 venv in `ml/.venv`, Pillow + numpy; run from the repo root; details in `ml/README.md`, settings in `ml/dataset.toml`):
- `py -3.13 -m venv ml\.venv` then `ml\.venv\Scripts\python -m pip install -e ml`: set up the venv.
- `ml\.venv\Scripts\python -m floradeck_ml fetch --dry-run`: select iNaturalist observations for every class and "altro" (API cached in `ml/data/cache/`, ~1 request/s), estimate the download, write `ml/reports/dataset-plan.md` and `ml/reports/altro-sources.md`; downloads no image. `--only <class> ...` for a few classes.
- `ml\.venv\Scripts\python -m floradeck_ml fetch`: the same selection, then the resumable download (≤ 5 GB/hour, ≤ 24 GB per run) and `ml/data/attributions.csv`; `... download` resumes from the manifest.
- `ml\.venv\Scripts\python -m floradeck_ml clean`: decode check, size filter, pHash dedupe, observer-grouped split → `ml/data/dataset.csv`, `ml/data/classes.json`.
- `ml\.venv\Scripts\python -m floradeck_ml pack`: bundle for the Kaggle dataset → `ml/data/kaggle/` (current catalogue order; removed species → altro; images shrunk to a 320 px short side, ~7 GB in ~2 GB uncompressed zips; stops before the disk fills). Rerun after any catalogue change.
- `ml\.venv\Scripts\python ml/kaggle/model_outputs.py <model dir> ml\data\kaggle <out.npz>` then `... ml/kaggle/recalibrate.py <model dir> <out.npz> <new dir>`: new thresholds for a trained model without retraining (~1 h CPU for the model outputs).
- `py -3.13 ml/kaggle/make_notebook.py`: regenerate `ml/kaggle/floradeck-train.ipynb` from `ml/kaggle/floradeck_train.py` (edit the .py). Kaggle steps and outputs: `ml/kaggle/README.md`.
- `ml\.venv\Scripts\python -m unittest discover -s ml\tests`: dataset pipeline tests; `ml\.venv\Scripts\python -m ruff check ml` lints (dev extra: `pip install -e "ml[dev]"`).

## Structure

```
floradeck/
├─ app/              PWA (Vite + React + TS), from phase 3
│  ├─ src/domain/      pure logic: collection, duplicates, gifts, seasonality (fully unit-tested)
│  ├─ src/db/          Dexie schema, migrations, backup
│  ├─ src/recognition/ Recognizer interface, decision rule, mock (ONNX worker and preprocessing in phase 7)
│  ├─ src/photo/       resize and encode photos, thumbnails
│  ├─ src/features/    explore (camera, result sheets) · card · albums · journal · couple · settings
│  ├─ src/ui/          design system components, tokens, themes, fonts
│  ├─ src/pwa/         service worker registration, install prompt, platform checks
│  ├─ e2e/             Playwright tests (shell, PWA/offline, capture flow, axe accessibility)
│  └─ public/          icons generated from favicon.svg, robots.txt
├─ catalog/
│  ├─ species.json, albums.json   generated catalogue (do not edit)
│  ├─ proposal/        candidates.json (species choice), inat_stats.json (data)
│  ├─ texts/           hand-written Italian texts per album
│  ├─ schema/          species.schema.json
│  ├─ review/          index.html (review page), status.json (user's checks)
│  ├─ scripts/         stats, build, validate, review, tests
│  └─ proposta-specie.md   the validated proposal (tables with data)
├─ ml/               Python pipeline (phase 6): dataset, Kaggle pack, training notebook
│  ├─ floradeck_ml/    dataset package and CLI (python -m floradeck_ml): selection, download, clean, split
│  ├─ tests/           unit tests (unittest)
│  ├─ kaggle/          training notebook (floradeck_train.py → .ipynb) and Kaggle instructions
│  ├─ dataset.toml     dataset settings (targets, tiers, altro sources, rate limits, split)
│  ├─ reports/         last full dry run: dataset-plan.md, altro-sources.md (generated)
│  └─ data/            API cache, manifest, images, attributions.csv, dataset.csv (git-ignored)
├─ docs/             SPEC.md, PLAN.md, mockups/ (index.html compares A fmr/, B figurine/, C taste/; photos.json credits)
├─ .claude/skills/   project skills (git-ignored)
├─ .github/workflows/ deploy.yml (GitHub Pages)
├─ .mcp.json         Playwright MCP
├─ skills-lock.json  skill sources and hashes
├─ PRODUCT.md        product context (users, purpose, principles), written with Impeccable
└─ CLAUDE.md
```
