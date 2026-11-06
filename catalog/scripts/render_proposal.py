#!/usr/bin/env python3
"""Render catalog/proposta-specie.md from the candidates and their iNaturalist stats.

Run catalog/scripts/inat_stats.py first. To change the proposal, edit
catalog/proposal/candidates.json, re-run both scripts and review the diff.

Usage (from the repository root):
    py -3.13 catalog/scripts/render_proposal.py
"""

from __future__ import annotations

import json
from pathlib import Path

from catalog_lib import area_shares, compress_months, selected_months

CATALOG_DIR = Path(__file__).resolve().parents[1]
CANDIDATES = CATALOG_DIR / "proposal" / "candidates.json"
STATS = CATALOG_DIR / "proposal" / "inat_stats.json"
OUTPUT = CATALOG_DIR / "proposta-specie.md"

RARITY = {"common": "comune", "uncommon": "non comune", "rare": "**rara**", "legendary": "**leggendaria**"}
LEVEL = {"species": "specie", "group": "gruppo", "genus": "genere"}

ENOUGH_PHOTOS = 300  # open-licence observations considered enough to train a class


def period_cell(stats: dict, phenology: str) -> str:
    months, fallback = selected_months(stats, phenology)
    return (compress_months(months) if months else "—") + ("\\*" if fallback and months else "")


def photo_status(stats: dict) -> str:
    italy = stats.get("itOpen")
    if italy is None:
        return "unknown"
    if italy >= ENOUGH_PHOTOS:
        return "ok"
    elsewhere = max(stats.get("euOpen") or 0, stats.get("worldOpen") or 0)
    return "europe" if elsewhere >= ENOUGH_PHOTOS else "low"


def photo_cell(stats: dict, cultivated: bool) -> str:
    status = photo_status(stats)
    if status == "unknown":
        return "❓"
    mark = {"ok": "✅", "europe": "🟡", "low": "🔴"}[status]
    dagger = "†" if cultivated else ""
    extra = []
    if status != "ok" and stats.get("euOpen") is not None:
        extra.append(f"UE {stats['euOpen']}")
    if status != "ok" and stats.get("worldOpen") is not None:
        extra.append(f"mondo {stats['worldOpen']}")
    return f"{mark} {stats['itOpen']}{dagger}" + (f" ({', '.join(extra)})" if extra else "")


def areas_cell(stats: dict, baseline: dict) -> str:
    shares = area_shares(stats, baseline)
    return " · ".join(map(str, shares)) if shares else "pochi dati"


def name_cell(candidate: dict) -> str:
    return f"**{candidate['commonNameIt']}**<br>*{candidate.get('label') or candidate['taxa'][0]}*"


def notes_cell(candidate: dict, stats: dict) -> str:
    notes = candidate.get("notes", "")
    missing = [t["query"] for t in stats.get("taxa", []) if not t.get("id")]
    if missing:
        notes += f" ⚠ Nome non trovato su iNaturalist: {', '.join(missing)}."
    return notes.strip() or " "


def row(index: int, candidate: dict, stats: dict, baseline: dict) -> str:
    cells = [
        f"{index:02}",
        name_cell(candidate),
        LEVEL[candidate["level"]],
        RARITY[candidate["rarity"]],
        ", ".join(candidate["colors"]),
        period_cell(stats, candidate.get("phenology", "flowering")),
        photo_cell(stats, candidate.get("cultivated", False)),
        areas_cell(stats, baseline),
        notes_cell(candidate, stats),
    ]
    return "| " + " | ".join(cells) + " |"


HEADER = "| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |\n|---|---|---|---|---|---|---|---|---|"


def main() -> int:
    data = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    stats_file = json.loads(STATS.read_text(encoding="utf-8"))
    stats = stats_file["species"]
    baseline = stats_file.get("baselinePlantaeAreas", {})
    albums, candidates = data["albums"], data["candidates"]

    def of(album_id: str, status: str) -> list[dict]:
        return [c for c in candidates if c["album"] == album_id and c["status"] == status]

    main_entries = [c for c in candidates if c["status"] == "main"]
    in_albums = [c for c in main_entries if c["rarity"] != "legendary"]
    lines: list[str] = []
    add = lines.append

    add("# FloraDeck — Proposta di catalogo")
    add("")
    add(
        "> Bozza da validare (fase 1). Generata da `catalog/scripts/render_proposal.py` con i dati "
        f"iNaturalist del {stats_file['fetched']}. Per cambiarla si modifica "
        "`catalog/proposal/candidates.json` e si rigenera."
    )
    add("")
    add("## Come leggerla")
    add("")
    add(
        f"- **{len(albums) - 1} album, {len(in_albums)} specie + 1 leggendaria**, una specie rara per album. "
        f"Dopo ogni album ci sono alcune riserve ({sum(c['status'] == 'reserve' for c in candidates)} in tutto) "
        "per gli scambi."
    )
    add(
        "- **Periodo**: i mesi in cui la pianta viene fotografata in fiore in Italia (con i frutti, per l'album delle bacche), "
        "secondo le annotazioni di iNaturalist. Conta un mese se ha almeno il 15% delle osservazioni del mese di picco "
        "(35% per i frutti, perché l'annotazione comprende anche quelli acerbi). "
        "L'asterisco indica che le annotazioni erano poche e ho usato tutte le osservazioni."
    )
    add(
        "- **Foto**: osservazioni iNaturalist verificate dalla comunità (\"research grade\") in Italia, con foto a licenza "
        "CC0, CC-BY o CC-BY-NC: è il materiale per addestrare il modello. ✅ almeno 300 · 🟡 meno di 300 in Italia ma "
        "almeno 300 in Europa (o nel mondo, per le coltivate) · 🔴 pochi dati. † = conta anche le piante coltivate, che iNaturalist non marca mai come verificate."
    )
    add(
        "- **N · C · S**: dove la si trova in Italia. Nord sopra i 44° N (circa la linea Genova–Ravenna), Centro fino "
        "ai 41,8° N (circa Roma), poi Sud e isole. Le percentuali sono corrette per il numero di osservazioni di piante "
        "in ciascuna area, perché al Nord gli utenti di iNaturalist sono molti di più: 33 · 33 · 33 vuol dire "
        "\"ugualmente frequente ovunque\". Utile per capire cosa trovate vicino a voi."
    )
    add(
        "- **Livello**: *gruppo* o *genere* quando le specie si distinguono solo da vicino; la carta vale per tutto il gruppo."
    )
    add(
        "- **Sosia**: \"→ altro\" significa che il sosia non è in catalogo e il modello lo impara come \"altro\". "
        "\"In catalogo\" significa che il sosia è un'altra carta, quindi il modello deve distinguerle."
    )
    add("")

    add("## Sintesi")
    add("")
    add("| Album | Specie | Comuni / non comuni / rare | Foto ✅ / 🟡 / 🔴 |")
    add("|---|---|---|---|")
    for album in albums:
        entries = of(album["id"], "main")
        if not entries:
            continue
        by_rarity = [sum(c["rarity"] == r for c in entries) for r in ("common", "uncommon", "rare")]
        by_photos = [sum(photo_status(stats.get(c["key"], {})) == s for c in entries) for s in ("ok", "europe", "low")]
        rarity_text = " / ".join(map(str, by_rarity)) if album["id"] != "leggendaria" else "leggendaria"
        add(f"| {album['name']} | {len(entries)} | {rarity_text} | {' / '.join(map(str, by_photos))} |")
    add("")

    weak = [c for c in main_entries if photo_status(stats.get(c["key"], {})) in ("europe", "low")]
    if weak:
        add("Specie con poche foto in Italia: " + ", ".join(
            f"{c['commonNameIt']} ({photo_cell(stats.get(c['key'], {}), c.get('cultivated', False))})" for c in weak
        ) + ".")
        add("")

    for album in albums:
        add(f"## {album['name']}")
        add("")
        add(f"_{album['note']}_")
        add("")
        add(HEADER)
        for index, candidate in enumerate(of(album["id"], "main"), start=1):
            add(row(index, candidate, stats.get(candidate["key"], {}), baseline))
        add("")
        reserves = of(album["id"], "reserve")
        if reserves:
            add("**Riserve**")
            add("")
            add(HEADER)
            for index, candidate in enumerate(reserves, start=1):
                add(row(index, candidate, stats.get(candidate["key"], {}), baseline))
            add("")

    synonyms = [
        (t["query"], t["name"])
        for c in candidates
        for t in stats.get(c["key"], {}).get("taxa", [])
        if t.get("synonym")
    ]
    add("## Note tecniche")
    add("")
    if synonyms:
        add(
            "- Nomi che iNaturalist tratta come sinonimi (i conteggi li includono): "
            + "; ".join(f"*{query}* → *{name}*" for query, name in synonyms)
            + "."
        )
    add(
        "- I conteggi sono osservazioni, non foto: un'osservazione ha di solito 1–4 foto. Per gli album di genere o gruppo "
        "nella fase ML si potranno usare anche osservazioni identificate solo a livello di genere."
    )
    add("- Il dettaglio per mese e per area è in `catalog/proposal/inat_stats.json`.")
    add("")

    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {OUTPUT.relative_to(CATALOG_DIR.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
