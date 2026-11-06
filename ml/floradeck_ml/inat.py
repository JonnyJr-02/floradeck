"""iNaturalist API v2 client: on-disk cache, about one request per second, retries.

Every response is cached (gzipped JSON keyed by the full URL), so a second run of
the same selection makes no network requests and returns the same observations.
Delete ``ml/data/cache/inat/`` to start from fresh data.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

OBSERVATION_FIELDS = ",".join(
    [
        "id",
        "observed_on",
        "quality_grade",
        "user.id",
        "user.login",
        "user.name",
        "taxon.id",
        "taxon.name",
        "taxon.rank",
        "photos.id",
        "photos.license_code",
        "photos.url",
        "photos.attribution",
        "photos.original_dimensions.width",
        "photos.original_dimensions.height",
    ]
)
TAXON_FIELDS = "id,name,rank,rank_level,ancestor_ids,is_active"
TAXA_BATCH = 30


class ApiError(RuntimeError):
    pass


class CacheMiss(RuntimeError):
    """Raised in offline mode when a response is not cached yet."""


class RequestBudgetExceeded(RuntimeError):
    """The run reached its request budget; run again later (cached responses are reused)."""


def encode_params(params: dict[str, Any]) -> str:
    """Stable query string: sorted keys, lists joined by commas, booleans as true/false."""
    items = []
    for key in sorted(params):
        value = params[key]
        if value is None:
            continue
        if isinstance(value, bool):
            value = "true" if value else "false"
        elif isinstance(value, (set, frozenset)):
            value = ",".join(str(v) for v in sorted(value))
        elif isinstance(value, (list, tuple)):
            value = ",".join(str(v) for v in value)
        items.append((key, str(value)))
    return urllib.parse.urlencode(items, safe=",")


class ApiClient:
    def __init__(
        self,
        base_url: str,
        user_agent: str,
        cache_dir: Path,
        *,
        min_interval_s: float = 1.0,
        max_requests: int = 9500,
        offline: bool = False,
        timeout_s: float = 60.0,
        retries: int = 5,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent
        self.cache_dir = cache_dir
        self.min_interval_s = min_interval_s
        self.max_requests = max_requests
        self.offline = offline
        self.timeout_s = timeout_s
        self.retries = retries
        self._sleep = sleep
        self._clock = clock
        self._last_request = float("-inf")
        self._turn = threading.Lock()  # request starts are spaced even across threads
        self._stats = threading.Lock()
        self.network_requests = 0
        self.cached_requests = 0
        self.network_bytes = 0

    def url(self, path: str, params: dict[str, Any] | None = None) -> str:
        query = encode_params(params or {})
        return f"{self.base_url}/{path}" + (f"?{query}" if query else "")

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = self.url(path, params)
        cache_file = self._cache_file(url)
        if cache_file.exists():
            with self._stats:
                self.cached_requests += 1
            with gzip.open(cache_file, "rt", encoding="utf-8") as handle:
                return json.load(handle)
        if self.offline:
            raise CacheMiss(url)
        if self.network_requests >= self.max_requests:
            raise RequestBudgetExceeded(
                f"{self.network_requests} network requests in this run; iNaturalist asks for at most "
                "~10,000 a day. Run again later: cached responses are reused."
            )
        body = self._fetch(url)
        data = json.loads(body.decode("utf-8"))
        self._write_cache(cache_file, data)
        return data

    def _cache_file(self, url: str) -> Path:
        key = hashlib.sha1(url.encode("utf-8")).hexdigest()
        return self.cache_dir / key[:2] / f"{key}.json.gz"

    def _write_cache(self, cache_file: Path, data: Any) -> None:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        temp = cache_file.with_suffix(f".tmp{os.getpid()}")
        with gzip.open(temp, "wt", encoding="utf-8") as handle:
            json.dump(data, handle, separators=(",", ":"))
        os.replace(temp, cache_file)

    def _wait_turn(self) -> None:
        with self._turn:
            wait = self.min_interval_s - (self._clock() - self._last_request)
            if wait > 0:
                self._sleep(wait)
            self._last_request = self._clock()

    def _fetch(self, url: str) -> bytes:
        request = urllib.request.Request(url, headers={"User-Agent": self.user_agent, "Accept": "application/json"})
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            self._wait_turn()
            with self._stats:
                self.network_requests += 1
            try:
                with urllib.request.urlopen(request, timeout=self.timeout_s) as response:
                    body = response.read()
                with self._stats:
                    self.network_bytes += len(body)
                return body
            except urllib.error.HTTPError as err:
                last_error = err
                if err.code == 429:
                    delay = 60.0 * (attempt + 1)  # too fast: back off for a while
                elif err.code in (500, 502, 503, 504):
                    delay = 5.0 * 2**attempt
                else:
                    detail = err.read()[:300].decode("utf-8", "replace")
                    raise ApiError(f"HTTP {err.code} for {url}: {detail}") from err
            except (urllib.error.URLError, socket.timeout, ConnectionError) as err:
                last_error = err
                delay = 5.0 * 2**attempt
            if attempt < self.retries:
                self._sleep(delay)
        raise ApiError(f"giving up on {url}: {last_error}")


def observation_page(
    client: ApiClient,
    params: dict[str, Any],
    page_size: int,
    id_below: int | None = None,
    fields: str = OBSERVATION_FIELDS,
) -> tuple[list[dict[str, Any]], int]:
    """One page of observations, newest first; ``id_below`` is the cursor for the next page."""
    query = {**params, "per_page": page_size, "order_by": "id", "order": "desc", "fields": fields}
    if id_below is not None:
        query["id_below"] = id_below
    data = client.get("observations", query)
    return data.get("results", []), int(data.get("total_results") or 0)


def count_observations(client: ApiClient, params: dict[str, Any]) -> int:
    return int(client.get("observations", {**params, "per_page": 0}).get("total_results") or 0)


def taxa_by_ids(client: ApiClient, ids: Iterable[int]) -> dict[int, dict[str, Any]]:
    """Rank and ancestry (``ancestor_ids`` ends with the taxon itself) for each id."""
    ids = sorted(set(ids))
    taxa: dict[int, dict[str, Any]] = {}
    for start in range(0, len(ids), TAXA_BATCH):
        batch = ids[start : start + TAXA_BATCH]
        data = client.get(f"taxa/{','.join(map(str, batch))}", {"fields": TAXON_FIELDS})
        for taxon in data.get("results", []):
            taxa[int(taxon["id"])] = taxon
    return taxa


def search_taxon(client: ApiClient, name: str) -> dict[str, Any] | None:
    """The active taxon with this exact name, or the one it is a synonym of.

    Returns the taxon with an extra ``synonym`` flag, or None when nothing matches exactly.
    """
    data = client.get(
        "taxa",
        {"q": name, "is_active": "true", "per_page": 10, "fields": TAXON_FIELDS + ",matched_term"},
    )
    results = data.get("results", [])
    wanted = name.casefold()
    for taxon in results:
        if taxon.get("name", "").casefold() == wanted:
            return {**taxon, "synonym": False}
    for taxon in results:
        if (taxon.get("matched_term") or "").casefold() == wanted:
            return {**taxon, "synonym": True}
    return None


def species_counts(client: ApiClient, params: dict[str, Any], limit: int, per_page: int = 500) -> list[dict[str, Any]]:
    """Leaf taxa ranked by number of observations, up to ``limit`` entries."""
    results: list[dict[str, Any]] = []
    page = 1
    while len(results) < limit:
        data = client.get(
            "observations/species_counts",
            {**params, "per_page": per_page, "page": page, "fields": "count,taxon.id,taxon.name,taxon.rank,taxon.ancestor_ids"},
        )
        batch = data.get("results", [])
        results.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    return results[:limit]
