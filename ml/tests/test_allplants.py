"""PlantCLEF prototype helpers: names, preprocessing, model splitting, tar header parsing."""

import hashlib
import io
import json
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "allplants"))

import fetch_tar_member  # noqa: E402
import plantclef  # noqa: E402


class PlantclefTest(unittest.TestCase):
    def test_binomial(self):
        self.assertEqual(plantclef.binomial("Taxus baccata L."), "Taxus baccata")
        self.assertEqual(plantclef.binomial("Dryopteris filix-mas (L.) Schott"), "Dryopteris filix-mas")
        self.assertEqual(plantclef.binomial("Mentha × piperita L."), "Mentha x piperita")

    def test_preprocess_shape_and_centre(self):
        image = Image.new("RGB", (400, 300), (255, 0, 0))
        x = plantclef.preprocess(image, 224)
        self.assertEqual(x.shape, (3, 224, 224))
        self.assertAlmostEqual(float(x[0, 0, 0]), (1 - 0.485) / 0.229, places=3)

    def test_split_rejoins(self):
        with tempfile.TemporaryDirectory() as folder:
            model = Path(folder) / "m.onnx"
            data = np.random.default_rng(0).bytes(2500)
            model.write_bytes(data)
            manifest = plantclef.split_file(model, Path(folder) / "parts", part_bytes=1000)
            self.assertEqual([p["bytes"] for p in manifest["parts"]], [1000, 1000, 500])
            joined = b"".join((Path(folder) / "parts" / p["file"]).read_bytes() for p in manifest["parts"])
            self.assertEqual(joined, data)
            self.assertEqual(manifest["sha256"], hashlib.sha256(data).hexdigest())
            saved = json.loads((Path(folder) / "parts" / "m.parts.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["bytes"], 2500)


class TarWalkTest(unittest.TestCase):
    def test_walk_finds_members_with_long_names(self):
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for name, body in [("a/short.txt", b"hello"), ("a/" + "x" * 120 + "/model.bin", b"\1" * 700)]:
                info = tarfile.TarInfo(name)
                info.size = len(body)
                archive.addfile(info, io.BytesIO(body))
        blob = buffer.getvalue()
        original = fetch_tar_member.get_range
        fetch_tar_member.get_range = lambda url, start, end, tries=6: blob[start:end + 1]
        try:
            members = {path: (offset, size) for path, kind, offset, size in fetch_tar_member.walk("x")}
        finally:
            fetch_tar_member.get_range = original
        long_name = "a/" + "x" * 120 + "/model.bin"
        self.assertIn(long_name, members)
        offset, size = members[long_name]
        self.assertEqual(blob[offset:offset + size], b"\1" * 700)
        self.assertEqual(blob[members["a/short.txt"][0]:][:5], b"hello")


if __name__ == "__main__":
    unittest.main()
