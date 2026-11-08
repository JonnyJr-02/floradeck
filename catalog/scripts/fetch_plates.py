#!/usr/bin/env python3
"""Find a public-domain botanical plate for every catalogue species on Wikimedia Commons.

For each species (and each taxon of a genus/group entry) the script lists the files of
"Category:<taxon> - botanical illustrations", keeps only public-domain files whose title
names the taxon and that come from a known illustrated flora (Thomé, Sturm, Köhler, Curtis,
Sibthorp, Lindman, Flora Batava…), and picks the best by source. Species without such a plate
get none: they are listed, never filled with a guess.

It writes catalog/plates/plates.json (generated: file, source, author, licence, page URL) and
downloads an 800 px thumbnail of each chosen plate to catalog/.cache/plates/. The app's
`npm run plates` turns those into small WebP files. Every API response is cached on disk.
Standard library only.

Usage (from the repository root):
    py -3.13 catalog/scripts/fetch_plates.py [--only <species id> ...] [--retry-missing] [--refresh]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia asks automated clients to identify themselves with a way to reach the project.
USER_AGENT = "FloraDeck-catalog-plates/0.1 (personal project; https://github.com/JonnyJr-02/floradeck)"
MIN_INTERVAL_S = 1.0
THUMB_WIDTH = 800

CATALOG_DIR = Path(__file__).resolve().parents[1]
CANDIDATES = CATALOG_DIR / "proposal" / "candidates.json"
SPECIES = CATALOG_DIR / "species.json"
OUTPUT = CATALOG_DIR / "plates" / "plates.json"
# Hand-kept list of files seen to be wrong (text pages, collages, wrong plant): never chosen again.
REJECTED = CATALOG_DIR / "plates" / "rejected.json"
CACHE_DIR = CATALOG_DIR / ".cache" / "commons"
THUMB_DIR = CATALOG_DIR / ".cache" / "plates"

# Illustrated floras, best first. Each matches the file title or one of its categories.
SOURCES: list[tuple[str, str, tuple[str, ...]]] = [
    ("koehler", "Franz Eugen Köhler, Köhler's Medizinal-Pflanzen (1887)", ("köhler", "koehler")),
    ("thome", "Otto Wilhelm Thomé, Flora von Deutschland, Österreich und der Schweiz (1885)",
     ("flora von deutschland", "thomé", "thome")),
    ("lindman", "Carl Axel Magnus Lindman, Bilder ur Nordens Flora (1901–1905)", ("bilder ur nordens flora", "lindman")),
    ("sturm", "Jacob Sturm, Deutschlands Flora in Abbildungen (1796–1862)", ("sturm",)),
    ("sibthorp", "John Sibthorp, Flora Graeca (1806–1840)", ("flora graeca", "sibthorp")),
    ("curtis", "Curtis's Botanical Magazine", ("botanical magazine", "curtis")),
    ("batava", "Flora Batava", ("flora batava",)),
    ("reichenbach", "Reichenbach, Icones Florae Germanicae et Helveticae", ("reichenbach", "icones florae germanicae")),
    ("danica", "Flora Danica", ("flora danica",)),
    ("masclef", "Amédée Masclef, Atlas des plantes de France (1891)", ("masclef", "atlas des plantes de france")),
    ("hempel", "Hempel & Wilhelm, Die Bäume und Sträucher des Waldes (1889)", ("hempel",)),
]
# Pages of text that some floras scanned next to their plates.
NOT_A_PLATE = re.compile(r"\b(desc|description\w*|text|titel|title page|index)\b", re.I)
PUBLIC_DOMAIN = re.compile(r"^(public domain|pd\b|pd-|cc0)", re.I)

_last_request = 0.0


def normalise(text: str) -> str:
    """Lower case, no accents, separators as spaces: 'Köhler–s_Medizinal' → 'kohler s medizinal'."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def names_taxon(title: str, taxon: str) -> bool:
    """True when the file title contains the taxon's binomial (or genus alone for a genus taxon)."""
    words = normalise(taxon).split()
    words = [w for w in words if w not in {"gr", "agg", "s", "l", "subsp", "var"}]
    if not words:
        return False
    # Digits may stick to the name in file titles: "Illustration Bellis perennis0.jpg".
    pattern = r"(?<![a-z])" + r"\s+".join(map(re.escape, words)) + r"(?![a-z])"
    return re.search(pattern, normalise(title)) is not None


def source_of(title: str, categories: list[str]) -> str | None:
    haystack = [title.lower(), *(c.lower() for c in categories)]
    for key, _, needles in SOURCES:
        if any(needle in text for needle in needles for text in haystack):
            return key
    return None


def score(title: str, categories: list[str], licence: str, taxon: str) -> tuple[int, str] | None:
    """Rank a candidate file; None when it must not be used."""
    if not PUBLIC_DOMAIN.match(licence.strip()):
        return None
    if not names_taxon(title.removeprefix("File:"), taxon):
        return None
    if not re.search(r"\.(jpe?g|png|tiff?)$", title, re.I) or NOT_A_PLATE.search(title):
        return None
    source = source_of(title, categories)
    if source is None:
        return None
    rank = next(i for i, (key, _, _) in enumerate(SOURCES) if key == source)
    return (len(SOURCES) - rank, source)


def strip_html(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text or "")).strip()


def api(params: dict, refresh: bool = False) -> dict:
    global _last_request
    params = {**params, "format": "json", "formatversion": "2", "maxlag": "5"}
    key = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()[:24]
    cached = CACHE_DIR / f"{key}.json"
    if cached.exists() and not refresh:
        return json.loads(cached.read_text(encoding="utf-8"))
    url = f"{API}?{urllib.parse.urlencode(params)}"
    for attempt in range(5):
        wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"  retry after {error}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
            continue
        if data.get("error", {}).get("code") == "maxlag":
            time.sleep(5 * (attempt + 1))
            continue
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        return data
    raise RuntimeError(f"Commons API failed: {url}")


def category_files(taxon: str, refresh: bool, suffix: str = " - botanical illustrations") -> list[str]:
    titles: list[str] = []
    params = {"action": "query", "list": "categorymembers", "cmtype": "file", "cmlimit": "500",
              "cmtitle": f"Category:{taxon}{suffix}"}
    while True:
        data = api(params, refresh)
        titles += [m["title"] for m in data.get("query", {}).get("categorymembers", [])]
        if "continue" not in data:
            return titles
        params = {**params, **data["continue"]}


def search_files(taxon: str, refresh: bool) -> list[str]:
    """Files titled with the taxon from one of the known floras, wherever they are categorised."""
    words = " OR ".join(needles[0] for _, _, needles in SOURCES)
    data = api({"action": "query", "list": "search", "srnamespace": "6", "srlimit": "50",
                "srsearch": f'intitle:"{taxon}" {words}'}, refresh)
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]


def file_details(titles: list[str], refresh: bool) -> dict[str, dict]:
    details: dict[str, dict] = {}
    for start in range(0, len(titles), 20):
        batch = titles[start:start + 20]
        data = api({"action": "query", "titles": "|".join(batch), "prop": "imageinfo|categories",
                    "iiprop": "url|extmetadata|size|mime", "iiurlwidth": str(THUMB_WIDTH),
                    "cllimit": "max", "clshow": "!hidden"}, refresh)
        for page in data.get("query", {}).get("pages", []):
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata", {})
            details[page["title"]] = {
                "categories": [c["title"].removeprefix("Category:") for c in page.get("categories", [])],
                "licence": strip_html(meta.get("LicenseShortName", {}).get("value", "")),
                "artist": strip_html(meta.get("Artist", {}).get("value", "")),
                "date": strip_html(meta.get("DateTimeOriginal", {}).get("value", "")),
                "pageUrl": info.get("descriptionurl", ""),
                "thumbUrl": info.get("thumburl", ""),
                "width": info.get("width"),
                "height": info.get("height"),
            }
    return details


def taxa_of(species: dict, candidates: dict[str, dict]) -> list[str]:
    candidate = candidates.get(species["id"], {})
    names = [*candidate.get("taxa", []), species["scientificName"], *species.get("modelLabels", [])]
    seen: list[str] = []
    for name in names:
        clean = re.sub(r"\s+(gr\.|agg\.|s\.l\.)\s*", " ", name).strip()
        if clean and " " in clean and clean not in seen:
            seen.append(clean)
    return seen


def rejected_files() -> set[str]:
    if not REJECTED.exists():
        return set()
    return {entry["file"] for entry in json.loads(REJECTED.read_text(encoding="utf-8"))["rejected"]}


def choose(species: dict, candidates: dict[str, dict], refresh: bool) -> dict:
    tried: list[str] = []
    rejected = rejected_files()
    # First the curated "botanical illustrations" category of each taxon, then the taxon's own
    # category and a title search, which find plates that were never sorted into the first.
    attempts = [(taxon, how) for how in ("illustrations", "category", "search") for taxon in taxa_of(species, candidates)]
    for taxon, how in attempts:
        tried.append(f"{taxon} ({how})")
        if how == "illustrations":
            titles = category_files(taxon, refresh)
        elif how == "category":
            titles = category_files(taxon, refresh, suffix="")
        else:
            titles = search_files(taxon, refresh)
        # Only files whose title names the taxon can qualify: ask Commons about those alone.
        titles = [title for title in titles
                  if names_taxon(title.removeprefix("File:"), taxon) and title.removeprefix("File:") not in rejected]
        if not titles:
            continue
        try:
            details = file_details(titles, refresh)
        except RuntimeError as error:
            print(f"  {species['id']}: {error}", file=sys.stderr)
            continue
        ranked = []
        for title, info in details.items():
            result = score(title, info["categories"], info["licence"], taxon)
            if result and info["thumbUrl"]:
                ranked.append((result[0], title, result[1], info))
        if ranked:
            ranked.sort(key=lambda item: (-item[0], item[1]))
            _, title, source, info = ranked[0]
            label = next(label for key, label, _ in SOURCES if key == source)
            return {"status": "found", "taxon": taxon, "via": how, "file": title.removeprefix("File:"), "source": source,
                    "sourceLabel": label, "artist": info["artist"], "date": info["date"],
                    "licence": info["licence"], "pageUrl": info["pageUrl"], "thumbUrl": info["thumbUrl"],
                    "alternatives": len(ranked) - 1, "review": "da-verificare"}
    return {"status": "missing", "tried": tried}


def download(url: str, target: Path) -> None:
    global _last_request
    if target.exists():
        return
    wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", default=None, help="species ids to (re)fetch")
    parser.add_argument("--refresh", action="store_true", help="ignore the API cache")
    parser.add_argument("--retry-missing", action="store_true", help="search again for species without a plate")
    args = parser.parse_args()

    species = json.loads(SPECIES.read_text(encoding="utf-8"))
    candidates = {c["key"]: c for c in json.loads(CANDIDATES.read_text(encoding="utf-8"))["candidates"]}
    plates = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    plates = {k: v for k, v in plates.items() if any(s["id"] == k for s in species)}

    for entry in species:
        if args.only is not None and entry["id"] not in args.only:
            continue
        known = plates.get(entry["id"])
        if args.only is None and known and not args.refresh and not (args.retry_missing and known["status"] == "missing"):
            continue
        result = choose(entry, candidates, args.refresh)
        if result["status"] == "found":
            suffix = Path(urllib.parse.urlparse(result["thumbUrl"]).path).suffix.lower() or ".jpg"
            # A different plate than last time: drop the old thumbnail, which has the same name.
            if known and known.get("file") != result["file"]:
                for old in THUMB_DIR.glob(f"{entry['id']}.*"):
                    old.unlink()
            download(result["thumbUrl"], THUMB_DIR / f"{entry['id']}{suffix}")
            result["thumbFile"] = f"{entry['id']}{suffix}"
            print(f"{entry['id']}: {result['sourceLabel'].split(',')[0]} — {result['file']}")
        else:
            print(f"{entry['id']}: NO PLATE (tried {', '.join(result['tried'])})")
        plates[entry["id"]] = result
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(dict(sorted(plates.items())), ensure_ascii=False, indent=1) + "\n",
                          encoding="utf-8")

    found = sum(1 for v in plates.values() if v["status"] == "found")
    print(f"\n{found} of {len(species)} species have a plate; {len(species) - found} without.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
