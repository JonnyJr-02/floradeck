"""Packing for Kaggle: removed species become altro, sampling, resized zip shards, disk guard."""

import csv
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from PIL import Image

from floradeck_ml.clean import DATASET_FIELDS
from floradeck_ml.pack import EXCLUDED_SOURCE, OutOfSpace, pack, select_rows


def row(label: str, n: int, split: str = "train", source: str = "catalog") -> dict[str, str]:
    values = dict.fromkeys(DATASET_FIELDS, "")
    values.update(path=f"images/{label}/{n}.jpg", label=label, split=split, source=source, group=label, photo_id=str(n))
    return values


def jpeg(size: tuple[int, int], orientation: int | None = None) -> bytes:
    buffer = io.BytesIO()
    image = Image.new("RGB", size, (200, 40, 90))
    exif = image.getexif()
    if orientation:
        exif[0x0112] = orientation
    image.save(buffer, "JPEG", quality=95, exif=exif)
    return buffer.getvalue()


class SelectRowsTest(unittest.TestCase):
    def test_removed_species_become_capped_altro(self):
        rows = [row("a", i) for i in range(5)] + [row("gone", 100 + i, split="val" if i % 2 else "train") for i in range(10)]
        rows.append(row("altro", 999, source="altro/common"))
        kept, classes, given = select_rows(rows, ["a", "b"], excluded_per_class=3)
        self.assertEqual(classes, ["a", "b", "altro"])
        self.assertEqual(given, {"gone": 3})
        moved = [r for r in kept if r["source"] == EXCLUDED_SOURCE]
        self.assertEqual(len(moved), 3)
        self.assertTrue(all(r["label"] == "altro" and r["group"] == "gone" and r["path"].startswith("images/gone/") for r in moved))
        self.assertEqual([r["label"] for r in kept][:5], ["a"] * 5, "rows follow the class order")
        again, _, _ = select_rows(rows, ["a", "b"], excluded_per_class=3)
        self.assertEqual(kept, again, "the choice is deterministic")

    def test_sample_mode(self):
        rows = [row(label, i, split) for label in ("a", "b", "c") for i, split in enumerate(["train"] * 6 + ["val"] * 6)]
        rows = [{**r, "path": f"images/{r['label']}/{r['split']}{r['photo_id']}.jpg"} for r in rows]
        kept, classes, _ = select_rows(rows, ["a", "b", "c"], max_classes=2, sample=2)
        self.assertEqual(classes, ["a", "b", "altro"])
        self.assertEqual(len(kept), 8)  # 2 classes x 2 splits x 2 images


class PackTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        root = Path(self.folder.name)
        self.data, self.out = root / "data", root / "kaggle"
        self.rows = [row("a", 1), row("a", 2, "test"), row("gone", 3), row("altro", 4, source="altro/common")]
        files = {1: jpeg((500, 375)), 2: jpeg((300, 200)), 3: jpeg((400, 300), orientation=6), 4: jpeg((320, 640))}
        for r in self.rows:
            (self.data / r["path"]).parent.mkdir(parents=True, exist_ok=True)
            (self.data / r["path"]).write_bytes(files[int(r["photo_id"])])
        with (self.data / "dataset.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=DATASET_FIELDS)
            writer.writeheader()
            writer.writerows(self.rows)
        with (self.data / "attributions.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["photo_id", "license", "path"])
            writer.writerows([[r["photo_id"], "cc-by", r["path"]] for r in self.rows] + [["9", "cc0", "images/zzz/9.jpg"]])
        self.species = root / "species.json"
        self.species.write_text(json.dumps([{"id": "a", "number": 1, "commonNameIt": "A"}, {"id": "b"}]), encoding="utf-8")

    def tearDown(self):
        self.folder.cleanup()

    def run_pack(self, **kwargs):
        return pack(self.data, self.species, self.out, excluded_per_class=5, workers=1, log=lambda m: None, **kwargs)

    def test_pack_writes_tables_and_resized_shards(self):
        result = self.run_pack(shard_gb=3e-6, min_free_gb=0)
        self.assertEqual(result["empty"], ["b"])
        self.assertEqual(json.loads((self.out / "classes.json").read_text(encoding="utf-8"))["classes"], ["a", "b", "altro"])
        with (self.out / "dataset.csv").open(encoding="utf-8", newline="") as handle:
            packed = {r["photo_id"]: r for r in csv.DictReader(handle)}
        self.assertEqual(sorted(r["label"] for r in packed.values()), ["a", "a", "altro", "altro"])
        self.assertEqual((packed["1"]["width"], packed["1"]["height"]), ("427", "320"), "short side shrunk to 320")
        self.assertEqual((packed["2"]["width"], packed["2"]["height"]), ("300", "200"), "small images keep their size")
        self.assertEqual((packed["3"]["width"], packed["3"]["height"]), ("300", "400"), "EXIF rotation applied")
        with (self.out / "attributions.csv").open(encoding="utf-8", newline="") as handle:
            self.assertEqual(len(list(csv.DictReader(handle))), 4)
        contents = {}
        for shard in sorted(self.out.glob("images-*.zip")):
            with zipfile.ZipFile(shard) as archive:
                contents.update({name: archive.read(name) for name in archive.namelist()})
        self.assertEqual(sorted(contents), sorted(r["path"] for r in self.rows))
        self.assertEqual(contents["images/a/2.jpg"], (self.data / "images/a/2.jpg").read_bytes(), "kept byte for byte")
        with Image.open(io.BytesIO(contents["images/a/1.jpg"])) as image:
            self.assertEqual(image.size, (427, 320))
        self.assertGreater(result["shards"], 1)
        self.assertEqual(list(self.out.glob("*.part")), [])
        self.assertIn("keep this dataset private", (self.out / "README.md").read_text(encoding="utf-8"))

    def test_stops_before_the_disk_is_full(self):
        with self.assertRaises(OutOfSpace):
            self.run_pack(disk_free=lambda path: 10**9, min_free_gb=2.0)
        self.assertEqual(list(self.out.glob("images-*")), [])


if __name__ == "__main__":
    unittest.main()
