import unittest

from helpers import catalog_class

from floradeck_ml.altro import choose_common_plants
from floradeck_ml.taxonomy import (
    catalog_classes_containing,
    catalog_taxa_inside,
    class_of,
    lineage,
    nested_exclusions,
    taxon_owner,
)

# A tiny tree: 1 Plantae > 10 genus Viola > 100 V. odorata, 101 V. hirta; 20 genus Ophrys > 200 O. lutea
TAXA = {
    10: {"id": 10, "ancestor_ids": [1, 10]},
    100: {"id": 100, "ancestor_ids": [1, 10, 100]},
    101: {"id": 101, "ancestor_ids": [1, 10, 101]},
    200: {"id": 200, "ancestor_ids": [1, 20, 200]},
}


class TaxonomyTest(unittest.TestCase):
    def test_lineage_includes_the_taxon(self):
        self.assertEqual(lineage({"id": 5, "ancestor_ids": [1, 2]}), {1, 2, 5})
        self.assertEqual(lineage(None), set())

    def test_genus_class_excludes_species_classes_inside_it(self):
        classes = [
            catalog_class("viola", taxon_ids=(10,), level="genus"),
            catalog_class("viola-hirta", taxon_ids=(101,)),
            catalog_class("ophrys-lutea", taxon_ids=(200,)),
        ]
        self.assertEqual(nested_exclusions(classes, TAXA), {"viola": {101}})

    def test_taxa_of_the_same_class_do_not_exclude_each_other(self):
        classes = [catalog_class("viola-group", taxon_ids=(10, 100), level="group")]
        self.assertEqual(nested_exclusions(classes, TAXA), {})

    def test_altro_taxon_inside_or_containing_the_catalogue(self):
        owner = taxon_owner([catalog_class("ophrys-lutea", taxon_ids=(200,)), catalog_class("viola", taxon_ids=(10,))])
        self.assertEqual(catalog_classes_containing({"id": 100, "ancestor_ids": [1, 10, 100]}, owner), {"viola"})
        self.assertEqual(catalog_classes_containing({"id": 20, "ancestor_ids": [1, 20]}, owner), set())
        catalog = {200: TAXA[200], 10: TAXA[10]}
        self.assertEqual(catalog_taxa_inside(20, catalog), {200}, "querying genus Ophrys must exclude O. lutea")
        self.assertEqual(catalog_taxa_inside(10, catalog), set(), "a taxon does not exclude itself")

    def test_class_of_prefers_the_most_specific_taxon(self):
        owner = {10: "viola", 101: "viola-hirta"}
        self.assertEqual(class_of([1, 10, 101], owner), "viola-hirta")
        self.assertEqual(class_of([1, 10, 100], owner), "viola")
        self.assertIsNone(class_of([1, 20], owner))


class CommonPlantsTest(unittest.TestCase):
    def test_skips_catalogue_and_lookalikes_and_respects_the_limit(self):
        owner = {10: "viola"}
        counts = [
            {"count": 900, "taxon": {"id": 100, "name": "Viola odorata", "rank": "species", "ancestor_ids": [1, 10, 100]}},
            {"count": 800, "taxon": {"id": 300, "name": "Hedera helix", "rank": "species", "ancestor_ids": [1, 30, 300]}},
            {"count": 700, "taxon": {"id": 201, "name": "Ophrys apifera", "rank": "species", "ancestor_ids": [1, 20, 201]}},
            {"count": 600, "taxon": {"id": 400, "name": "Rubus idaeus", "rank": "species", "ancestor_ids": [1, 40, 400]}},
            {"count": 500, "taxon": {"id": 500, "name": "Urtica dioica", "rank": "species", "ancestor_ids": [1, 50, 500]}},
        ]
        chosen = choose_common_plants(counts, owner=owner, catalog_taxa={10: TAXA[10]}, lookalike_ids={20}, limit=2)
        self.assertEqual([c.name for c in chosen], ["Hedera helix", "Rubus idaeus"])
        self.assertEqual(chosen[0].italian_observations, 800)
        self.assertEqual(chosen[0].part, "common")


if __name__ == "__main__":
    unittest.main()
