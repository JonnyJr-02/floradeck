import unittest
from dataclasses import replace

from helpers import observation

from floradeck_ml.config import Settings
from floradeck_ml.plan import selection_summary
from floradeck_ml.report import render_altro_sources, render_report
from floradeck_ml.selection import Selection, TierOutcome


def selection(key, source, n, tier, target_min=300, label=None):
    s = Selection(key=key, label=label or key, source=source, target_min=target_min, target_max=800)
    s.observations = [replace(observation(i, observer=i % 7), tier=tier) for i in range(1, n + 1)]
    parts = tier.split("/") + ["", ""]
    s.tiers = [TierOutcome(tier, parts[0], parts[1], tier.endswith("/annotated"), False,
                           queried=True, available=n, pages=1, taken=n)]
    return s


class ReportTest(unittest.TestCase):
    def document(self):
        selections = [
            selection("bellis-perennis", "catalog", 800, "italy/research/annotated"),
            selection("crocus-sativus", "catalog", 120, "world/casual/unannotated"),
            selection("lookalike/Erigeron annuus", "altro/lookalike", 90, "italy/research/any", 100, "altro"),
            selection("common/Hedera helix", "altro/common", 20, "italy/research/any", 20, "altro"),
            selection("leaves", "altro/leaves", 50, "italy/research/no-flowers-or-fruits", 2000, "altro"),
            selection("openimages", "altro/openimages", 10, "validation", 10, "altro"),
        ]
        return {
            "created": "2026-11-06T18:00:00",
            "partial": False,
            "settings": Settings().snapshot(),
            "api": {"networkRequests": 10, "cachedRequests": 5, "networkBytes": 1000},
            "taxaProblems": [],
            "selections": [selection_summary(s) for s in selections],
            "altroSources": [
                {"part": "lookalike", "name": "Erigeron annuus", "taxonId": 76897, "rank": "species",
                 "inatName": "Erigeron annuus", "exclude": [], "listedBy": ["bellis-perennis"],
                 "italianObservations": None, "skipReason": ""},
                {"part": "lookalike", "name": "Ophrys", "taxonId": None, "rank": "", "inatName": "", "exclude": [],
                 "listedBy": ["ophrys-x"], "italianObservations": None, "skipReason": "not found on iNaturalist"},
                {"part": "common", "name": "Hedera helix", "taxonId": 1, "rank": "species", "inatName": "Hedera helix",
                 "exclude": [], "listedBy": [], "italianObservations": 5000, "skipReason": ""},
            ],
            "openimages": {"images": 41620, "candidates": 20000, "plant_labels": 900, "selected": 10},
            "sizes": {
                "inaturalist": {"sample": 100, "mean": 180_000.0, "stdev": 60_000.0, "median": 175_000.0, "missing": 0},
                "openimages": {"sample": 10, "mean": 250_000.0, "stdev": 80_000.0, "median": 240_000.0, "missing": 0},
            },
        }

    def test_plan_report(self):
        text = render_report(self.document())
        self.assertIn("| Catalogo | 2 | 920 | 920 |", text)
        self.assertIn("`crocus-sativus` (120)", text)
        self.assertIn("foto extra-europee", text)
        self.assertIn("Sosia `Ophrys` escluso", text)
        self.assertIn("Scene senza piante (Open Images)", text)
        self.assertIn("0.2 GB", text)  # 1,090 iNaturalist images x 180 KB + 10 x 250 KB

    def test_altro_sources(self):
        text = render_altro_sources(self.document())
        self.assertIn("[Erigeron annuus](https://www.inaturalist.org/taxa/76897)", text)
        self.assertIn("| 1 | [Hedera helix](https://www.inaturalist.org/taxa/1) | 5,000 | 20 |", text)
        self.assertIn("20,000 senza etichette di piante", text)


if __name__ == "__main__":
    unittest.main()
