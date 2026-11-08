import threading
import time
import unittest
from dataclasses import replace

from helpers import HOST, observation, photo

from floradeck_ml.records import eligible_photos
from floradeck_ml.selection import Cap, by_observer, claim, parallel_map, select, trim_photos
from floradeck_ml.tiers import Tier


class FakeApi:
    """Serves observations per tier, newest (highest id) first, paginated by id_below."""

    def __init__(self, pools: dict[str, list], page_size: int = 3):
        self.pools = {name: sorted(obs, key=lambda o: -int(o.id)) for name, obs in pools.items()}
        self.page_size = page_size
        self.calls: list[tuple[str, int | None]] = []

    def tier(self, name: str, fill_to: str = "max") -> Tier:
        return Tier(name=name, place=name.split("/")[0], params={}, fill_to=fill_to, page_size=self.page_size)

    def fetch(self, tier: Tier, id_below: int | None):
        self.calls.append((tier.name, id_below))
        pool = self.pools.get(tier.name, [])
        items = [o for o in pool if id_below is None or int(o.id) < id_below]
        return items[: self.page_size], len(pool)


def ids(selection):
    return [int(o.id) for o in selection.observations]


class SelectTest(unittest.TestCase):
    def test_fills_tiers_in_order_and_stops_at_target_max(self):
        api = FakeApi({
            "italy/a": [observation(i, observer=i) for i in range(1, 6)],
            "italy/b": [observation(i, observer=i) for i in range(10, 20)],
            "europe/a": [observation(i, observer=i) for i in range(30, 40)],
        })
        tiers = [api.tier("italy/a"), api.tier("italy/b"), api.tier("europe/a")]
        result = select(tiers, api.fetch, key="k", label="k", source="catalog", target_min=2, target_max=7)
        self.assertEqual(ids(result), [5, 4, 3, 2, 1, 19, 18])
        self.assertFalse(result.tiers[2].queried, "a tier is not queried once the target is met")
        self.assertEqual(result.tiers[0].available, 5)
        self.assertTrue(all(o.label == "k" and o.group == "k" for o in result.observations))
        self.assertEqual(result.observations[0].tier, "italy/a")

    def test_pagination_uses_the_smallest_id_and_stops_on_a_short_page(self):
        api = FakeApi({"italy/a": [observation(i, observer=i) for i in range(1, 8)]}, page_size=3)
        select([api.tier("italy/a")], api.fetch, key="k", label="k", source="s", target_min=1, target_max=100)
        self.assertEqual(api.calls, [("italy/a", None), ("italy/a", 5), ("italy/a", 2)])

    def test_observer_cap_is_relaxed_only_below_target_min(self):
        pool = [observation(i, observer=1) for i in range(1, 6)] + [observation(i, observer=i) for i in (10, 11)]
        api = FakeApi({"italy/a": pool}, page_size=10)
        tiers = [api.tier("italy/a")]
        capped = select(tiers, api.fetch, key="k", label="k", source="s", target_min=3, target_max=10, caps=[by_observer(2)])
        self.assertEqual(ids(capped), [11, 10, 5, 4])
        self.assertEqual(capped.relaxed, 0)
        self.assertEqual(capped.tiers[0].capped, 3)

        relaxed = select(tiers, api.fetch, key="k", label="k", source="s", target_min=6, target_max=10, caps=[by_observer(2)])
        self.assertEqual(ids(relaxed), [11, 10, 5, 4, 3, 2])
        self.assertEqual(relaxed.relaxed, 2)
        self.assertEqual(relaxed.tiers[0].taken, 6)

    def test_fallback_tiers_only_fill_up_to_target_min(self):
        api = FakeApi({
            "italy/a": [observation(1, observer=1)],
            "italy/fallback": [observation(i, observer=i) for i in range(10, 20)],
        }, page_size=20)
        tiers = [api.tier("italy/a"), api.tier("italy/fallback", fill_to="min")]
        result = select(tiers, api.fetch, key="k", label="k", source="s", target_min=4, target_max=10)
        self.assertEqual(ids(result), [1, 19, 18, 17])
        self.assertTrue(result.tiers[1].fallback)

        enough = FakeApi({"italy/a": [observation(i, observer=i) for i in range(1, 6)],
                          "italy/fallback": [observation(30, observer=30)]}, page_size=20)
        result = select([enough.tier("italy/a"), enough.tier("italy/fallback", fill_to="min")], enough.fetch,
                        key="k", label="k", source="s", target_min=4, target_max=10)
        self.assertEqual(ids(result), [5, 4, 3, 2, 1])
        self.assertFalse(result.tiers[1].queried)

    def test_duplicates_and_taken_observations_are_skipped(self):
        shared = observation(5, observer=5)
        api = FakeApi({"italy/a": [shared, observation(4, observer=4)], "italy/b": [shared, observation(3, observer=3)]},
                      page_size=10)
        result = select([api.tier("italy/a"), api.tier("italy/b")], api.fetch, key="k", label="k", source="s",
                        target_min=1, target_max=10, taken_observations={"inaturalist:4"})
        self.assertEqual(ids(result), [5, 3])
        self.assertEqual(result.tiers[0].duplicates, 1)
        self.assertEqual(result.tiers[1].duplicates, 1)

    def test_photo_filter_and_taken_photos(self):
        api = FakeApi({"italy/a": [
            observation(3, observer=3, photos=(photo(30, license="cc-by-sa"),)),
            observation(2, observer=2, photos=(photo(20), photo(21))),
            observation(1, observer=1, photos=(photo(10),)),
        ]}, page_size=10)
        only_open = lambda photos: [p for p in photos if p.license == "cc-by"]  # noqa: E731
        result = select([api.tier("italy/a")], api.fetch, key="k", label="k", source="s", target_min=1, target_max=10,
                        photo_filter=only_open, taken_photos={"10"})
        self.assertEqual(ids(result), [2])
        self.assertEqual(result.tiers[0].no_photo, 2)
        self.assertEqual([p.id for p in result.observations[0].photos], ["20", "21"])

    def test_class_cap(self):
        api = FakeApi({"italy/a": [observation(i, observer=i, cls="a" if i < 5 else "b") for i in range(1, 9)]},
                      page_size=10)
        cap = Cap("class", lambda o: o.extra["cls"], 2)
        result = select([api.tier("italy/a")], api.fetch, key="k", label="k", source="s", target_min=4, target_max=4,
                        caps=[cap])
        self.assertEqual(ids(result), [8, 7, 4, 3])


class AfterSelectionTest(unittest.TestCase):
    def selection(self, n_obs, target_min):
        api = FakeApi({"italy/a": [observation(i, observer=i, photos=(photo(i * 10), photo(i * 10 + 1)))
                                   for i in range(1, n_obs + 1)]}, page_size=50)
        return select([api.tier("italy/a")], api.fetch, key="k", label="k", source="s",
                      target_min=target_min, target_max=100)

    def test_trim_photos_keeps_more_for_small_classes(self):
        big = self.selection(5, target_min=3)
        trim_photos(big, 1, 2)
        self.assertEqual(big.images, 5)
        small = self.selection(2, target_min=3)
        trim_photos(small, 1, 2)
        self.assertEqual(small.images, 4)

    def test_claim_drops_what_an_earlier_selection_took(self):
        first, second = self.selection(3, 1), self.selection(4, 1)
        taken_obs, taken_photos = set(), set()
        self.assertEqual(claim(first, taken_obs, taken_photos), 0)
        self.assertEqual(claim(second, taken_obs, taken_photos), 3)
        self.assertEqual(ids(second), [4])
        self.assertIn("41", taken_photos)

    def test_claim_drops_photos_already_used(self):
        a = self.selection(1, 1)
        taken_obs, taken_photos = set(), {"10"}
        claim(a, taken_obs, taken_photos)
        self.assertEqual([p.id for p in a.observations[0].photos], ["11"])


class EligiblePhotosTest(unittest.TestCase):
    def check(self, *photos, long_side=500):
        return [p.id for p in eligible_photos(photos, licenses=("cc0", "cc-by", "cc-by-nc"), host=HOST,
                                              resized_long_side=long_side, min_side=224, max_aspect=3.0)]

    def test_licence_host_and_size(self):
        ok = photo(1)  # 2000x1500 -> 500x375
        bad_licence = photo(2, license="cc-by-nd")
        too_small = photo(3, width=400, height=200)  # smaller than "medium": stays 400x200
        thin = photo(4, width=4000, height=1000)  # 500x125 once resized
        unknown = photo(6, width=None, height=None)  # checked again after download
        self.assertEqual(self.check(ok, bad_licence, too_small, thin, unknown), ["1", "6"])
        other_host = replace(ok, url="https://static.inaturalist.org/photos/1/medium.jpg")
        self.assertEqual(self.check(other_host), [])

    def test_aspect_ratio(self):
        panorama = photo(5, width=3000, height=1100)  # aspect 2.7
        strip = photo(8, width=3100, height=1000)  # aspect 3.1
        self.assertEqual(self.check(panorama, strip, long_side=2048), ["5"])


class ParallelMapTest(unittest.TestCase):
    def test_keeps_order_and_uses_threads(self):
        seen = set()

        def slow(x):
            seen.add(threading.get_ident())
            time.sleep(0.02 * (5 - x))
            return x * x

        self.assertEqual(list(parallel_map(slow, range(5), 3)), [0, 1, 4, 9, 16])
        self.assertGreater(len(seen), 1)
        self.assertEqual(list(parallel_map(lambda x: x + 1, [1, 2], 1)), [2, 3])


if __name__ == "__main__":
    unittest.main()
