"""The downloader against a local HTTP server: resume, failures, attributions."""

import csv
import errno
import functools
import http.server
import io
import tempfile
import threading
import unittest
from dataclasses import replace
from pathlib import Path
from unittest import mock

from helpers import observation, photo
from PIL import Image

from floradeck_ml.download import download, permanent_failures, write_attributions


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # keep the test output clean
        pass


class DownloadTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        root = Path(self.folder.name)
        self.served = root / "served"
        self.served.mkdir()
        self.data = root / "data"
        for name in ("1", "2"):
            buffer = io.BytesIO()
            Image.new("RGB", (500, 375), (int(name) * 60, 120, 30)).save(buffer, "JPEG", quality=85)
            (self.served / f"{name}.jpg").write_bytes(buffer.getvalue())
        handler = functools.partial(QuietHandler, directory=str(self.served))
        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.observations = [
            replace(observation(i, photos=(replace(photo(i), url=f"{base}/{i}.jpg"),)), label="bellis-perennis",
                    source="catalog")
            for i in (1, 2, 3)  # 3.jpg does not exist: HTTP 404
        ]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.folder.cleanup()

    def run_download(self, **kwargs):
        return download(
            self.observations,
            self.data / "images",
            user_agent="test",
            max_gb_per_hour=5.0,
            max_gb_per_day=24.0,
            workers=2,
            timeout_s=10,
            retries=0,
            openimages_max_side=500,
            jpeg_quality=90,
            failures_path=self.data / "download-failures.csv",
            log=lambda message: None,
            **kwargs,
        )

    def test_download_resume_and_failures(self):
        counts = self.run_download()
        self.assertEqual((counts["ok"], counts["failed"]), (2, 1))
        self.assertTrue((self.data / "images" / "bellis-perennis" / "1.jpg").exists())
        self.assertEqual(permanent_failures(self.data / "download-failures.csv"), {"3": "http-404"})
        self.assertEqual(list((self.data / "images" / "bellis-perennis").glob("*.part")), [])

        again = self.run_download()  # nothing left: files on disk, the 404 is not retried
        self.assertEqual((again["ok"], again["failed"], again["bytes"]), (0, 0, 0))
        self.assertEqual(permanent_failures(self.data / "download-failures.csv"), {"3": "http-404"})
        retried = self.run_download(retry_failed=True)
        self.assertEqual(retried["failed"], 1)

        rows = write_attributions(self.data / "attributions.csv", self.observations, self.data / "images")
        self.assertEqual(rows, 2)
        with (self.data / "attributions.csv").open(encoding="utf-8", newline="") as handle:
            first = next(csv.DictReader(handle))
        self.assertEqual(first["path"], "images/bellis-perennis/1.jpg")
        self.assertEqual(first["license"], "cc-by")
        self.assertEqual(first["observation_url"], "https://www.inaturalist.org/observations/1")

    def test_stops_when_the_disk_is_almost_full(self):
        counts = self.run_download(disk_free=lambda path: 1_000_000_000)  # 1 GB < 2 GB floor
        self.assertEqual((counts["ok"], counts.get("disk_full")), (0, 1))
        self.assertEqual(list((self.data / "images").rglob("*.jpg")), [])

    def test_leftover_part_files_are_removed(self):
        folder = self.data / "images" / "bellis-perennis"
        folder.mkdir(parents=True)
        (folder / "1.jpg.part").write_bytes(b"")  # a write cut short by a killed run
        self.run_download()
        self.assertEqual(list(folder.glob("*.part")), [])
        self.assertTrue((folder / "1.jpg").exists())

    def test_a_full_disk_stops_the_run_and_leaves_no_partial_file(self):
        def full_disk(dest, body, sleep):
            dest.with_name(dest.name + ".part").write_bytes(b"")
            raise OSError(errno.ENOSPC, "No space left on device")

        with mock.patch("floradeck_ml.download._store", full_disk):
            counts = self.run_download()
        self.assertEqual((counts["ok"], counts.get("disk_full")), (0, 1))
        self.assertEqual(list((self.data / "images").rglob("*.part")), [])

    def test_other_write_errors_are_reported_and_retried_later(self):
        def locked(dest, body, sleep):
            raise PermissionError(13, "Access is denied")

        with mock.patch("floradeck_ml.download._store", locked):
            counts = self.run_download()
        self.assertEqual((counts["ok"], counts["failed"]), (0, 3))
        self.assertEqual(permanent_failures(self.data / "download-failures.csv"), {"3": "http-404"})
        self.assertEqual(self.run_download()["ok"], 2, "write errors are not permanent: the next run retries them")


if __name__ == "__main__":
    unittest.main()
