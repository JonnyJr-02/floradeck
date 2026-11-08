import io
import random
import unittest

import numpy as np
from PIL import Image, ImageFilter

from floradeck_ml.dedupe import CONFLICT, DUPLICATE, near_duplicate_groups, resolve_duplicates
from floradeck_ml.phash import from_hex, hamming, phash, to_hex


def synthetic_photo(seed: int, size=(500, 375)) -> Image.Image:
    """Smooth random blobs: structured like a photo, different for every seed."""
    rng = np.random.default_rng(seed)
    small = rng.integers(0, 256, size=(6, 8, 3), dtype=np.uint8)
    image = Image.fromarray(small, "RGB").resize(size, Image.Resampling.BICUBIC)
    return image.filter(ImageFilter.GaussianBlur(3))


def recompress(image: Image.Image, quality: int, scale: float = 1.0) -> Image.Image:
    if scale != 1.0:
        image = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality)
    return Image.open(io.BytesIO(buffer.getvalue()))


class PhashTest(unittest.TestCase):
    def test_resized_and_recompressed_copies_stay_close(self):
        for seed in range(5):
            original = synthetic_photo(seed)
            copy = recompress(original, quality=60, scale=0.6)
            self.assertLessEqual(hamming(phash(original), phash(copy)), 4, f"seed {seed}")

    def test_different_photos_are_far_apart(self):
        hashes = [phash(synthetic_photo(seed)) for seed in range(12)]
        distances = [hamming(a, b) for i, a in enumerate(hashes) for b in hashes[i + 1 :]]
        self.assertGreater(min(distances), 8)
        self.assertGreater(sum(distances) / len(distances), 20)

    def test_hash_is_64_bit_and_hex_round_trips(self):
        value = phash(synthetic_photo(1))
        self.assertLess(value, 2**64)
        self.assertEqual(len(to_hex(value)), 16)
        self.assertEqual(from_hex(to_hex(value)), value)


def brute_force_groups(hashes, max_distance):
    parent = list(range(len(hashes)))

    def find(i):
        while parent[i] != i:
            i = parent[i]
        return i

    for i in range(len(hashes)):
        for j in range(i + 1, len(hashes)):
            if hamming(hashes[i], hashes[j]) <= max_distance:
                parent[find(j)] = find(i)
    groups = {}
    for i in range(len(hashes)):
        groups.setdefault(find(i), []).append(i)
    return sorted((g for g in groups.values() if len(g) > 1), key=lambda g: g[0])


class DedupeTest(unittest.TestCase):
    def test_matches_brute_force_on_random_hashes_with_planted_copies(self):
        rng = random.Random(7)
        hashes = [rng.getrandbits(64) for _ in range(400)]
        for _ in range(80):  # plant near-copies with 0..6 flipped bits
            base = rng.choice(hashes)
            for bit in rng.sample(range(64), rng.randint(0, 6)):
                base ^= 1 << bit
            hashes.append(base)
        rng.shuffle(hashes)
        for distance in (0, 2, 4, 6):
            self.assertEqual(near_duplicate_groups(hashes, distance), brute_force_groups(hashes, distance), distance)

    def test_chains_form_one_group(self):
        a = 0
        b = a ^ 0b111  # 3 bits from a
        c = b ^ (0b111 << 10)  # 3 bits from b, 6 from a
        self.assertEqual(near_duplicate_groups([a, b, c, 2**64 - 1], 4), [[0, 1, 2]])

    def test_resolution_keeps_the_first_copy_or_drops_conflicts(self):
        groups = [[0, 3], [1, 2, 4]]
        labels = ["bellis", "taraxacum", "taraxacum", "bellis", "altro"]
        self.assertEqual(resolve_duplicates(groups, labels), {3: DUPLICATE, 1: CONFLICT, 2: CONFLICT, 4: CONFLICT})


if __name__ == "__main__":
    unittest.main()
