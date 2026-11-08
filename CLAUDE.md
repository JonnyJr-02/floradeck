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
- **Catalog:** 10 albums × 20–30 species (about 260; the user changed this from 8 × 10–12 on 2026-11-06), exactly 1 rare per album, plus 1 secret legendary species (Cypripedium calceolus). Albums added: "Orchidee spontanee" and "Orto, frutteto ed erbe aromatiche"; all orchids live in the orchid album. Species widespread across Italy (user's region unknown). `catalog/` is the single source of truth: schema-validated, read by `ml/`, imported by the app at build time.
- **Catalog data:** `species.json` is generated, never edited by hand. Months (`bloomMonths`, with `phenology` flowering/fruiting), `regions` (north/centre/south shares corrected for observer density), `altitude` (5th–95th percentile of EU-DEM elevations at iNaturalist observation points; wild species only) and `family` come from data. Habitat, size, description, fun fact and safety flags are hand-written in `catalog/texts/<album>.json` and stay `textStatus: "da-verificare"` until the user ticks them in the review page. `protected`: true = legally protected, null = possibly protected in some regions (to verify), false = no. `toxic`: true shows a warning; false only means no warning, the app never claims a plant is edible. "Fotografala, non raccoglierla" is shown for every non-cultivated species, stronger for protected ones.
- **Illustrations:** public-domain botanical plates (Thomé, Sturm, Köhler, Curtis's Botanical Magazine, Sibthorp) from Wikimedia Commons/BHL, with attributions; empty-slot silhouettes derived by script.
- **ML:** approach A: fine-tune a mobile CNN with timm (bake-off: MobileNetV4-M, EfficientNet-B0, ConvNeXt-Nano) on catalog species plus an "altro" class. The model also outputs its penultimate embedding for a prototype-distance OOD score (idea from approach C). Targets: < 30 MB, < 2 s, top-1 ≥ 85 %, top-3 ≥ 95 % on the catalog test set. With ~260 classes these targets are tight: after the phase-6 confusion analysis, merge confusable classes to group/genus level or swap them. Species whose card covers flowers and fruits (e.g. Punica) train on both phases.
- **Data:** iNaturalist research grade, CC0/CC-BY/CC-BY-NC, Italy first then Europe, prefer phenology annotations (flowering/fruiting); attributions CSV. Split by observation; test set also grouped by observer. No hue jitter in augmentation (colour is the key feature). Cultivated plants are always "casual" on iNaturalist, so garden species need casual observations too; genus/group classes can also use observations identified only to genus.
- **Calibration:** temperature scaling; threshold from a risk–coverage curve on in- and out-of-catalog validation data. Parity test checks model and preprocessing separately. `ml/` exports `labels.json` plus metadata (temperature, thresholds, normalisation, version): no hard-coded constants in the app.
- **Recognition UX:** confidence ≥ threshold → card; grey zone → "Non sono sicuro" + top-3 to confirm; "altro"/OOD → not in catalog + shooting tips. 2–3 crop TTA. `MockRecognizer` with forceable scenarios (sure / unsure / out of catalog) behind the same interface until the real model ships.
- **Photos:** long side 1080 px; WebP when the browser can encode it, else JPEG (runtime check); separate thumbnail.
- **Location:** opt-in only, rounded to ~1 km, nearest comune computed offline (ISTAT list).
- **Gifts and couple:** serverless first. A gift is a link with the payload in the URL fragment (or a `.floradeck` file): species id, compressed photo (~15–20 KB), date, sender, message, unique `giftId`. On iPhone the link opens in Safari, whose storage is separate from the Home-screen app → bridge "Copia regalo" → "Incolla regalo". QR codes for pairing and progress snapshots (≈3 KB max, no photos). The duplicate leaves the sender's collection when the gift is created (resend = same `giftId`); the receiver stores imported `giftId`s, also in backups. Partner albums are read-only snapshots; the couple album is the union. Optional backend in phase 8 (Supabase free pauses idle projects; also evaluate Cloudflare Workers + D1).
- **Order:** backup export/import moved to phase 5; ML scripts start right after phase 1 and run in parallel with the UI phases (the user runs Colab training); weekly challenges in phase 9.
- **Design (phase 2, closed 2026-11-07):** the user picked mockup C "Foto in primo piano" (`docs/mockups/taste/`): full-bleed photo with a rounded bottom edge, Fraunces titles and Figtree text, pill buttons and chips, rounded tiles, album filter chips (Tutte / Trovate / Da trovare / In fiore ora), the rare slot as an accent ring with a "Rara" pill, "Non sono sicuro" as a bottom sheet over the camera. Still to add to C because the spec asks for them: light paper texture, gold-leaf border for rare cards, light holographic legendary card. Known risk of C: it can feel like any recognition app, so the game feel must come from motion (card unpacking, slot filling, petal confetti) and from the rarity treatments. Mockups A "Tavola" and B "Figurina" (Impeccable) stay in `docs/mockups/` as references only. `PRODUCT.md` holds the product context (users, purpose, principles, accessibility). The app is a surprise for the partner: the first opening should feel like a present.
- **App shell (phase 3, 2026-11-07):** `app/` is a standalone npm project (Vite 8, React 19, TypeScript 7, Tailwind 4, vite-plugin-pwa 2, Vitest 5, Playwright 1.65). Routing with wouter on real paths under `import.meta.env.BASE_URL` (the URL fragment stays free for gift payloads); `404.html` is a copy of the app so GitHub Pages deep links work before the service worker. Base path `/floradeck/`; CI passes `BASE_PATH=/<repository>/`. Tabs: Esplora (`/`, full-screen camera stand-in), Album, Diario, Coppia; Impostazioni and Installa are secondary screens with Back and no tab bar. Theme preference in localStorage `floradeck:theme`, applied by an inline script before the first paint; `theme-color` follows the theme (a unit test keeps it in step with `--p-bg` and index.html) and turns dark on the camera screen. Fonts from @fontsource-variable, Latin subsets only (Fraunces full axes, Figtree normal and italic), precached. Service worker in prompt mode: «È pronta una nuova versione» with «Aggiorna», «FloraDeck ora funziona anche senza rete» once, hourly update check. Dexie schema v1 (cards, photos, settings, importedGifts with unique giftId) is provisional until phase 4 stores real cards; `navigator.storage.persist()` is requested at start-up and shown in Impostazioni. Install guide at `/installa` (the user agent picks which platform comes first, for instructions only) and a dismissible install card on Esplora, with the iOS warning that Safari and the Home-screen app keep separate data. On iPhone, text follows Dynamic Type through `font: -apple-system-body` (iOS only; needs a real device to check). `robots.txt` and `noindex` keep the public site out of search engines. Motion so far: press feedback (scale 0.97, 160 ms, `--ease-out`) and the status toast (400 ms `ease`), both from the animate skill recipes with reduced-motion variants; reviewed against review-animations STANDARDS.md on 2026-11-07.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup, plan, CLAUDE.md, repo | ✅ 2026-11-06 |
| 1 | Catalog: albums + species list → user validates → `species.json`, schema, review sheet; iNat photo counts per species | ✅ 2026-11-06 (texts still to verify) |
| 2 | Design: `impeccable teach`, 3 static mockups (2 Impeccable, 1 Taste) → user picks | ✅ 2026-11-07: direction C (Taste) |
| 3 | PWA skeleton: nav, themes, offline fonts, Dexie, offline, install guide + iOS warning, deploy | ✅ 2026-11-08: deployed to GitHub Pages |
| 4 | Camera + mock recognizer + shot → card → collection, unpacking animation | |
| 5 | Albums, rarity, duplicates, cover photo, diary, "In fiore questo mese", celebrations, legendary card, backup | |
| 6 | ML pipeline, Colab notebook, evaluation, ONNX export (scripts start after phase 1) | |
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

Training commands are added in phase 6.

## Structure

```
floradeck/
├─ app/              PWA (Vite + React + TS), from phase 3
│  ├─ src/domain/      pure logic: collection, duplicates, gifts, seasonality (fully unit-tested)
│  ├─ src/db/          Dexie schema, migrations, backup
│  ├─ src/recognition/ Recognizer interface, mock, ONNX worker, preprocessing
│  ├─ src/features/    explore · albums · journal · couple · settings
│  ├─ src/ui/          design system components, tokens, themes, fonts
│  ├─ src/pwa/         service worker registration, install prompt, platform checks
│  ├─ e2e/             Playwright tests (shell, PWA/offline, axe accessibility)
│  └─ public/          icons generated from favicon.svg, robots.txt
├─ catalog/
│  ├─ species.json, albums.json   generated catalogue (do not edit)
│  ├─ proposal/        candidates.json (species choice), inat_stats.json (data)
│  ├─ texts/           hand-written Italian texts per album
│  ├─ schema/          species.schema.json
│  ├─ review/          index.html (review page), status.json (user's checks)
│  ├─ scripts/         stats, build, validate, review, tests
│  └─ proposta-specie.md   the validated proposal (tables with data)
├─ ml/               Python pipeline: download, clean, split, train, eval, export; Colab notebook (phase 6)
├─ docs/             SPEC.md, PLAN.md, mockups/ (index.html compares A fmr/, B figurine/, C taste/; photos.json credits)
├─ .claude/skills/   project skills (git-ignored)
├─ .github/workflows/ deploy.yml (GitHub Pages)
├─ .mcp.json         Playwright MCP
├─ skills-lock.json  skill sources and hashes
├─ PRODUCT.md        product context (users, purpose, principles), written with Impeccable
└─ CLAUDE.md
```
