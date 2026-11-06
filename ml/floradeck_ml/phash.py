"""64-bit perceptual hash (DCT "pHash"), robust to resizing and re-compression.

The image is reduced to 32x32 grey levels, transformed with a 2-D DCT, and each of
the 8x8 lowest-frequency coefficients becomes one bit: above or below their median.
Near-duplicates (the same photo uploaded twice, resized or re-saved) differ by only
a few bits; unrelated photos differ by about 32.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

_SIZE = 32
_LOW = 8


def _dct_matrix(n: int) -> np.ndarray:
    k = np.arange(n)[:, None]
    i = np.arange(n)[None, :]
    matrix = np.cos(np.pi * (2 * i + 1) * k / (2 * n)) * np.sqrt(2.0 / n)
    matrix[0] /= np.sqrt(2.0)
    return matrix


_DCT = _dct_matrix(_SIZE)


def phash(image: Image.Image) -> int:
    grey = image.convert("L").resize((_SIZE, _SIZE), Image.Resampling.LANCZOS)
    pixels = np.asarray(grey, dtype=np.float64)
    coefficients = _DCT @ pixels @ _DCT.T
    low = coefficients[:_LOW, :_LOW].ravel()
    bits = low > np.median(low)
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return value


def to_hex(value: int) -> str:
    return f"{value:016x}"


def from_hex(text: str) -> int:
    return int(text, 16)


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()
