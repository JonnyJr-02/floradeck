# catalog

Single source of truth for albums and species, read by `ml/` and imported by the app at build time.

- `species.json`, `albums.json`: the generated catalogue (do not edit by hand).
- `proposal/candidates.json`: which species are in the game, with names, rarity and colours; `proposal/inat_stats.json`: iNaturalist data behind it.
- `texts/<album>.json`: hand-written Italian texts and safety flags, marked "da verificare" until checked.
- `schema/species.schema.json`: the data model; `scripts/validate_catalog.py` adds the cross-checks.
- `review/index.html`: the review page (open it in a browser); its export goes to `review/status.json`.

Commands are listed in the root `CLAUDE.md`.
