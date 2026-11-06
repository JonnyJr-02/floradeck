import unittest

from helpers import catalog_class

from floradeck_ml.config import InatSettings
from floradeck_ml.tiers import above_species_taxa, class_tiers, leaves_tiers, simple_tiers

PLACES = InatSettings().places
LICENSES = ("cc0", "cc-by", "cc-by-nc")
TAXA = {
    55563: {"id": 55563, "rank": "species", "rank_level": 10},
    47603: {"id": 47603, "rank": "genus", "rank_level": 20},
    1097919: {"id": 1097919, "rank": "complex", "rank_level": 11},
    56134: {"id": 56134, "rank": "species", "rank_level": 10},
}


def names(tiers):
    return [t.name for t in tiers]


class ClassTiersTest(unittest.TestCase):
    def test_wild_species_geography_then_annotation(self):
        tiers = class_tiers(catalog_class(), places=PLACES, licenses=LICENSES, taxa=TAXA)
        self.assertEqual(
            names(tiers),
            [
                "italy/research/annotated",
                "italy/research/unannotated",
                "europe/research/annotated",
                "europe/research/unannotated",
                "world/research/annotated",
                "world/research/unannotated",
            ],
        )
        self.assertTrue(all(t.fill_to == "max" for t in tiers))
        annotated, unannotated = tiers[0].params, tiers[1].params
        self.assertEqual(annotated["term_id"], 12)
        self.assertEqual(annotated["term_value_id"], [13])
        self.assertEqual(annotated["quality_grade"], "research")
        self.assertEqual(annotated["photo_license"], list(LICENSES))
        self.assertEqual(annotated["place_id"], 6973)
        self.assertEqual(unannotated["without_term_id"], 12)
        self.assertEqual(unannotated["month"], [3, 4, 5])
        self.assertNotIn("term_value_id", unannotated)

    def test_places_never_overlap(self):
        tiers = class_tiers(catalog_class(), places=PLACES, licenses=LICENSES, taxa=TAXA)
        europe = tiers[2].params
        world = tiers[4].params
        self.assertEqual((europe["place_id"], europe["not_in_place"]), (97391, 6973))
        self.assertNotIn("place_id", world)
        self.assertEqual(world["not_in_place"], 97391)
        self.assertNotIn("month", tiers[5].params, "seasons differ south of the equator")

    def test_fruit_card_with_extra_flowering_phase(self):
        cls = catalog_class("punica-granatum", phenology=("fruiting", "flowering"))
        tiers = class_tiers(cls, places=PLACES, licenses=LICENSES, taxa=TAXA)
        self.assertEqual(tiers[0].params["term_value_id"], [14, 13])

    def test_genus_class_adds_genus_level_observations(self):
        cls = catalog_class("taraxacum", taxon_ids=(47603,), level="genus")
        tiers = class_tiers(cls, places=PLACES[:1], licenses=LICENSES, taxa=TAXA)
        self.assertEqual(
            names(tiers),
            [
                "italy/research/annotated",
                "italy/research/unannotated",
                "italy/genus-level/annotated",
                "italy/genus-level/unannotated",
                "italy/genus-level-unconfirmed/annotated",
                "italy/genus-level-unconfirmed/unannotated",
            ],
        )
        confirmed, fallback = tiers[2], tiers[4]
        self.assertEqual(confirmed.params["quality_grade"], "needs_id")
        self.assertEqual(confirmed.params["rank"], "genus")
        self.assertEqual(confirmed.params["taxon_id"], [47603])
        self.assertEqual(confirmed.params["identifications"], "most_agree")
        self.assertEqual(confirmed.fill_to, "max")
        self.assertNotIn("identifications", fallback.params)
        self.assertEqual(fallback.fill_to, "min")

    def test_group_class_uses_only_the_above_species_taxa(self):
        cls = catalog_class("muscari", taxon_ids=(1097919, 56134), level="group")
        tiers = class_tiers(cls, places=PLACES[:1], licenses=LICENSES, taxa=TAXA)
        complex_tier = next(t for t in tiers if t.quality == "complex-level")
        self.assertEqual(complex_tier.params["taxon_id"], [1097919])
        self.assertEqual(complex_tier.params["rank"], "complex")
        self.assertEqual(tiers[0].params["taxon_id"], [1097919, 56134])

    def test_species_class_never_uses_needs_id(self):
        cls = catalog_class("muscari-like", taxon_ids=(1097919,), level="species")
        tiers = class_tiers(cls, places=PLACES, licenses=LICENSES, taxa=TAXA)
        self.assertFalse(any(t.params.get("quality_grade") == "needs_id" for t in tiers))

    def test_cultivated_class_adds_captive_casual(self):
        cls = catalog_class("nerium-oleander", taxon_ids=(55563,), cultivated=True)
        tiers = class_tiers(cls, places=PLACES[:1], licenses=LICENSES, taxa=TAXA)
        self.assertEqual(
            names(tiers),
            [
                "italy/research/annotated",
                "italy/research/unannotated",
                "italy/casual/annotated",
                "italy/casual/unannotated",
                "italy/casual-unconfirmed/annotated",
                "italy/casual-unconfirmed/unannotated",
            ],
        )
        casual = tiers[2].params
        self.assertEqual((casual["quality_grade"], casual["captive"], casual["identifications"]), ("casual", "true", "most_agree"))
        self.assertEqual(tiers[4].fill_to, "min")

    def test_nested_exclusions_become_without_taxon_id(self):
        tiers = class_tiers(catalog_class(), places=PLACES, licenses=LICENSES, taxa=TAXA, exclude_taxon_ids={9, 3})
        self.assertTrue(all(t.params["without_taxon_id"] == [3, 9] for t in tiers))

    def test_full_year_species_has_no_month_filter(self):
        tiers = class_tiers(catalog_class(months=tuple(range(1, 13))), places=PLACES, licenses=LICENSES, taxa=TAXA)
        self.assertNotIn("month", tiers[1].params)

    def test_above_species_taxa(self):
        self.assertEqual(above_species_taxa([47603, 55563, 1097919, 999], TAXA), {"complex": [1097919], "genus": [47603]})


class AltroTiersTest(unittest.TestCase):
    def test_simple_tiers_annotated_then_any(self):
        tiers = simple_tiers([42], places=PLACES[:2], licenses=LICENSES, phenology_values=(13,), exclude_taxon_ids=[7])
        self.assertEqual(
            names(tiers),
            ["italy/research/annotated", "italy/research/any", "europe/research/annotated", "europe/research/any"],
        )
        self.assertEqual(tiers[0].params["term_value_id"], [13])
        self.assertNotIn("term_id", tiers[1].params)
        self.assertEqual(tiers[1].params["without_taxon_id"], [7])

    def test_leaves_tiers(self):
        tiers = leaves_tiers([5, 3, 5], places=PLACES, licenses=LICENSES)
        self.assertEqual(names(tiers), ["italy/research/no-flowers-or-fruits", "europe/research/no-flowers-or-fruits"])
        self.assertEqual(tiers[0].params["taxon_id"], [3, 5])
        self.assertEqual(tiers[0].params["term_value_id"], [21])


if __name__ == "__main__":
    unittest.main()
