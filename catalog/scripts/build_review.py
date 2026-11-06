#!/usr/bin/env python3
"""Build catalog/review/index.html: a self-contained page to check the catalogue.

Open the file in a browser (no server needed). Each species shows its data
and links to iNaturalist, POWO, Acta Plantarum, the Portale della Flora
d'Italia and Wikipedia. Ticks and notes are saved in the browser; "Esporta"
downloads them as status.json, which goes in catalog/review/ so that
build_catalog.py can mark the checked species as "verificato".

Usage (from the repository root, after build_catalog.py):
    py -3.13 catalog/scripts/build_review.py
"""

from __future__ import annotations

import json
from pathlib import Path

from catalog_lib import compress_months

CATALOG_DIR = Path(__file__).resolve().parents[1]
OUTPUT = CATALOG_DIR / "review" / "index.html"

RARITY_IT = {"common": "comune", "uncommon": "non comune", "rare": "rara", "legendary": "leggendaria"}
LEVEL_IT = {"species": "specie", "group": "gruppo", "genus": "genere"}

PAGE = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FloraDeck · revisione del catalogo</title>
<link rel="icon" href="data:,">
<style>
  :root { --bg: #f7f3ea; --card: #fffdf8; --ink: #27231d; --muted: #6d665a; --line: #e4dccb; --accent: #8c3a5e; --ok: #2e7a4d; --warn: #9a5a00; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
  header { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  header p { margin: 0 0 10px; color: var(--muted); font-size: 13px; max-width: 70ch; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  select, input[type=search], button, .button { font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: inherit; }
  button, .button { cursor: pointer; }
  .progress { color: var(--muted); font-size: 14px; margin-left: auto; }
  main { max-width: 960px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
  article { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  article.ok { border-left-color: var(--ok); }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; }
  .name { font-size: 17px; font-weight: 600; }
  .sci { font-style: italic; color: var(--muted); }
  .meta { color: var(--muted); font-size: 13px; }
  .flags { margin-top: 6px; }
  .flag { display: inline-block; font-size: 12px; padding: 1px 7px; border-radius: 999px; background: #efe8da; margin: 0 4px 4px 0; }
  .flag.warn { background: #fbe9cf; color: var(--warn); }
  dl { display: grid; grid-template-columns: 9.5em 1fr; gap: 4px 12px; margin: 10px 0; }
  dt { color: var(--muted); }
  dd { margin: 0; }
  .links a { margin-right: 12px; color: var(--accent); white-space: nowrap; }
  .review { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: flex-start; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); }
  .review label { display: flex; gap: 6px; align-items: center; font-weight: 600; }
  textarea { flex: 1; min-width: 240px; min-height: 2.6em; font: inherit; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
  .empty { color: var(--warn); }
  @media (max-width: 640px) { dl { grid-template-columns: 1fr; } dt { margin-top: 6px; } .progress { margin-left: 0; } }
</style>
</head>
<body>
<header>
  <h1>FloraDeck · revisione del catalogo</h1>
  <p>Controlla testi e dati di ogni scheda con i link. Spunta «Scheda verificata» quando è tutto giusto e scrivi nelle note cosa correggere. Spunte e note restano in questo browser: alla fine usa «Esporta» e salva il file come <code>catalog/review/status.json</code>, oppure mandalo a Claude.</p>
  <div class="controls">
    <select id="album" aria-label="Album"><option value="">Tutti gli album</option></select>
    <select id="filter" aria-label="Filtro">
      <option value="">Tutte le schede</option>
      <option value="todo">Da verificare</option>
      <option value="ok">Verificate</option>
      <option value="notes">Con note</option>
      <option value="flags">Con dati da controllare</option>
    </select>
    <input id="q" type="search" placeholder="Cerca un nome…" aria-label="Cerca">
    <button id="export" type="button">Esporta</button>
    <label class="button">Importa<input id="import" type="file" accept="application/json" hidden></label>
    <span class="progress" id="progress"></span>
  </div>
</header>
<main id="list"></main>
<script>
const DATA = __DATA__;
const KEY = "floradeck-review-v1";
const state = JSON.parse(localStorage.getItem(KEY) || '{"species":{}}');
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const entry = (id) => (state.species[id] ||= { ok: false, note: "" });

const albumSelect = document.getElementById("album");
for (const album of DATA.albums) albumSelect.add(new Option(album.name, album.id));
albumSelect.add(new Option("Carta leggendaria", "__legendary"));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v; else node.setAttribute(k, v);
  }
  for (const child of children) if (child != null) node.append(child);
  return node;
}

function links(s) {
  const name = s.searchName;
  const q = encodeURIComponent(name);
  const items = [
    ...s.inatTaxonIds.map((id, i) => ["iNaturalist" + (s.inatTaxonIds.length > 1 ? " " + (i + 1) : ""), "https://www.inaturalist.org/taxa/" + id]),
    ["POWO", "https://powo.science.kew.org/results?q=" + q],
    ["Acta Plantarum", "https://duckduckgo.com/?q=" + encodeURIComponent("site:actaplantarum.org \\"" + name + "\\"")],
    ["Flora d'Italia", "https://duckduckgo.com/?q=" + encodeURIComponent("site:dryades.units.it floritaly \\"" + name + "\\"")],
    ["Wikipedia", "https://it.wikipedia.org/w/index.php?search=" + q],
  ];
  return el("div", { class: "links" }, ...items.map(([label, href]) => el("a", { href, target: "_blank", rel: "noopener" }, label)));
}

function row(label, value) {
  const dd = el("dd");
  if (value) dd.textContent = value; else dd.append(el("span", { class: "empty" }, "— da completare"));
  return [el("dt", {}, label), dd];
}

function card(s) {
  const st = entry(s.id);
  const flags = s.flags.map(([text, warn]) => el("span", { class: "flag" + (warn ? " warn" : "") }, text));
  const ok = el("input", { type: "checkbox" });
  ok.checked = st.ok;
  const note = el("textarea", { placeholder: "Note o correzioni…" });
  note.value = st.note;
  const article = el("article", { class: st.ok ? "ok" : "" },
    el("div", { class: "head" },
      el("div", {}, el("span", { class: "name" }, s.commonNameIt), " ", el("span", { class: "sci" }, s.scientificName)),
      el("span", { class: "meta" }, s.position)),
    el("div", { class: "flags" }, ...flags),
    el("dl", {}, ...[
      ["Famiglia", s.family], ["Colori", s.dominantColors.join(", ")], [s.phenology === "fruiting" ? "Frutti" : "Fioritura", s.months],
      ["Habitat", s.habitat], ["Altitudine", s.altitude || (s.cultivated ? "(coltivata)" : "")], ["Dove", s.regions],
      ["Dimensioni", s.sizeNote], ["Descrizione", s.description], ["Curiosità", s.funFact],
      ["Tutela", s.protectionNote || (s.protected ? "Tutelata" : "")], ["Tossicità", s.toxicNote],
      ["Sosia in catalogo", s.lookalikeNames], ["Sosia fuori catalogo", s.lookalikesOutside.join(", ")],
      ["Classe del modello", s.modelLabels.join(", ")],
    ].filter(([label, value]) => value || ["Habitat", "Descrizione", "Curiosità", "Dimensioni", "Dove"].includes(label) || (label === "Altitudine" && !s.cultivated))
     .flatMap(([label, value]) => row(label, value))),
    links(s),
    el("div", { class: "review" }, el("label", {}, ok, "Scheda verificata"), note));
  ok.addEventListener("change", () => { st.ok = ok.checked; article.classList.toggle("ok", st.ok); save(); progress(); });
  note.addEventListener("input", () => { st.note = note.value; save(); });
  return article;
}

function progress() {
  const done = DATA.species.filter((s) => state.species[s.id]?.ok).length;
  document.getElementById("progress").textContent = done + " / " + DATA.species.length + " verificate";
}

function render() {
  const album = albumSelect.value, filter = document.getElementById("filter").value;
  const q = document.getElementById("q").value.trim().toLowerCase();
  const list = document.getElementById("list");
  list.replaceChildren(...DATA.species.filter((s) => {
    const st = state.species[s.id] || {};
    if (album === "__legendary" ? s.albumId !== null : album && s.albumId !== album) return false;
    if (filter === "todo" && st.ok) return false;
    if (filter === "ok" && !st.ok) return false;
    if (filter === "notes" && !st.note) return false;
    if (filter === "flags" && !s.flags.some(([, warn]) => warn)) return false;
    return !q || (s.commonNameIt + " " + s.scientificName).toLowerCase().includes(q);
  }).map(card));
  progress();
}

for (const id of ["album", "filter", "q"]) document.getElementById(id).addEventListener("input", render);
document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), species: state.species }, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "status.json" });
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const imported = JSON.parse(await file.text());
  Object.assign(state.species, imported.species || {});
  save();
  render();
});
render();
</script>
</body>
</html>
"""


def main() -> int:
    species = json.loads((CATALOG_DIR / "species.json").read_text(encoding="utf-8"))
    albums = json.loads((CATALOG_DIR / "albums.json").read_text(encoding="utf-8"))
    album_names = {a["id"]: a["name"] for a in albums}
    names = {s["id"]: s["commonNameIt"] for s in species}
    counts = {a["id"]: a["speciesCount"] for a in albums}

    view = []
    for s in species:
        flags = [(RARITY_IT[s["rarity"]], False), (LEVEL_IT[s["taxonLevel"]], False)]
        if s["cultivated"]:
            flags.append(("coltivata", False))
        if s["protected"] is True:
            flags.append(("tutelata", False))
        elif s["protected"] is None:
            flags.append(("tutela da verificare", True))
        if s["toxic"]:
            flags.append(("velenosa", True))
        if not s["funFact"] or not s["sizeNote"]:
            flags.append(("campi vuoti", True))
        position = (
            f"{album_names[s['albumId']]} · {s['number']:02}/{counts[s['albumId']]:02}" if s["albumId"] else "Carta leggendaria"
        )
        view.append({
            **s,
            "position": position,
            "months": compress_months(s["bloomMonths"]) if s["bloomMonths"] else "",
            "lookalikeNames": ", ".join(names.get(i, i) for i in s["lookalikes"]),
            "searchName": s["modelLabels"][0],
            "flags": flags,
        })

    data = json.dumps({"albums": albums, "species": view}, ensure_ascii=False).replace("</", "<\\/")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(PAGE.replace("__DATA__", data), encoding="utf-8", newline="\n")
    print(f"Wrote {OUTPUT.relative_to(CATALOG_DIR.parent)} ({len(view)} species)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
