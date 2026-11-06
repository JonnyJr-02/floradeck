"""Resumable, rate-limited image download, and attributions.csv.

- Files go to ``ml/data/images/<label>/<photo id>.<ext>``; a download is written to a
  ``.part`` file and renamed when complete, so an interrupted run resumes cleanly
  (existing files are skipped).
- The byte rate is capped (default 5 GB/hour, the iNaturalist guidance) and a run
  stops at the daily cap (default 24 GB); run again to continue.
- Missing files (HTTP 403/404: photo deleted or licence changed) are listed in
  ``download-failures.csv`` and skipped.
- Files are stored as JPEG, re-encoded at quality 90 when that saves space
  (``prepare_image``); the rate cap counts the bytes actually downloaded.
"""

from __future__ import annotations

import csv
import io
import os
import socket
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

from .records import OPENIMAGES, Observation, Photo, image_path

Log = Callable[[str], None]
CHUNK = 64 * 1024
ATTRIBUTION_FIELDS = [
    "photo_id",
    "observation_id",
    "provider",
    "label",
    "source",
    "observer_login",
    "observer_name",
    "license",
    "attribution",
    "photo_url",
    "observation_url",
    "path",
]


class ByteRateLimiter:
    """Keeps the average rate under ``bytes_per_second`` after an initial burst.

    After ``n`` bytes in total, the limiter makes callers wait until at least
    ``(n - burst) / rate`` seconds have passed since the first byte.
    """

    def __init__(
        self,
        bytes_per_second: float,
        burst_bytes: float,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.rate = bytes_per_second
        self.burst = burst_bytes
        self._clock = clock
        self._sleep = sleep
        self._lock = threading.Lock()
        self._start: float | None = None
        self.total = 0

    def delay_for(self, size: int) -> float:
        with self._lock:
            now = self._clock()
            if self._start is None:
                self._start = now
            self.total += size
            earliest = self._start + max(0.0, self.total - self.burst) / self.rate
            return max(0.0, earliest - now)

    def consume(self, size: int) -> None:
        delay = self.delay_for(size)
        if delay > 0:
            self._sleep(delay)


@dataclass(frozen=True)
class Job:
    observation: Observation
    photo: Photo
    dest: Path


def jobs_for(observations: Iterable[Observation], images_dir: Path) -> list[Job]:
    return [Job(o, p, images_dir / image_path(o, p)) for o in observations for p in o.photos]


def prepare_image(data: bytes, *, max_side: int | None, quality: int) -> bytes:
    """What gets stored: a JPEG, resized if larger than ``max_side``.

    Recent iNaturalist "medium" files are saved at JPEG quality ~100 (about 180 KB for
    500 px); re-encoding at ``quality`` 90 keeps them visually identical at about a third
    of the size. A JPEG is kept as downloaded when re-encoding saves less than 15 %, or
    when ``quality`` is 0; other formats are always converted.
    """
    with Image.open(io.BytesIO(data)) as image:
        is_jpeg = image.format == "JPEG"
        too_big = max_side is not None and max(image.size) > max_side
        if is_jpeg and not too_big and quality <= 0:
            return data
        image = ImageOps.exif_transpose(image).convert("RGB")
        if too_big:
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, "JPEG", quality=quality if quality > 0 else 95, optimize=True)
        encoded = output.getvalue()
    if is_jpeg and not too_big and len(encoded) > 0.85 * len(data):
        return data
    return encoded


def fetch_one(
    job: Job,
    *,
    user_agent: str,
    limiter: ByteRateLimiter,
    timeout_s: float,
    retries: int,
    max_side: int | None,
    quality: int,
    sleep: Callable[[float], None] = time.sleep,
) -> tuple[str, int]:
    """Download one file. Returns (status, bytes received)."""
    if job.dest.exists():
        return "exists", 0
    job.dest.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(job.photo.url, headers={"User-Agent": user_agent})
    received = 0
    for attempt in range(retries + 1):
        try:
            data = bytearray()
            with urllib.request.urlopen(request, timeout=timeout_s) as response:
                while chunk := response.read(CHUNK):
                    data.extend(chunk)
                    received += len(chunk)
                    limiter.consume(len(chunk))
            body = prepare_image(bytes(data), max_side=max_side, quality=quality)
            temp = job.dest.with_name(job.dest.name + ".part")
            temp.write_bytes(body)
            os.replace(temp, job.dest)
            return "ok", received
        except urllib.error.HTTPError as err:
            if err.code in (403, 404, 410):
                return f"http-{err.code}", received
            status = f"http-{err.code}"
        except (urllib.error.URLError, socket.timeout, ConnectionError, TimeoutError) as err:
            status = f"network: {err}"
        except OSError as err:  # undecodable image while resizing
            return f"bad-image: {err}", received
        if attempt < retries:
            sleep(5.0 * 2**attempt)
    return status, received


def download(
    observations: Sequence[Observation],
    images_dir: Path,
    *,
    user_agent: str,
    max_gb_per_hour: float,
    max_gb_per_day: float,
    workers: int,
    timeout_s: float,
    retries: int,
    openimages_max_side: int,
    jpeg_quality: int,
    failures_path: Path,
    log: Log = print,
    limit: int | None = None,
    retry_failed: bool = False,
) -> dict[str, int]:
    jobs = jobs_for(observations, images_dir)
    missing = [job for job in jobs if not job.dest.exists()]
    gone = {} if retry_failed else permanent_failures(failures_path)
    pending = [job for job in missing if job.photo.id not in gone]
    if limit is not None:
        pending = pending[:limit]
    log(
        f"{len(jobs):,} images in the manifest, {len(jobs) - len(missing):,} already on disk, "
        f"{len(missing) - len(pending):,} skipped (gone in an earlier run, or over --limit), {len(pending):,} to download"
    )
    rate = max_gb_per_hour * 1e9 / 3600.0
    limiter = ByteRateLimiter(rate, burst_bytes=rate * 30)  # up to 30 s worth of data at full speed
    daily_cap = max_gb_per_day * 1e9
    counts = {"ok": 0, "failed": 0, "bytes": 0}
    failures: list[tuple[Job, str]] = []
    started = time.monotonic()
    done = 0

    def work(job: Job) -> tuple[Job, str, int]:
        status, size = fetch_one(
            job,
            user_agent=user_agent,
            limiter=limiter,
            timeout_s=timeout_s,
            retries=retries,
            max_side=openimages_max_side if job.observation.provider == OPENIMAGES else None,
            quality=jpeg_quality,
        )
        return job, status, size

    batch = max(64, workers * 32)
    pool = ThreadPoolExecutor(max_workers=workers)
    try:
        for start in range(0, len(pending), batch):
            if counts["bytes"] >= daily_cap:
                log(f"Daily cap of {max_gb_per_day:g} GB reached: run the command again tomorrow to continue.")
                break
            for job, status, size in pool.map(work, pending[start : start + batch]):
                done += 1
                counts["bytes"] += size
                if status in ("ok", "exists"):
                    counts["ok"] += 1
                else:
                    counts["failed"] += 1
                    failures.append((job, status))
            elapsed = time.monotonic() - started
            speed = counts["bytes"] / elapsed if elapsed else 0.0
            remaining = (len(pending) - done) * (counts["bytes"] / done) / speed if done and speed else 0.0
            log(
                f"  {done:,}/{len(pending):,} files, {counts['bytes'] / 1e9:.2f} GB, "
                f"{speed / 1e6:.2f} MB/s, {counts['failed']} failed, about {remaining / 3600:.1f} h left"
            )
    except KeyboardInterrupt:
        log("Interrupted: finishing the files in progress; run the command again to resume.")
        counts["interrupted"] = 1
    finally:
        pool.shutdown(wait=True, cancel_futures=True)
        kept = [(job, gone[job.photo.id]) for job in missing if job.photo.id in gone]
        write_failures(failures_path, failures + kept)
    return counts


PERMANENT = ("http-403", "http-404", "http-410")


def permanent_failures(path: Path) -> dict[str, str]:
    """Photos an earlier run found deleted or no longer public: not retried unless asked."""
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as handle:
        return {row["photo_id"]: row["status"] for row in csv.DictReader(handle) if row["status"] in PERMANENT}


def write_failures(path: Path, failures: Sequence[tuple[Job, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["photo_id", "observation_id", "label", "url", "status"])
        for job, status in failures:
            writer.writerow([job.photo.id, job.observation.id, job.observation.label, job.photo.url, status])


def write_attributions(path: Path, observations: Iterable[Observation], images_dir: Path) -> int:
    """One row per image on disk: who took it, under which licence, where it comes from."""
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = 0
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ATTRIBUTION_FIELDS)
        writer.writeheader()
        for job in jobs_for(observations, images_dir):
            if not job.dest.exists():
                continue
            o, p = job.observation, job.photo
            writer.writerow(
                {
                    "photo_id": p.id,
                    "observation_id": o.id,
                    "provider": o.provider,
                    "label": o.label,
                    "source": o.source,
                    "observer_login": o.observer_login,
                    "observer_name": o.observer_name,
                    "license": p.license,
                    "attribution": p.attribution,
                    "photo_url": p.url,
                    "observation_url": o.page_url,
                    "path": job.dest.relative_to(images_dir.parent).as_posix(),
                }
            )
            rows += 1
    return rows
