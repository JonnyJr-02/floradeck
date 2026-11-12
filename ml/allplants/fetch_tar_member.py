"""Download selected members of a large remote (uncompressed) tar with parallel HTTP range requests.

    python ml/allplants/fetch_tar_member.py <url> <out dir> <substring[,substring...]> [--connections 8] [--list]

Walks the tar headers with small range requests (no full download), then fetches each member whose path
contains <substring> in parallel chunks. Useful when a server throttles single connections (Zenodo).
"""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import time
import urllib.request
from pathlib import Path

BLOCK = 512


def get_range(url: str, start: int, end: int, tries: int = 6) -> bytes:
    for attempt in range(tries):
        try:
            request = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}", "User-Agent": "floradeck"})
            with urllib.request.urlopen(request, timeout=120) as response:
                data = response.read()
            if len(data) == end - start + 1:
                return data
        except Exception as err:  # retry with backoff
            print(f"range {start}-{end}: {err}", flush=True)
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"could not fetch {start}-{end}")


def parse_octal(field: bytes) -> int:
    text = field.rstrip(b"\0 ").decode() or "0"
    return int(text, 8)


def walk(url: str):
    """Yield (path, type, data offset, size) for every member."""
    offset, pending_name = 0, None
    while True:
        header = get_range(url, offset, offset + BLOCK - 1)
        if header == b"\0" * BLOCK:
            return
        size = parse_octal(header[124:136])
        kind = header[156:157]
        name = header[0:100].rstrip(b"\0").decode("utf-8", "replace")
        prefix = header[345:500].rstrip(b"\0").decode("utf-8", "replace")
        if prefix:
            name = prefix + "/" + name
        data = offset + BLOCK
        if kind in (b"x", b"L"):  # pax extended header or GNU long name: read it, apply to the next member
            body = get_range(url, data, data + size - 1).decode("utf-8", "replace") if size else ""
            for line in body.splitlines():
                if " path=" in line:
                    pending_name = line.split(" path=", 1)[1]
            if kind == b"L":
                pending_name = body.rstrip("\0")
        else:
            yield (pending_name or name), kind, data, size
            pending_name = None
        offset = data + ((size + BLOCK - 1) // BLOCK) * BLOCK


def fetch(url: str, start: int, size: int, target: Path, connections: int, chunk: int = 16 * 2**20) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_suffix(target.suffix + ".part")
    with open(part, "wb") as handle:
        handle.truncate(size)
    pieces = [(s, min(s + chunk, size) - 1) for s in range(0, size, chunk)]
    done, t0 = 0, time.time()

    def job(piece):
        a, b = piece
        data = get_range(url, start + a, start + b)
        fd = os.open(part, os.O_WRONLY | getattr(os, "O_BINARY", 0))
        try:
            os.lseek(fd, a, 0)
            os.write(fd, data)
        finally:
            os.close(fd)
        return len(data)

    with concurrent.futures.ThreadPoolExecutor(connections) as pool:
        for n in pool.map(job, pieces):
            done += n
            rate = done / (time.time() - t0)
            print(f"{target.name}: {done / 1e6:.0f}/{size / 1e6:.0f} MB, {rate / 1e6:.2f} MB/s", flush=True)
    part.replace(target)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("out")
    parser.add_argument("substring")
    parser.add_argument("--connections", type=int, default=8)
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    for path, kind, offset, size in walk(args.url):
        print(f"{kind.decode() or '0'} {size:>12} {path}", flush=True)
        wanted = any(s in path for s in args.substring.split(",")) and "/._" not in path and ".DS_Store" not in path
        if args.list or kind not in (b"0", b"\0") or not wanted:
            continue
        fetch(args.url, offset, size, Path(args.out) / path, args.connections)


if __name__ == "__main__":
    main()
