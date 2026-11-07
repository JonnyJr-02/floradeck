"""Markdown reports from plan.json (in Italian: they are read by the players)."""

from __future__ import annotations

import math
import re
from collections import defaultdict
from typing import Any

PLACE_LABEL = {"italy": "IT", "europe": "EU", "world": "mondo"}
SOURCE_LABEL = {
    "altro/lookalike": "Sosia fuori catalogo",
    "altro/common": "Piante comuni in Italia",
    "altro/leaves": "Specie del catalogo senza fiori né frutti",
    "altro/nonplant": "Non piante (iNaturalist)",
    "altro/openimages": "Scene senza piante (Open Images)",
}
SOURCE_ORIGIN = {
    "altro/lookalike": "iNaturalist, research grade; Italia → Europa → mondo; prima le foto annotate in fiore/frutto",
    "altro/common": "iNaturalist, specie vascolari più osservate in Italia (research grade) fuori dal catalogo",
    "altro/leaves": "iNaturalist, specie del catalogo con l'annotazione \"No Flowers or Fruits\"",
    "altro/nonplant": "iNaturalist: funghi, uccelli, mammiferi, rettili, anfibi, molluschi (niente insetti e ragni)",
    "altro/openimages": "Open Images V7, validation: immagini senza etichette di piante",
}
# Stored size / downloaded size after the quality-90 re-encoding (download.prepare_image),
# measured on 42 iNaturalist "medium" photos on 2026-11-06 (163 KB -> 66 KB on average).
STORED_SHARE = 0.40
LICENSE_NOTE = {
    "inaturalist": "CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto)",
    "openimages": "CC BY 2.0 (foto Flickr); etichette CC BY 4.0 (Google)",
}


def _size_for(source: str, sizes: dict[str, Any]) -> float | None:
    key = "openimages" if source == "altro/openimages" else "inaturalist"
    return (sizes.get(key) or {}).get("mean")


def _bytes(selection: dict[str, Any], sizes: dict[str, Any]) -> float:
    mean = _size_for(selection["source"], sizes)
    return selection["images"] * mean if mean else 0.0


def _gb(value: float) -> str:
    return f"{value / 1e9:.1f} GB"


def _mb(value: float) -> str:
    return f"{value / 1e6:.0f}"


def _uncertainty(images: int, stats: dict[str, Any] | None) -> float:
    """About two standard errors of the estimated total, from the sample spread."""
    if not stats or not stats.get("sample") or stats.get("stdev") is None:
        return 0.0
    return 2.0 * images * stats["stdev"] / math.sqrt(stats["sample"])


def _skip_reason_it(reason: str) -> str:
    """plan.json keeps the English reason; the report speaks Italian."""
    if reason.startswith("already inside catalogue class "):
        return "è già compreso nella classe " + ", ".join(
            f"`{name.strip()}`" for name in reason.removeprefix("already inside catalogue class ").split(",")
        )
    if reason == "not found on iNaturalist":
        return "non trovato su iNaturalist"
    return reason


def _shared(selection: dict[str, Any]) -> int:
    match = re.search(r"(\d+) observations already used by another class", selection.get("note") or "")
    return int(match.group(1)) if match else 0


def _flags(selection: dict[str, Any]) -> str:
    flags = []
    if selection["belowMin"]:
        flags.append(f"sotto {selection['targetMin']}")
    if selection["byPlace"].get("world"):
        flags.append("foto extra-europee")
    if selection["relaxed"]:
        flags.append(f"{selection['relaxed']} oltre il tetto per osservatore")
    fallback = sum(t["taken"] for t in selection["tiers"] if t["fallback"])
    if fallback:
        flags.append(f"{fallback} senza conferma della comunità")
    quality = selection["byQuality"]
    casual = quality.get("casual", 0)
    if casual:
        flags.append(f"{casual} casual coltivate")
    exact = sum(n for q, n in quality.items() if q.endswith("-level"))
    if exact:
        flags.append(f"{exact} identificate solo al genere/gruppo")
    shared = _shared(selection)
    if shared:
        flags.append(f"{shared} già usate da un'altra classe (foto o osservazione condivisa)")
    return "; ".join(flags)


def render_report(doc: dict[str, Any]) -> str:
    sizes = doc.get("sizes") or {}
    settings = doc["settings"]
    selections = doc["selections"]
    catalog = [s for s in selections if s["source"] == "catalog"]
    altro = [s for s in selections if s["source"] != "catalog"]
    hourly = settings["download"]["max_gb_per_hour"]
    daily = settings["download"]["max_gb_per_day"]
    target_min = settings["classes"]["target_min"]
    target_max = settings["classes"]["target_max"]

    def totals(rows: list[dict[str, Any]]) -> tuple[int, int, float, float]:
        observations = sum(r["observations"] for r in rows)
        images = sum(r["images"] for r in rows)
        size = sum(_bytes(r, sizes) for r in rows)
        inat_images = sum(r["images"] for r in rows if r["source"] != "altro/openimages")
        oi_images = images - inat_images
        error = math.hypot(_uncertainty(inat_images, sizes.get("inaturalist")), _uncertainty(oi_images, sizes.get("openimages")))
        return observations, images, size, error

    cat_obs, cat_img, cat_size, cat_err = totals(catalog)
    alt_obs, alt_img, alt_size, alt_err = totals(altro)
    all_obs, all_img, all_size, all_err = totals(selections)
    hours = all_size / 1e9 / hourly if hourly else 0.0

    lines = [
        "# Dataset FloraDeck: piano del download (dry run)",
        "",
        f"Generato il {doc['created'].replace('T', ' alle ')}"
        + (" — **esecuzione parziale** (solo alcune classi)" if doc.get("partial") else "")
        + ". Nessuna immagine scaricata: solo metadati (risposte dell'API di iNaturalist, indice di Open Images "
        "e richieste HEAD su un campione di foto per stimarne il peso).",
        "",
        "## Riepilogo",
        "",
        "| | Classi | Osservazioni | Immagini | Download stimato |",
        "|---|---:|---:|---:|---:|",
        f"| Catalogo | {len(catalog)} | {cat_obs:,} | {cat_img:,} | {_gb(cat_size)} ± {_gb(cat_err)} |",
        f"| Altro | 1 | {alt_obs:,} | {alt_img:,} | {_gb(alt_size)} ± {_gb(alt_err)} |",
        f"| **Totale** | {len(catalog) + (1 if altro else 0)} | **{all_obs:,}** | **{all_img:,}** | **{_gb(all_size)} ± {_gb(all_err)}** |",
        "",
    ]
    inat_stats = sizes.get("inaturalist") or {}
    oi_stats = sizes.get("openimages") or {}
    if inat_stats.get("mean"):
        lines.append(
            f"- Peso medio di una foto iNaturalist \"{settings['inat']['photo_size']}\" (500 px sul lato lungo): "
            f"{inat_stats['mean'] / 1e3:.0f} KB (mediana {inat_stats['median'] / 1e3:.0f} KB, campione di {inat_stats['sample']} foto)."
        )
    if oi_stats.get("mean"):
        lines.append(
            f"- Peso medio di un file Open Images: {oi_stats['mean'] / 1e3:.0f} KB (campione di {oi_stats['sample']}); "
            f"dopo il ridimensionamento a {settings['download']['openimages_max_side']} px occupa molto meno."
        )
    lines += [
        f"- Spazio su disco dopo la ricompressione a qualità {settings['download']['jpeg_quality']}: circa "
        f"{_gb(all_size * STORED_SHARE)} (il {STORED_SHARE:.0%} del download, misurato su un campione di 42 foto).",
        f"- Tempo di download al limite di {hourly:g} GB/ora: circa {hours:.1f} ore"
        + (f", in {math.ceil(all_size / 1e9 / daily)} giorni al limite di {daily:g} GB/giorno." if all_size / 1e9 > daily else "."),
        f"- Obiettivo per classe: {target_min}–{target_max} osservazioni, al massimo "
        f"{settings['classes']['max_per_observer']} per osservatore; "
        f"{settings['classes']['photos_per_observation']} foto per osservazione "
        f"({settings['classes']['photos_per_observation_low']} nelle classi sotto {target_min}).",
        f"- Richieste all'API: {doc['api']['networkRequests']:,} in rete, {doc['api']['cachedRequests']:,} dalla cache.",
    ]

    below = [s for s in catalog if s["belowMin"]]
    world = [s for s in catalog if s["byPlace"].get("world")]
    lines += ["", "## Da tenere d'occhio", ""]
    if below:
        lines.append(
            f"- **{len(below)} {'classe' if len(below) == 1 else 'classi'} sotto {target_min} osservazioni** "
            "(da accorpare o sostituire, se serve, dopo "
            "l'analisi delle confusioni): "
            + ", ".join(f"`{s['key']}` ({s['observations']})" for s in sorted(below, key=lambda r: r["observations"]))
            + "."
        )
    else:
        lines.append(f"- Tutte le classi raggiungono almeno {target_min} osservazioni.")
    if world:
        lines.append(
            "- Classi che usano anche foto extra-europee: "
            + ", ".join(f"`{s['key']}` ({s['byPlace']['world']})" for s in world)
            + "."
        )
    casual_heavy = [s for s in catalog if s["byQuality"].get("casual", 0) + s["byQuality"].get("casual-unconfirmed", 0) > s["observations"] / 2]
    if casual_heavy:
        lines.append(
            "- Classi coltivate con più di metà delle foto da osservazioni \"casual\" (piante coltivate, identificazione "
            "confermata da almeno un'altra persona salvo dove indicato): "
            + ", ".join(f"`{s['key']}`" for s in casual_heavy)
            + "."
        )
    for problem in doc.get("taxaProblems") or []:
        lines.append(f"- Tassonomia: {problem}.")
    skipped = [a for a in doc.get("altroSources") or [] if a["skipReason"]]
    for item in skipped:
        lines.append(f"- Sosia `{item['name']}` escluso da \"altro\": {_skip_reason_it(item['skipReason'])}.")
    shared = [s for s in catalog if _shared(s)]
    if shared:
        lines.append(
            f"- {sum(_shared(s) for s in shared)} osservazioni compaiono in due classi (la stessa foto in due osservazioni, "
            "o un'identificazione cambiata fra due richieste): restano solo nella prima classe, in ordine di catalogo."
        )

    lines += [
        "",
        "## Classi del catalogo",
        "",
        "Colonne IT/EU/mondo: osservazioni per provenienza (le query non si sovrappongono). \"Annotate\": osservazioni con "
        "l'annotazione di fioritura/fruttificazione della carta; le altre sono senza annotazione, scattate nei mesi in cui "
        "la parte colorata è visibile.",
        "",
        "| # | Classe | Oss. | IT | EU | mondo | Annotate | Osservatori | Immagini | MB | Note |",
        "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for index, s in enumerate(catalog, start=1):
        p = s["byPlace"]
        lines.append(
            f"| {index} | `{s['key']}` | {s['observations']} | {p.get('italy', 0)} | {p.get('europe', 0)} | "
            f"{p.get('world', 0)} | {s['annotated']} | {s['observers']} | {s['images']} | {_mb(_bytes(s, sizes))} | {_flags(s)} |"
        )

    lines += [
        "",
        "## Classe \"altro\"",
        "",
        "| Parte | Origine | Licenza | Gruppi | Osservazioni | Immagini | MB |",
        "|---|---|---|---:|---:|---:|---:|",
    ]
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for s in altro:
        by_source[s["source"]].append(s)
    for source, rows in by_source.items():
        provider = "openimages" if source == "altro/openimages" else "inaturalist"
        lines.append(
            f"| {SOURCE_LABEL.get(source, source)} | {SOURCE_ORIGIN.get(source, '')} | {LICENSE_NOTE[provider]} | "
            f"{len(rows)} | {sum(r['observations'] for r in rows):,} | {sum(r['images'] for r in rows):,} | "
            f"{_mb(sum(_bytes(r, sizes) for r in rows))} |"
        )
    lines += ["", "L'elenco completo delle fonti di \"altro\" è in `ml/reports/altro-sources.md`.", ""]
    return "\n".join(lines)


def render_altro_sources(doc: dict[str, Any]) -> str:
    selections = {s["key"]: s for s in doc["selections"] if s["source"] != "catalog"}
    sources = doc.get("altroSources") or []
    lines = [
        "# Fonti della classe \"altro\"",
        "",
        f"Generato il {doc['created'].replace('T', ' alle ')} da `python -m floradeck_ml fetch`. Ogni immagine scaricata ha "
        "una riga in `ml/data/attributions.csv` (id foto, id osservazione, autore, licenza, URL).",
        "",
        "| Parte | Da dove | Licenza |",
        "|---|---|---|",
    ]
    for source in SOURCE_LABEL:
        provider = "openimages" if source == "altro/openimages" else "inaturalist"
        lines.append(f"| {SOURCE_LABEL[source]} | {SOURCE_ORIGIN[source]} | {LICENSE_NOTE[provider]} |")

    lookalikes = [a for a in sources if a["part"] == "lookalike"]
    lines += [
        "",
        f"## Sosia fuori catalogo ({len(lookalikes)})",
        "",
        "| Nome nel catalogo | Taxon iNaturalist | Rango | Citato da | Osservazioni | Note |",
        "|---|---|---|---|---:|---|",
    ]
    for item in lookalikes:
        selection = selections.get(f"lookalike/{item['name']}")
        taxon = f"[{item['inatName']}](https://www.inaturalist.org/taxa/{item['taxonId']})" if item["taxonId"] else "—"
        notes = []
        if item["skipReason"]:
            notes.append(_skip_reason_it(item["skipReason"]))
        if item["inatName"] and item["inatName"] != item["name"]:
            notes.append(f"su iNaturalist è {item['inatName']}")
        if item["exclude"]:
            notes.append(f"esclude {len(item['exclude'])} taxa del catalogo")
        note = "; ".join(notes)
        lines.append(
            f"| {item['name']} | {taxon} | {item['rank']} | {', '.join(item['listedBy'])} | "
            f"{selection['observations'] if selection else 0} | {note} |"
        )

    common = [a for a in sources if a["part"] == "common"]
    lines += [
        "",
        f"## Piante comuni in Italia ({len(common)})",
        "",
        "In ordine di osservazioni italiane research grade con licenza aperta.",
        "",
        "| # | Taxon | Oss. in Italia | Prese |",
        "|---:|---|---:|---:|",
    ]
    for index, item in enumerate(common, start=1):
        selection = selections.get(f"common/{item['name']}")
        lines.append(
            f"| {index} | [{item['name']}](https://www.inaturalist.org/taxa/{item['taxonId']}) | "
            f"{item['italianObservations']:,} | {selection['observations'] if selection else 0} |"
        )

    leaves = selections.get("leaves")
    nonplant = [s for s in selections.values() if s["source"] == "altro/nonplant"]
    oi = doc.get("openimages") or {}
    lines += [
        "",
        "## Altre parti",
        "",
        f"- Specie del catalogo senza fiori né frutti: {leaves['observations'] if leaves else 0} osservazioni, "
        f"al massimo {doc['settings']['altro']['leaves_max_per_class']} per classe.",
    ]
    for s in nonplant:
        lines.append(f"- Non piante, {s['key'].split('/', 1)[1]}: {s['observations']} osservazioni.")
    if oi:
        lines.append(
            f"- Open Images V7 (validation, {oi.get('images', 0):,} immagini): {oi.get('candidates', 0):,} senza etichette di "
            f"piante ({oi.get('plant_labels', 0):,} etichette escluse), {oi.get('selected', 0):,} scelte con un campione "
            "deterministico."
        )
    lines.append("")
    return "\n".join(lines)
