import random
import unittest
from collections import Counter, defaultdict

from floradeck_ml.split import TEST, TRAIN, VAL, SplitItem, assign_splits, unit_hash


def synthetic(n_classes=20, per_class=300, observers=900, seed=3):
    """Observers with a long-tailed number of observations, as on iNaturalist."""
    rng = random.Random(seed)
    weights = [1 / (rank + 1) for rank in range(observers)]
    items = []
    for c in range(n_classes):
        for o in range(per_class):
            observer = rng.choices(range(observers), weights)[0]
            items.append(SplitItem(f"obs-{c}-{o}", f"user-{observer}", f"class-{c}"))
    return items


def observers_by_split(items, split):
    result = defaultdict(set)
    for item in items:
        result[split[item.observation]].add(item.observer)
    return result


class SplitTest(unittest.TestCase):
    def test_every_observation_gets_one_split_and_test_observers_are_isolated(self):
        items = synthetic()
        split = assign_splits(items)
        self.assertEqual(set(split), {i.observation for i in items})
        by_split = observers_by_split(items, split)
        self.assertEqual(by_split[TEST] & (by_split[TRAIN] | by_split[VAL]), set())

    def test_fractions_are_close_to_the_target(self):
        items = synthetic()
        counts = Counter(assign_splits(items).values())
        total = sum(counts.values())
        self.assertAlmostEqual(counts[TEST] / total, 0.10, delta=0.05)
        self.assertAlmostEqual(counts[VAL] / total, 0.10, delta=0.03)

    def test_deterministic_and_seeded(self):
        items = synthetic(n_classes=5)
        self.assertEqual(assign_splits(items), assign_splits(list(reversed(items))))
        self.assertNotEqual(assign_splits(items, seed="a"), assign_splits(items, seed="b"))

    def test_small_class_gets_some_test_observations(self):
        items = [SplitItem(f"small-{i}", f"u{i}", "small") for i in range(30)]
        items += [SplitItem(f"big-{i}", f"v{i}", "big") for i in range(2000)]
        split = assign_splits(items, min_test=5)
        small = Counter(split[f"small-{i}"] for i in range(30))
        self.assertGreaterEqual(small[TEST], 3)  # round(0.1 * 30)
        self.assertGreaterEqual(small[TRAIN], 15)
        self.assertGreaterEqual(small[VAL], 1)

    def test_a_single_observer_class_never_goes_entirely_to_test(self):
        # An observer that the seeded hash puts in test, as the only observer of a class.
        name = next(f"solo-{i}" for i in range(1000) if unit_hash("floradeck-v1", "observer", f"solo-{i}") < 0.1)
        items = [SplitItem(f"o{i}", name, "lonely") for i in range(12)]
        split = assign_splits(items)
        self.assertNotIn(TEST, set(split.values()))
        self.assertIn(TRAIN, set(split.values()))

    def test_existing_assignments_are_stable_when_data_grows(self):
        items = synthetic(n_classes=10)
        before = assign_splits(items)
        extra = [SplitItem(f"new-{i}", f"newcomer-{i}", f"class-{i % 10}") for i in range(200)]
        after = assign_splits(items + extra)
        moved = sum(before[k] != after[k] for k in before)
        self.assertLess(moved / len(before), 0.02)

    def test_an_observation_with_two_labels_is_an_error(self):
        with self.assertRaises(ValueError):
            assign_splits([SplitItem("o1", "u", "a"), SplitItem("o1", "u", "b")])

    def test_photos_of_one_observation_share_the_split(self):
        items = [SplitItem("o1", "u1", "a"), SplitItem("o1", "u1", "a"), SplitItem("o2", "u2", "a")]
        self.assertEqual(len(assign_splits(items)), 2)


if __name__ == "__main__":
    unittest.main()
