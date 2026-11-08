"""Unit tests for the catalog helpers and the validator.

Run from the repository root:
    py -3.13 -m unittest discover -s catalog/scripts -p "test_*.py"
"""

from __future__ import annotations

import copy
import unittest

from catalog_lib import altitude_label, area_shares, compress_months, regions_label, selected_months
from validate_catalog import validate


class CompressMonthsTest(unittest.TestCase):
    def test_simple_range(self):
        self.assertEqual(compress_months({4, 5, 6}), "apr–giu")

    def test_range_across_new_year(self):
        self.assertEqual(compress_months({11, 12, 1, 2}), "nov–feb")

    def test_several_runs_and_single_month(self):
        self.assertEqual(compress_months({3, 4, 5, 10}), "mar–mag, ott")

    def test_whole_year_and_empty(self):
        self.assertEqual(compress_months(set(range(1, 13))), "tutto l'anno")
        self.assertEqual(compress_months(set()), "—")


class SelectedMonthsTest(unittest.TestCase):
    def test_uses_phenology_annotations_when_enough(self):
        stats = {"itPhenologyMonths": {"4": 100, "5": 90, "6": 20, "7": 10}, "itMonths": {"1": 500}}
        self.assertEqual(selected_months(stats, "flowering"), ([4, 5, 6], False))

    def test_falls_back_to_all_observations(self):
        stats = {"itPhenologyMonths": {"4": 5}, "itMonths": {"1": 100, "2": 50, "3": 10}}
        self.assertEqual(selected_months(stats, "flowering"), ([1, 2], True))

    def test_fruits_need_a_higher_share(self):
        stats = {"itPhenologyMonths": {"9": 100, "10": 30, "4": 20}}
        self.assertEqual(selected_months(stats, "fruiting")[0], [9])
        self.assertEqual(selected_months(stats, "flowering")[0], [4, 9, 10])


class AreasTest(unittest.TestCase):
    def test_baseline_corrects_observer_density(self):
        stats = {"areas": {"north": 60, "center": 20, "south": 20}}
        baseline = {"north": 600, "center": 200, "south": 200}
        self.assertEqual(area_shares(stats, baseline), [33, 33, 33])

    def test_too_few_observations(self):
        self.assertIsNone(area_shares({"areas": {"north": 5, "center": 1, "south": 0}}, {}))

    def test_region_labels(self):
        self.assertEqual(regions_label([34, 33, 33]), "Tutta Italia")
        self.assertEqual(regions_label([90, 8, 2]), "Soprattutto al Nord")
        self.assertEqual(regions_label([2, 20, 78]), "Soprattutto al Sud e nelle isole")
        self.assertEqual(regions_label([55, 45, 0]), "Nord e Centro")
        self.assertEqual(regions_label([5, 50, 45]), "Centro, Sud e isole")
        self.assertEqual(regions_label(None), "")


class AltitudeTest(unittest.TestCase):
    def test_rounds_outwards_to_hundreds(self):
        self.assertEqual(altitude_label({"p05": 8, "p95": 1308}), "0–1400 m")
        self.assertEqual(altitude_label({"p05": 1495, "p95": 2665}), "1400–2700 m")

    def test_sea_level_species_and_missing_data(self):
        self.assertEqual(altitude_label({"p05": 0, "p95": 10}), "0–100 m")
        self.assertEqual(altitude_label({"n": 3}), "")


def make_catalog():
    """A minimal valid catalogue: one colour album of 20 species, the last one legendary."""
    albums = [{"id": "rossi", "name": "Rossi", "description": "", "order": 1, "colors": ["rosso"], "speciesCount": 20, "legendarySpeciesId": "s20"}]
    species = []
    for n in range(1, 21):
        species.append({
            "id": f"s{n}", "number": n, "albumId": "rossi", "albums": [{"albumId": "rossi", "number": n}],
            "habitatGroup": "prati", "scientificName": "X y", "taxonLevel": "species",
            "commonNameIt": "Nome", "family": "Fam", "rarity": "legendary" if n == 20 else "common",
            "dominantColors": ["rosso"], "phenology": "flowering", "bloomMonths": [4, 5], "habitat": "Prati",
            "altitude": "0–500 m", "regions": "Tutta Italia", "sizeNote": "1 cm",
            "description": "Una frase. Due frasi.", "funFact": "Curiosità.", "cultivated": False,
            "protected": False, "protectionNote": "", "toxic": False, "toxicNote": "",
            "lookalikes": [], "lookalikesOutside": [], "modelLabels": ["X y"], "inatTaxonIds": [n],
            "textStatus": "da-verificare",
        })
    return species, albums


class ValidatorTest(unittest.TestCase):
    def test_minimal_catalogue_is_valid(self):
        errors, _ = validate(*make_catalog())
        self.assertEqual(errors, [])

    def test_album_needs_exactly_one_legendary(self):
        species, albums = make_catalog()
        species[0]["rarity"] = "legendary"
        errors, _ = validate(species, albums)
        self.assertTrue(any("2 legendary species" in e for e in errors))

    def test_rare_tier_is_gone(self):
        species, albums = make_catalog()
        species[0]["rarity"] = "rare"
        errors, _ = validate(species, albums)
        self.assertTrue(any("rare tier is gone" in e for e in errors))

    def test_a_species_in_two_albums_is_numbered_in_both(self):
        species, albums = make_catalog()
        albums.append({"id": "rosa", "name": "Rosa", "description": "", "order": 2, "colors": ["rosa"], "speciesCount": 10, "legendarySpeciesId": "s20"})
        for n, entry in enumerate(species[:10], start=1):
            entry["albums"].append({"albumId": "rosa", "number": n})
        errors, _ = validate(species, albums)
        # "rosa" has no legendary species of its own; the numbering of both albums is fine.
        self.assertTrue(any("album rosa: 0 legendary" in e for e in errors))
        self.assertFalse(any("card numbers" in e for e in errors))

    def test_lookalikes_must_exist_and_unknown_colours_fail(self):
        species, albums = make_catalog()
        species[1]["lookalikes"] = ["does-not-exist"]
        species[2]["dominantColors"] = ["verde"]
        errors, _ = validate(species, albums)
        self.assertTrue(any("does-not-exist" in e for e in errors))
        self.assertTrue(any("dominantColors" in e for e in errors))

    def test_album_size_is_enforced(self):
        species, albums = make_catalog()
        species = [s for s in species if s["id"] not in {f"s{n}" for n in range(1, 12)}]
        errors, _ = validate(species, albums)
        self.assertTrue(any("9 species" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
