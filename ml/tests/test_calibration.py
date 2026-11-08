"""Decision thresholds: card precision, a real grey zone, temperature fit."""

import unittest

import numpy as np

from floradeck_ml.calibration import (
    Targets,
    accept_threshold,
    catalogue_scores,
    choose,
    decide,
    fit_temperature,
    softmax,
    summarise,
    unsure_threshold,
)

ALTRO = 3


class ThresholdTest(unittest.TestCase):
    def test_accept_threshold_reaches_the_precision(self):
        score = np.array([0.9, 0.8, 0.7, 0.6, 0.5])
        prediction = np.array([0, 1, 2, 0, 1])
        labels = np.array([0, 1, 0, 0, 1])  # the 0.7 one is wrong
        self.assertEqual(accept_threshold(score, prediction, labels, ALTRO, 1.0), 0.8)
        self.assertEqual(accept_threshold(score, prediction, labels, ALTRO, 0.8), 0.5)  # 4 of 5 right

    def test_out_of_catalogue_cards_count_as_wrong(self):
        score = np.array([0.9, 0.8])
        prediction = np.array([0, 1])
        labels = np.array([0, ALTRO])
        self.assertEqual(accept_threshold(score, prediction, labels, ALTRO, 0.9), 0.9)

    def test_grey_zone_below_accept(self):
        score = np.array([0.6, 0.5, 0.4, 0.3, 0.2])
        top3 = np.array([[1, 0, 2], [0, 1, 2], [2, 1, 0], [2, 1, 0], [0, 1, 2]])
        labels = np.array([0, 1, 1, ALTRO, ALTRO])
        # band from the top: useful, useful, useful, altro (1 of 2 altro = 50 %), altro
        self.assertEqual(unsure_threshold(score, top3, labels, ALTRO, 0.7, 0.5, 0.5), 0.3)
        self.assertEqual(unsure_threshold(score, top3, labels, ALTRO, 0.7, 0.5, 0.0), 0.4)
        self.assertEqual(unsure_threshold(score, top3, labels, ALTRO, 0.7, 1.0, 1.0), 0.4)

    def test_decide_and_summarise(self):
        score = np.array([0.9, 0.5, 0.1, 0.9])
        top3 = np.array([[0, 1, 2], [2, 1, 0], [0, 1, 2], [1, 0, 2]])
        sim = np.array([0.9, 0.9, 0.9, 0.1])
        labels = np.array([0, 1, 2, ALTRO])
        d = decide(score, top3, sim, accept=0.8, unsure=0.3, gate=0.5)
        self.assertEqual(d["card"].tolist(), [True, False, False, False])
        self.assertEqual(d["grey"].tolist(), [False, True, False, False])
        s = summarise(d, labels, ALTRO)
        self.assertAlmostEqual(s["catalog_card_correct"], 1 / 3)
        self.assertAlmostEqual(s["catalog_unsure_with_answer_in_top3"], 1 / 3)
        self.assertAlmostEqual(s["altro_rejected"], 1.0)

    def test_catalogue_scores_skip_altro(self):
        probs = np.array([[0.1, 0.2, 0.1, 0.6]])
        score, prediction, top3 = catalogue_scores(probs, ALTRO)
        self.assertEqual((float(score[0]), int(prediction[0])), (0.2, 1))
        self.assertNotIn(ALTRO, top3[0].tolist())


class FitTest(unittest.TestCase):
    def test_temperature_recovers_the_scale(self):
        rng = np.random.default_rng(0)
        true = rng.normal(size=(4000, 5)) * 2
        labels = np.array([rng.choice(5, p=p) for p in softmax(true)])
        t = fit_temperature(true * 3, labels)  # logits 3 times too confident
        self.assertAlmostEqual(t, 3.0, delta=0.3)

    def test_choose_gives_a_grey_zone(self):
        rng = np.random.default_rng(1)
        n = 3000
        labels = rng.integers(0, 4, n)
        logits = rng.normal(size=(n, 4))
        logits[np.arange(n), labels] += rng.uniform(0, 6, n)
        score, _, top3 = catalogue_scores(softmax(logits), ALTRO)
        sim = np.ones(n)
        best = choose(score, top3, sim, labels, ALTRO, Targets(card_precision=0.95, gate_percentiles=(0,)))
        self.assertLess(best["unsure"], best["accept"])
        self.assertGreaterEqual(best["val"]["card_precision"], 0.95)


if __name__ == "__main__":
    unittest.main()
