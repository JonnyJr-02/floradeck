"""Download helpers, manifest records, the API client cache and the settings file."""

import io
import tempfile
import unittest
from pathlib import Path

from helpers import observation, photo
from PIL import Image

from floradeck_ml import inat
from floradeck_ml.config import ConfigError, Settings, load_settings
from floradeck_ml.download import ByteRateLimiter, prepare_image
from floradeck_ml.paths import DEFAULT_CONFIG
from floradeck_ml.records import image_path, medium_url, parse_inat, read_manifest, write_manifest


class FakeClock:
    def __init__(self):
        self.now = 0.0
        self.slept = []

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.now += seconds


class RateLimiterTest(unittest.TestCase):
    def test_burst_then_average_rate(self):
        fake = FakeClock()
        limiter = ByteRateLimiter(1000.0, burst_bytes=500.0, clock=fake.clock, sleep=fake.sleep)
        limiter.consume(500)  # within the burst
        self.assertEqual(fake.slept, [])
        limiter.consume(1000)  # 1500 bytes: must not finish before t = 1 s
        self.assertAlmostEqual(fake.now, 1.0)
        fake.now += 5.0  # idle time is not banked beyond the schedule
        limiter.consume(1000)
        self.assertEqual(len(fake.slept), 1)

    def test_five_gigabytes_per_hour(self):
        fake = FakeClock()
        rate = 5e9 / 3600
        limiter = ByteRateLimiter(rate, burst_bytes=0, clock=fake.clock, sleep=fake.sleep)
        for _ in range(100):
            limiter.consume(50_000_000)
        self.assertAlmostEqual(fake.now, 3600.0, delta=1.0)


def jpeg_bytes(size=(500, 375), quality=100) -> bytes:
    image = Image.new("RGB", size)
    for x in range(0, size[0], 5):  # some detail so that quality matters
        for y in range(0, size[1], 5):
            image.putpixel((x, y), ((x * 7) % 256, (y * 3) % 256, (x * y) % 256))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality)
    return buffer.getvalue()


class PrepareImageTest(unittest.TestCase):
    def test_high_quality_jpeg_is_recompressed(self):
        original = jpeg_bytes(quality=100)
        stored = prepare_image(original, max_side=None, quality=90)
        self.assertLess(len(stored), 0.85 * len(original))
        self.assertEqual(Image.open(io.BytesIO(stored)).size, (500, 375))

    def test_already_compressed_jpeg_is_kept(self):
        original = jpeg_bytes(quality=85)
        self.assertEqual(prepare_image(original, max_side=None, quality=90), original)
        self.assertEqual(prepare_image(jpeg_bytes(quality=100), max_side=None, quality=0), jpeg_bytes(quality=100))

    def test_large_image_is_resized_and_png_converted(self):
        stored = prepare_image(jpeg_bytes(size=(1024, 768), quality=85), max_side=500, quality=90)
        self.assertEqual(Image.open(io.BytesIO(stored)).size, (500, 375))
        png = io.BytesIO()
        Image.new("RGBA", (300, 300), (255, 0, 0, 128)).save(png, "PNG")
        converted = Image.open(io.BytesIO(prepare_image(png.getvalue(), max_side=None, quality=0)))
        self.assertEqual((converted.format, converted.mode), ("JPEG", "RGB"))


class RecordsTest(unittest.TestCase):
    def test_parse_inat_builds_medium_urls_and_attribution_fields(self):
        raw = {
            "id": 42,
            "observed_on": "2026-04-01",
            "quality_grade": "research",
            "user": {"id": 7, "login": "anna", "name": "Anna"},
            "taxon": {"id": 55563, "name": "Bellis perennis", "rank": "species"},
            "photos": [{
                "id": 99,
                "license_code": "cc-by-nc",
                "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/99/square.jpeg",
                "attribution": "(c) Anna, some rights reserved (CC BY-NC)",
                "original_dimensions": {"width": 2000, "height": 1500},
            }],
        }
        obs = parse_inat(raw, "medium")
        self.assertEqual(obs.key, "inaturalist:42")
        self.assertEqual(obs.observer_key, "inaturalist:7")
        self.assertEqual(obs.photos[0].url, "https://inaturalist-open-data.s3.amazonaws.com/photos/99/medium.jpeg")
        self.assertEqual((obs.photos[0].width, obs.photos[0].license), (2000, "cc-by-nc"))
        self.assertEqual(obs.page_url, "https://www.inaturalist.org/observations/42")

    def test_medium_url(self):
        self.assertEqual(medium_url("https://h/photos/1/square.png", "medium"), "https://h/photos/1/medium.png")

    def test_manifest_round_trip_and_image_path(self):
        obs = observation(3, photos=(photo(30), photo(31)), cls="x")
        obs = obs.__class__(**{**obs.__dict__, "label": "bellis-perennis", "source": "catalog", "tier": "italy/research/annotated"})
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "m.jsonl"
            self.assertEqual(write_manifest(path, [obs, obs]), 2)
            back = list(read_manifest(path))
        self.assertEqual(back[0], obs)
        self.assertEqual(image_path(obs, obs.photos[1]).as_posix(), "bellis-perennis/31.jpg")


class ApiClientTest(unittest.TestCase):
    def test_encode_params_is_stable(self):
        a = inat.encode_params({"b": [3, 1], "a": True, "c": None, "d": {"y", "x"}})
        self.assertEqual(a, "a=true&b=3,1&d=x,y")

    def test_cache_offline_and_budget(self):
        with tempfile.TemporaryDirectory() as folder:
            fake = FakeClock()
            client = inat.ApiClient("https://api.example/v2", "test-agent", Path(folder), max_requests=1,
                                    sleep=fake.sleep, clock=fake.clock)
            calls = []

            def fetch(url):
                calls.append(url)
                return b'{"total_results": 3, "results": []}'

            client._fetch = fetch
            first = client.get("observations", {"taxon_id": 1})
            second = client.get("observations", {"taxon_id": 1})
            self.assertEqual(first, second)
            self.assertEqual(len(calls), 1)
            self.assertEqual(client.cached_requests, 1)
            client.network_requests = 1
            with self.assertRaises(inat.RequestBudgetExceeded):
                client.get("observations", {"taxon_id": 2})
            offline = inat.ApiClient("https://api.example/v2", "test-agent", Path(folder), offline=True)
            self.assertEqual(offline.get("observations", {"taxon_id": 1})["total_results"], 3)
            with self.assertRaises(inat.CacheMiss):
                offline.get("observations", {"taxon_id": 2})

    def test_requests_are_spaced(self):
        fake = FakeClock()
        client = inat.ApiClient("https://api.example/v2", "ua", Path("."), min_interval_s=1.0, sleep=fake.sleep,
                                clock=fake.clock)
        client._wait_turn()
        client._wait_turn()
        fake.now += 0.25
        client._wait_turn()
        self.assertEqual(fake.slept, [1.0, 0.75])


class SettingsTest(unittest.TestCase):
    def test_dataset_toml_matches_the_code_defaults(self):
        self.assertEqual(load_settings(DEFAULT_CONFIG), Settings())

    def test_unknown_keys_and_bad_values_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "s.toml"
            path.write_text("[classes]\ntarget_mx = 10\n", encoding="utf-8")
            with self.assertRaises(ConfigError):
                load_settings(path)
            path.write_text("[download]\nmax_gb_per_hour = 9.0\n", encoding="utf-8")
            with self.assertRaises(ConfigError):
                load_settings(path)
            path.write_text("[classes]\ntarget_max = 500\n[classes.extra_phenology]\nrosa-canina = [\"flowering\"]\n",
                            encoding="utf-8")
            settings = load_settings(path)
            self.assertEqual(settings.classes.target_max, 500)
            self.assertEqual(settings.classes.extra_phenology, {"rosa-canina": ("flowering",)})


if __name__ == "__main__":
    unittest.main()
