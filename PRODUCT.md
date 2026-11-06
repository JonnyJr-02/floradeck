# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Installable PWA, offline-first: Vite + React + TypeScript, Tailwind CSS v4, Motion, Dexie (IndexedDB), vite-plugin-pwa, hosted on GitHub Pages. Chosen by the user in the spec (`docs/SPEC.md`) and confirmed in `docs/PLAN.md`. Phase-2 design proposals are static HTML/CSS mockups in `docs/mockups/`.

## Users

Exactly two people, a couple: the developer (Android phone, Chrome) and his girlfriend (iPhone, Safari PWA added to the Home screen). No other audience.

- Outdoors, on walks, hikes and trips: one hand, often in bright sun, frequently without signal. They frame a plant, wait for the recognition and collect the card. (Confirmed by the user, 2026-11-06.)
- At home: browsing albums and the diary, looking at the partner's progress, gifting duplicate cards to each other.
- FloraDeck will be a surprise gift for her: her first opening of the app must feel like receiving a present. (Confirmed by the user, 2026-11-06.)

## Product Purpose

A relaxing trading-card ("figurine") game of Italian wild and garden plants. Point the camera at a plant: the app recognises it offline on the phone and shows the Italian common name, the scientific name and a short description. If the species is in the catalogue, it becomes a card with the user's own photo in one of 10 albums (20–30 species each, one rare per album) or the one secret legendary card.

Success means they spend more time outdoors together, learn the plants around them, and enjoy completing albums and gifting each other cards.

## Positioning

Not a plant-identification utility. FloraDeck is a shared, offline, two-player collection made of their own photos, organised in albums with rarity, seasons and gifts between their two phones. Identification is the means; the collection and the couple are the point.

## Operating Context

- Field: live camera viewfinder in sun or shade, one-handed, short sessions, often offline (mountains, coast). Shooting tips: "avvicinati al fiore", "un fiore solo al centro", "luce naturale".
- Recognition is sometimes uncertain: "Non sono sicuro" with the top 3 guesses to confirm, or "not in the catalogue". A card is added only above the confidence threshold or after the user confirms a guess.
- Home: albums with silhouettes for missing species (hint only: colour, habitat, bloom period), progress, diary of discoveries, "In fiore questo mese", the partner's albums read-only, a shared couple album.
- Gifts travel as WhatsApp links, files or QR codes, with a short message ("L'ho trovato pensando a te"); a gift leaves the sender's duplicates and cannot be imported twice.
- Seasons set the pace of the game.

## Capabilities and Constraints

- After the first load everything works in airplane mode (camera, recognition, collection, albums); only syncing between the two needs internet or QR codes.
- Bottom navigation with four items: Esplora (camera), Album, Diario, Coppia.
- All UI copy in Italian.
- Zero budget: no paid services, no developer accounts. iOS Safari limits apply: install guide for "Aggiungi a Home", warning about data eviction for non-installed sites, backup export/import.
- Photos stay on the device; location only with permission and rounded.
- Content: `catalog/species.json` (260 species + 1 legendary) and `catalog/albums.json`. Each species has rarity (comune, non comune, rara, leggendaria), dominant colours, bloom months, habitat, altitude, regions, size, description, fun fact, protection and toxicity flags.
- Protected species show "Fotografala, non raccoglierla" clearly; toxic species show a warning; the app never claims a plant is edible.
- Undecided: what completing all albums unlocks (the legendary card or a graphic theme); weekly challenges (later phase).

## Brand Commitments

- Name: FloraDeck, used in the PWA manifest, title, icon and UI.
- Aesthetic pinned by the spec: modern and elegant, inspired by botanical plates and design magazines, with the playfulness of trading cards. Warm paper/ivory background and a dark mode in midnight blue/anthracite; accent colours taken from the flowers; green used sparingly. An elegant serif for headings (e.g. Fraunces, Cormorant or Playfair Display) and a clean sans for text (e.g. Inter), with fonts bundled for offline use. Cards with rounded corners, a light paper texture and a border that changes with rarity (gold leaf for rare, a light holographic effect for the legendary when the phone tilts, if the sensor is available). Curated micro-animations: the card "unpacking" after recognition, the album slot filling, petal confetti when an album is completed.
- Voice: descriptions are elegant and curious; the game is relaxing, with no penalties and no aggressive notifications.
- Illustrations: public-domain botanical plates (Thomé, Sturm, Köhler, Curtis's Botanical Magazine, Sibthorp) with attributions, planned for the catalogue.

## Evidence on Hand

- `catalog/species.json`, `catalog/albums.json`: real names and texts (texts still marked "da verificare"), data-derived months, regions and altitude.
- No photos, logo, icons or illustrations exist yet, and there are no testimonials or metrics: do not fabricate them. Mockups may use clearly marked placeholder imagery or public-domain botanical plates.

## Product Principles

1. The collection is theirs: their own photos are the hero of every card.
2. Calm over compulsion: no penalties, streaks or nagging; the seasons set the pace.
3. Honest recognition: say "Non sono sicuro" rather than show a wrong species, and let the user confirm.
4. Built for the field: one hand, bright sun, no signal.
5. Made for two: gifts and shared progress are first-class, and her first opening is a gift.

## Accessibility & Inclusion

No specific vision needs reported by the users (2026-11-06). The spec requires adequate contrast (stricter in outdoor sunlight), resizable text and respect for reduced motion. Colour carries meaning in the game (hints, rarity), so it is always paired with text or shape.
