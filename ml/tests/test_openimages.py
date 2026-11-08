import unittest

from floradeck_ml.openimages import (
    CC_BY_2,
    images_without_plants,
    observation_from_row,
    plant_label_ids,
    sample_ids,
)


class PlantLabelsTest(unittest.TestCase):
    def test_plant_names_match(self):
        names = ["Flower", "Houseplant", "Tree", "Rose", "Strawberries", "Flowerpot", "Sunflower", "Natural landscape",
                 "Leaf", "Garden", "Pineapple", "Grapefruit", "Fruit", "Evergreen", "Wildflower", "Botany", "Vegetables"]
        classes = [(f"/m/{i}", name) for i, name in enumerate(names)]
        self.assertEqual(plant_label_ids(classes), {mid for mid, _ in classes})

    def test_everyday_names_do_not_match(self):
        names = ["Person", "Car", "Firefighter", "Figure", "Dog", "Building", "Table", "Plate", "Sky", "Treehouse"]
        self.assertEqual(plant_label_ids((f"/m/{i}", n) for i, n in enumerate(names)), set())


class CandidatesTest(unittest.TestCase):
    def test_images_without_positive_plant_labels(self):
        labels = [
            ("a", "/m/person", "1"),
            ("a", "/m/flower", "0"),  # verified absent: fine
            ("b", "/m/car", "1"),
            ("b", "/m/tree", "1"),
            ("c", "/m/flower", "0"),  # no positive label at all
        ]
        self.assertEqual(images_without_plants(labels, {"/m/flower", "/m/tree"}), {"a"})

    def test_sample_is_deterministic(self):
        ids = [f"id{i}" for i in range(100)]
        self.assertEqual(sample_ids(ids, 10, "s"), sample_ids(list(reversed(ids)), 10, "s"))
        self.assertNotEqual(sample_ids(ids, 10, "s"), sample_ids(ids, 10, "t"))

    def test_rows_need_cc_by_2(self):
        row = {"ImageID": "abc", "License": CC_BY_2, "Author": "Jo", "AuthorProfileURL": "https://flickr.com/people/jo",
               "OriginalLandingURL": "https://flickr.com/photos/jo/1"}
        obs = observation_from_row(row)
        self.assertEqual(obs.photos[0].id, "oi-abc")
        self.assertEqual(obs.photos[0].url, "https://open-images-dataset.s3.amazonaws.com/validation/abc.jpg")
        self.assertEqual(obs.observer_key, "openimages:https://flickr.com/people/jo")
        self.assertIsNone(observation_from_row({**row, "License": "https://creativecommons.org/licenses/by-nc/2.0/"}))


if __name__ == "__main__":
    unittest.main()
