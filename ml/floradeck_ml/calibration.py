"""Decision thresholds of the recogniser (numpy only; also inlined into the Kaggle notebook).

The app turns the model outputs into one of three answers:

- **card**: the top catalogue species, when its probability is at least ``accept``;
- **"Non sono sicuro"**: the top 3 catalogue species to choose from, when the top probability is
  at least ``unsure``;
- **not in the catalogue** otherwise, or when the embedding gate (cosine similarity to the
  nearest class prototype below ``gate``) vetoes the photo.

Probabilities are ``softmax(logits / temperature)``; the score is the highest catalogue
probability ("altro" excluded). Thresholds are chosen on validation data:

- ``accept``: the lowest score at which the cards given are still right at least
  ``card_precision`` of the time (out-of-catalogue photos that get a card count as wrong);
- ``unsure``: going down from ``accept``, the lowest score at which the photos in the grey zone
  still have the right species among the 3 proposals at least ``grey_top3_precision`` of the
  time, and at most ``grey_altro_share`` of the out-of-catalogue photos reach the grey zone.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Targets:
    card_precision: float = 0.98
    grey_top3_precision: float = 0.5
    grey_altro_share: float = 0.10
    gate_percentiles: tuple[int, ...] = (0, 1, 2, 5)  # 0 = no gate
    gate_min_gain: float = 0.005  # a gate must raise the useful share by this much to be used


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / temperature
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def nll(logits: np.ndarray, labels: np.ndarray, temperature: float) -> float:
    p = softmax(logits.astype(np.float64), temperature)
    return float(-np.log(np.clip(p[np.arange(len(labels)), labels], 1e-12, None)).mean())


def fit_temperature(logits: np.ndarray, labels: np.ndarray, lo: float = 0.05, hi: float = 20.0) -> float:
    """Temperature minimising the validation negative log-likelihood (golden-section search on log T)."""
    a, b = np.log(lo), np.log(hi)
    g = (np.sqrt(5) - 1) / 2
    c, d = b - g * (b - a), a + g * (b - a)
    fc, fd = nll(logits, labels, np.exp(c)), nll(logits, labels, np.exp(d))
    for _ in range(80):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - g * (b - a)
            fc = nll(logits, labels, np.exp(c))
        else:
            a, c, fc = c, d, fd
            d = a + g * (b - a)
            fd = nll(logits, labels, np.exp(d))
    return float(np.exp((a + b) / 2))


def catalogue_scores(probs: np.ndarray, altro: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Score, predicted species and top-3 species, with altro left out."""
    catalog = probs.copy()
    catalog[:, altro] = -1.0
    top3 = np.argsort(-catalog, axis=1)[:, :3]
    return catalog[np.arange(len(catalog)), top3[:, 0]], top3[:, 0], top3


def similarity(embeddings: np.ndarray, prototypes: np.ndarray) -> np.ndarray:
    """Cosine similarity of each (L2-normalised) embedding to its nearest prototype."""
    return (embeddings @ prototypes.T).max(axis=1)


def decide(score, top3, sim, accept: float, unsure: float, gate: float) -> dict[str, np.ndarray]:
    gated = sim < gate
    card = (score >= accept) & ~gated
    grey = ~card & (score >= unsure) & ~gated
    return {"card": card, "grey": grey, "prediction": top3[:, 0], "top3": top3, "score": score}


def accept_threshold(score, prediction, labels, altro: int, target: float) -> float:
    """Lowest score whose accepted set still has at least ``target`` precision."""
    order = np.argsort(-score, kind="stable")
    correct = ((prediction == labels) & (labels != altro))[order]
    precision = np.cumsum(correct) / np.arange(1, len(correct) + 1)
    ok = np.flatnonzero(precision >= target)
    return 1.0 if len(ok) == 0 else float(score[order][ok[-1]])


def unsure_threshold(score, top3, labels, altro: int, accept: float, top3_target: float, altro_share: float) -> float:
    below = score < accept
    if not below.any():
        return accept
    order = np.flatnonzero(below)[np.argsort(-score[below], kind="stable")]
    useful = ((top3[order] == labels[order, None]).any(axis=1) & (labels[order] != altro))
    band_precision = np.cumsum(useful) / np.arange(1, len(order) + 1)
    n_altro = max(1, int((labels == altro).sum()))
    altro_in_band = np.cumsum(labels[order] == altro) / n_altro
    ok = np.flatnonzero((band_precision >= top3_target) & (altro_in_band <= altro_share))
    return accept if len(ok) == 0 else float(score[order][ok[-1]])


def summarise(d: dict[str, np.ndarray], labels: np.ndarray, altro: int) -> dict[str, float]:
    catalog = labels != altro
    other = ~catalog
    right = d["prediction"] == labels
    in_top3 = (d["top3"] == labels[:, None]).any(axis=1)
    n_cat, n_alt = max(1, int(catalog.sum())), max(1, int(other.sum()))
    card, grey = d["card"], d["grey"]
    return {
        "card_precision": float((card & right & catalog).sum() / max(1, int(card.sum()))),
        "catalog_card_correct": float((card & right & catalog).sum() / n_cat),
        "catalog_card_wrong": float((card & ~right & catalog).sum() / n_cat),
        "catalog_unsure_with_answer_in_top3": float((grey & in_top3 & catalog).sum() / n_cat),
        "catalog_unsure_without_answer": float((grey & ~in_top3 & catalog).sum() / n_cat),
        "catalog_rejected": float((~card & ~grey & catalog).sum() / n_cat),
        "altro_rejected": float((~card & ~grey & other).sum() / n_alt),
        "altro_unsure": float((grey & other).sum() / n_alt),
        "altro_card": float((card & other).sum() / n_alt),
    }


def useful_share(s: dict[str, float]) -> float:
    """Catalogue photos that end with the right card, directly or among the 3 proposals."""
    return s["catalog_card_correct"] + s["catalog_unsure_with_answer_in_top3"]


def choose(score, top3, sim, labels, altro: int, targets: Targets | None = None) -> dict:
    """Thresholds and gate picked on validation data; returns them with the validation summary."""
    targets = targets or Targets()
    correct_sim = sim[(labels != altro) & (top3[:, 0] == labels)]
    best = None
    for percentile in targets.gate_percentiles:
        gate = -1.0 if percentile == 0 or len(correct_sim) == 0 else float(np.quantile(correct_sim, percentile / 100))
        gated_score = np.where(sim < gate, 0.0, score)
        accept = accept_threshold(gated_score, top3[:, 0], labels, altro, targets.card_precision)
        unsure = unsure_threshold(gated_score, top3, labels, altro, accept, targets.grey_top3_precision, targets.grey_altro_share)
        s = summarise(decide(score, top3, sim, accept, unsure, gate), labels, altro)
        candidate = {"accept": accept, "unsure": unsure, "gate": gate, "gate_percentile": percentile, "val": s}
        if best is None or useful_share(s) > useful_share(best["val"]) + targets.gate_min_gain:
            best = candidate
    return best


def risk_coverage(score, top3, sim, labels, altro: int, gate: float, thresholds=None) -> list[dict[str, float]]:
    rows = []
    for t in thresholds if thresholds is not None else np.linspace(0.05, 0.99, 48):
        s = summarise(decide(score, top3, sim, float(t), float(t), gate), labels, altro)
        rows.append({"threshold": round(float(t), 3), "card_precision": round(s["card_precision"], 4),
                     "catalog_coverage": round(s["catalog_card_correct"], 4), "altro_card_rate": round(s["altro_card"], 4)})
    return rows
