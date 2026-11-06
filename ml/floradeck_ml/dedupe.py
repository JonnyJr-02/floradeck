"""Near-duplicate detection on perceptual hashes (pure functions).

Two images are near-duplicates when their 64-bit hashes differ in at most
``max_distance`` bits. Comparing every pair of ~200,000 hashes is too slow, so the
hashes are cut into ``max_distance + 1`` blocks: by the pigeonhole principle, two
hashes within the distance agree exactly on at least one block, and only hashes
sharing a block value are compared. Groups are the connected components.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Hashable, Sequence

DUPLICATE = "duplicate"
CONFLICT = "duplicate-conflict"


def near_duplicate_groups(hashes: Sequence[int], max_distance: int, bits: int = 64) -> list[list[int]]:
    """Indices of near-duplicate images, as sorted groups of two or more."""
    count = len(hashes)
    parent = list(range(count))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    blocks = max_distance + 1
    bounds = [round(b * bits / blocks) for b in range(blocks + 1)]
    for start, end in zip(bounds, bounds[1:]):
        mask = (1 << (end - start)) - 1
        buckets: dict[int, list[int]] = defaultdict(list)
        for index, value in enumerate(hashes):
            buckets[(value >> start) & mask].append(index)
        for members in buckets.values():
            for position, i in enumerate(members):
                for j in members[position + 1 :]:
                    root_i, root_j = find(i), find(j)
                    if root_i != root_j and (hashes[i] ^ hashes[j]).bit_count() <= max_distance:
                        parent[root_j] = root_i

    groups: dict[int, list[int]] = defaultdict(list)
    for index in range(count):
        groups[find(index)].append(index)
    return sorted((sorted(group) for group in groups.values() if len(group) > 1), key=lambda g: g[0])


def resolve_duplicates(groups: Sequence[Sequence[int]], labels: Sequence[Hashable]) -> dict[int, str]:
    """Which images to drop, and why.

    In a group with a single label the first image (lowest index: the manifest lists
    the preferred tiers first) is kept. A group whose copies carry different labels is
    dropped entirely: at least one label is wrong and there is no way to tell which.
    """
    dropped: dict[int, str] = {}
    for group in groups:
        if len({labels[i] for i in group}) > 1:
            dropped.update({i: CONFLICT for i in group})
        else:
            dropped.update({i: DUPLICATE for i in sorted(group)[1:]})
    return dropped
