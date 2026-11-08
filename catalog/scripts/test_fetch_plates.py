import unittest

from fetch_plates import names_taxon, normalise, score, source_of


class PlateSelectionTest(unittest.TestCase):
    def test_normalise_drops_accents_and_separators(self):
        self.assertEqual(normalise("Köhler–s_Medizinal-Pflanzen"), "kohler s medizinal pflanzen")

    def test_title_must_name_the_taxon(self):
        self.assertTrue(names_taxon("Illustration Bellis perennis0.jpg", "Bellis perennis"))
        self.assertTrue(names_taxon("Bellis_perennis_Sturm9.jpg", "Bellis perennis"))
        # A mislabelled herbal page in the daisy category names another plant.
        self.assertFalse(names_taxon("1479 Auslasser Primula veris.jpg", "Bellis perennis"))
        # "perennis" alone (another genus) is not enough.
        self.assertFalse(names_taxon("Mercurialis perennis Sturm.jpg", "Bellis perennis"))

    def test_group_markers_are_ignored(self):
        self.assertTrue(names_taxon("Dianthus carthusianorum Sturm2.jpg", "Dianthus gr. carthusianorum"))

    def test_source_comes_from_title_or_categories(self):
        self.assertEqual(source_of("Illustration Papaver rhoeas0.jpg", ["Flora von Deutschland Österreich und der Schweiz (1885)"]), "thome")
        self.assertEqual(source_of("180 Bellis perennis L.jpg", ["Bilder ur Nordens Flora"]), "lindman")
        self.assertIsNone(source_of("Bellis perennis henriette.jpg", ["Botanical illustrations"]))

    def test_only_public_domain_files_from_a_known_flora(self):
        thome = ["Flora von Deutschland Österreich und der Schweiz (1885)"]
        self.assertIsNotNone(score("File:Illustration Bellis perennis0.jpg", thome, "Public domain", "Bellis perennis"))
        self.assertIsNone(score("File:Illustration Bellis perennis0.jpg", thome, "CC BY-SA 4.0", "Bellis perennis"))
        self.assertIsNone(score("File:Bellis perennis.svg", thome, "Public domain", "Bellis perennis"))
        # Flora Batava scans its French description pages next to the plates.
        self.assertIsNone(score("File:Ranunculus Ficaria (modern=Ficaria verna subsp. verna) - Pl0076 - DescriptionFR01 - FloraBatava-KB-v01.jpg", ["Flora Batava"], "Public domain", "Ficaria verna"))
        # Sturm's scanned description page is text, not a plate.
        self.assertIsNone(score("File:Bellis perennis Sturm DESC.JPG", ["Sturm"], "Public domain", "Bellis perennis"))

    def test_thome_ranks_above_flora_batava(self):
        thome = score("File:Illustration Bellis perennis0.jpg", ["Flora von Deutschland (Thomé)"], "Public domain", "Bellis perennis")
        batava = score("File:Bellis perennis — Flora Batava — Volume v1.jpg", ["Flora Batava"], "PD-old", "Bellis perennis")
        self.assertGreater(thome[0], batava[0])


if __name__ == "__main__":
    unittest.main()
