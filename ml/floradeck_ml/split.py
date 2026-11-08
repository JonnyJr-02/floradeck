"""Train/val/test split (pure functions).

- Photos never leave their observation: the unit of the split is the observation.
- The test set is also grouped by observer, across all classes: a person is either
  entirely in test or not at all. Same person means same camera, same places and the
  same way of framing, so sharing observers would make the test estimate optimistic;
  test observers are as new to the model as our two phones will be.
- Assignments come from seeded hashes, so they are stable: adding observations later
  does not move the existing ones.
- Small classes are repaired: whole observers move into test until each class has a
  few test observations (never taking more than half of the class), and a class whose
  test share is over half gets observers back. Validation is drawn by observation from
  what is left, with a small minimum per class.
"""

from __future__ import annotations

import hashlib
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

TRAIN, VAL, TEST = "train", "val", "test"
MAX_TEST_SHARE = 0.5


@dataclass(frozen=True)
class SplitItem:
    observation: str
    observer: str
    label: str


def unit_hash(seed: str, kind: str, key: str) -> float:
    digest = hashlib.sha256(f"{seed}|{kind}|{key}".encode()).digest()
    return int.from_bytes(digest[:8], "big") / 2**64


def _wanted(count: int, fraction: float, minimum: int) -> int:
    if count < 2:
        return 0
    return min(minimum, max(1, round(fraction * count)))


def assign_splits(
    items: Iterable[SplitItem],
    *,
    test: float = 0.10,
    val: float = 0.10,
    seed: str = "floradeck-v1",
    min_test: int = 10,
    min_val: int = 5,
) -> dict[str, str]:
    """Map each observation key to "train", "val" or "test"."""
    label_of: dict[str, str] = {}
    observer_of: dict[str, str] = {}
    for item in items:
        if label_of.setdefault(item.observation, item.label) != item.label:
            raise ValueError(f"observation {item.observation} has two labels")
        observer_of.setdefault(item.observation, item.observer)

    observations_by_label: dict[str, list[str]] = defaultdict(list)
    per_label: dict[str, Counter] = defaultdict(Counter)  # label -> observer -> observations
    for observation in sorted(label_of):
        label = label_of[observation]
        observations_by_label[label].append(observation)
        per_label[label][observer_of[observation]] += 1
    observer_total = Counter(observer_of.values())
    observer_rank = {o: unit_hash(seed, "observer", o) for o in observer_total}

    in_test = {o for o, rank in observer_rank.items() if rank < test}

    def test_count(label: str) -> int:
        return sum(n for o, n in per_label[label].items() if o in in_test)

    labels = sorted(observations_by_label, key=lambda lab: (len(observations_by_label[lab]), lab))
    # 1. Give back observers from classes where test took more than half.
    for label in labels:
        total = len(observations_by_label[label])
        while test_count(label) > MAX_TEST_SHARE * total:
            # the test observer with the fewest observations in other classes
            candidates = [o for o in per_label[label] if o in in_test]
            out = min(candidates, key=lambda o: (observer_total[o] - per_label[label][o], observer_rank[o]))
            in_test.discard(out)
    # 2. Move observers into test until each class has a few test observations.
    for label in labels:
        total = len(observations_by_label[label])
        wanted = _wanted(total, test, min_test)
        while (current := test_count(label)) < wanted:
            room = MAX_TEST_SHARE * total - current
            candidates = [o for o, n in per_label[label].items() if o not in in_test and n <= room]
            if not candidates:
                break
            # smallest footprint elsewhere first, then the fewest observations here
            chosen = min(candidates, key=lambda o: (observer_total[o] - per_label[label][o], per_label[label][o], observer_rank[o]))
            in_test.add(chosen)

    split: dict[str, str] = {}
    val_share = val / (1.0 - test)
    for label in labels:
        rest = []
        for observation in observations_by_label[label]:
            if observer_of[observation] in in_test:
                split[observation] = TEST
            else:
                rest.append(observation)
        ranked = sorted(rest, key=lambda o: unit_hash(seed, "observation", o))
        chosen_val = {o for o in ranked if unit_hash(seed, "observation", o) < val_share}
        wanted = _wanted(len(rest), val_share, min_val)
        for observation in ranked:
            if len(chosen_val) >= wanted:
                break
            chosen_val.add(observation)
        if len(rest) - len(chosen_val) < 1 and rest:  # keep at least one training observation
            chosen_val.discard(ranked[-1])
        for observation in rest:
            split[observation] = VAL if observation in chosen_val else TRAIN
    return split


def split_counts(split: dict[str, str], label_of: dict[str, str]) -> dict[str, Counter]:
    counts: dict[str, Counter] = defaultdict(Counter)
    for observation, part in split.items():
        counts[label_of[observation]][part] += 1
    return counts
