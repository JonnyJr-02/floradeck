"""Command line: ``python -m floradeck_ml <command>`` (see ml/README.md)."""

from __future__ import annotations

import argparse
import dataclasses
import sys
from pathlib import Path

from . import inat
from .catalog import load_catalog
from .config import ConfigError, Settings, load_settings, validate
from .paths import CATALOG_SPECIES, DEFAULT_CONFIG, DEFAULT_DATA_DIR, REPORTS_DIR, DataPaths
from .records import OPENIMAGES, read_manifest, write_manifest


def _log(message: str) -> None:
    print(message, flush=True)


def _apply_overrides(settings: Settings, args: argparse.Namespace) -> Settings:
    classes, download = settings.classes, settings.download
    if getattr(args, "target_min", None) is not None:
        classes = dataclasses.replace(classes, target_min=args.target_min)
    if getattr(args, "target_max", None) is not None:
        classes = dataclasses.replace(classes, target_max=args.target_max)
    if getattr(args, "max_gb_per_hour", None) is not None:
        download = dataclasses.replace(download, max_gb_per_hour=args.max_gb_per_hour)
    if getattr(args, "workers", None) is not None:
        download = dataclasses.replace(download, workers=args.workers)
    settings = dataclasses.replace(settings, classes=classes, download=download)
    validate(settings)
    return settings


def _manifest_paths(paths: DataPaths, partial: bool) -> tuple[Path, Path, Path]:
    if not partial:
        return paths.manifest, paths.plan, paths.report
    folder = paths.manifest_dir / "partial"
    return folder / "selection.jsonl", folder / "plan.json", folder / "report.md"


def cmd_fetch(args: argparse.Namespace, settings: Settings, paths: DataPaths) -> int:
    from .download import download, write_attributions
    from .plan import build_plan, estimate_sizes, plan_document, write_plan
    from .report import render_altro_sources, render_report

    classes = load_catalog(CATALOG_SPECIES, settings.classes.extra_phenology)
    client = inat.ApiClient(
        settings.inat.api,
        settings.inat.user_agent,
        paths.api_cache,
        min_interval_s=settings.inat.min_interval_s,
        max_requests=settings.inat.max_requests_per_run,
        offline=args.offline,
    )
    partial = bool(args.only) or args.no_altro
    _log(f"Selecting observations for {len(args.only) if args.only else len(classes)} classes"
         + ("" if args.no_altro else " and the altro class") + (" (dry run: no image is downloaded)" if args.dry_run else ""))
    try:
        result = build_plan(
            settings,
            client,
            classes,
            openimages_cache=paths.openimages_cache,
            only=args.only,
            include_altro=not args.no_altro,
            log=_log,
        )
    except inat.RequestBudgetExceeded as err:
        _log(f"Stopped: {err}")
        return 2

    observations = result.observations
    inat_photos = [(p.id, p.url) for o in observations if o.provider != OPENIMAGES for p in o.photos]
    oi_photos = [(p.id, p.url) for o in observations if o.provider == OPENIMAGES for p in o.photos]
    _log(f"Estimating photo sizes from {min(args.size_sample, len(inat_photos))} HEAD requests (no download)")
    sizes = {
        "inaturalist": estimate_sizes(inat_photos, paths.size_cache, settings.inat.user_agent, sample=args.size_sample, seed=settings.split.seed),
        "openimages": estimate_sizes(oi_photos, paths.size_cache, settings.inat.user_agent, sample=min(40, args.size_sample), seed=settings.split.seed),
    }
    manifest_path, plan_path, report_path = _manifest_paths(paths, partial)
    write_manifest(manifest_path, observations)
    document = plan_document(result, settings, client, sizes, partial=partial)
    write_plan(plan_path, document)
    report = render_report(document)
    report_path.write_text(report, encoding="utf-8", newline="\n")
    if not partial:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        (REPORTS_DIR / "dataset-plan.md").write_text(report, encoding="utf-8", newline="\n")
        (REPORTS_DIR / "altro-sources.md").write_text(render_altro_sources(document), encoding="utf-8", newline="\n")
    _log(f"Wrote {manifest_path} ({len(observations):,} observations) and {report_path}")
    if not partial:
        _log(f"Report: {REPORTS_DIR / 'dataset-plan.md'}")
    if args.dry_run:
        return 0

    d = settings.download
    counts = download(
        observations,
        paths.images,
        user_agent=settings.inat.user_agent,
        max_gb_per_hour=d.max_gb_per_hour,
        max_gb_per_day=d.max_gb_per_day,
        workers=d.workers,
        timeout_s=d.timeout_s,
        retries=d.retries,
        openimages_max_side=d.openimages_max_side,
        jpeg_quality=d.jpeg_quality,
        min_free_gb=d.min_free_gb,
        failures_path=paths.download_failures,
        log=_log,
    )
    rows = write_attributions(paths.attributions, observations, paths.images)
    _log(f"Downloaded {counts['ok']:,} files ({counts['bytes'] / 1e9:.2f} GB), {counts['failed']:,} failed; "
         f"{rows:,} rows in {paths.attributions}")
    return 0


def cmd_download(args: argparse.Namespace, settings: Settings, paths: DataPaths) -> int:
    from .download import download, write_attributions

    manifest = Path(args.manifest) if args.manifest else paths.manifest
    if not manifest.exists():
        _log(f"No manifest at {manifest}: run `python -m floradeck_ml fetch --dry-run` first.")
        return 1
    observations = list(read_manifest(manifest))
    d = settings.download
    counts = download(
        observations,
        paths.images,
        user_agent=settings.inat.user_agent,
        max_gb_per_hour=d.max_gb_per_hour,
        max_gb_per_day=d.max_gb_per_day,
        workers=d.workers,
        timeout_s=d.timeout_s,
        retries=d.retries,
        openimages_max_side=d.openimages_max_side,
        jpeg_quality=d.jpeg_quality,
        min_free_gb=d.min_free_gb,
        failures_path=paths.download_failures,
        log=_log,
        limit=args.limit,
        retry_failed=args.retry_failed,
    )
    rows = write_attributions(paths.attributions, observations, paths.images)
    _log(f"Downloaded {counts['ok']:,} files ({counts['bytes'] / 1e9:.2f} GB), {counts['failed']:,} failed; "
         f"{rows:,} rows in {paths.attributions}")
    return 0


def cmd_clean(args: argparse.Namespace, settings: Settings, paths: DataPaths) -> int:
    from .clean import build_dataset, write_dataset

    manifest = Path(args.manifest) if args.manifest else paths.manifest
    if not manifest.exists():
        _log(f"No manifest at {manifest}: run `python -m floradeck_ml fetch` first.")
        return 1
    observations = list(read_manifest(manifest))
    class_order = [c.id for c in load_catalog(CATALOG_SPECIES, settings.classes.extra_phenology)] + [settings.altro.label]
    c = settings.clean
    result = build_dataset(
        observations,
        paths.root,
        hashes_path=paths.hashes,
        min_side=c.min_side,
        max_aspect=c.max_aspect,
        max_distance=c.phash_max_distance,
        split_settings=dataclasses.asdict(settings.split),
        class_order=class_order,
        workers=args.workers if args.workers is not None else c.workers,
        log=_log,
    )
    write_dataset(result, paths.dataset, paths.rejected, paths.classes, paths.clean_report)
    _log(f"Wrote {paths.dataset} ({len(result['rows']):,} images, {len(result['classes'])} classes) and {paths.clean_report}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m floradeck_ml", description="FloraDeck dataset pipeline")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="settings file (default: ml/dataset.toml)")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR, help="data folder (default: ml/data)")
    commands = parser.add_subparsers(dest="command", required=True)

    fetch = commands.add_parser("fetch", help="select observations (iNaturalist API, cached), then download the images")
    fetch.add_argument("--dry-run", action="store_true", help="select and report only: no image is downloaded")
    fetch.add_argument("--only", nargs="+", metavar="CLASS", help="only these catalogue classes (writes manifest/partial/)")
    fetch.add_argument("--no-altro", action="store_true", help="skip the altro class (writes manifest/partial/)")
    fetch.add_argument("--target-min", type=int, help="minimum observations per class (default from dataset.toml)")
    fetch.add_argument("--target-max", type=int, help="maximum observations per class (default from dataset.toml)")
    fetch.add_argument("--max-gb-per-hour", type=float, help="download rate cap (at most 5)")
    fetch.add_argument("--workers", type=int, help="parallel downloads")
    fetch.add_argument("--size-sample", type=int, default=150, help="photos sampled with HEAD requests for the size estimate")
    fetch.add_argument("--offline", action="store_true", help="use cached API responses only")
    fetch.set_defaults(handler=cmd_fetch)

    down = commands.add_parser("download", help="download the images of an existing manifest (resumable)")
    down.add_argument("--manifest", help="manifest file (default: data/manifest/selection.jsonl)")
    down.add_argument("--limit", type=int, help="download at most this many files (for testing)")
    down.add_argument("--retry-failed", action="store_true", help="also retry photos that were gone (HTTP 403/404) last time")
    down.add_argument("--max-gb-per-hour", type=float, help="download rate cap (at most 5)")
    down.add_argument("--workers", type=int, help="parallel downloads")
    down.set_defaults(handler=cmd_download)

    clean = commands.add_parser("clean", help="decode, size filter, perceptual-hash dedupe and split -> dataset.csv")
    clean.add_argument("--manifest", help="manifest file (default: data/manifest/selection.jsonl)")
    clean.add_argument("--workers", type=int, help="hashing processes (default: one per core)")
    clean.set_defaults(handler=cmd_clean)
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):  # taxon names may not fit the console code page
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    args = build_parser().parse_args(argv)
    try:
        settings = _apply_overrides(load_settings(args.config), args)
    except ConfigError as err:
        print(f"Configuration error: {err}", file=sys.stderr)
        return 2
    paths = DataPaths(args.data_dir.resolve())
    return args.handler(args, settings, paths)
