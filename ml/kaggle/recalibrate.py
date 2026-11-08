"""Choose new decision thresholds for an already trained model, without training again.

    ml\\.venv\\Scripts\\python ml/kaggle/recalibrate.py <model folder> <outputs.npz> <new model folder>

<model folder> is the extracted floradeck-model.zip; <outputs.npz> comes from
ml/kaggle/model_outputs.py (the same model on the val and test images). The temperature and the
thresholds are refitted on val with floradeck_ml.calibration (the rules the notebook now uses), test
is evaluated again, and <new model folder> gets a copy of the model with the new labels.json,
report/ and LEGGIMI.md, plus <new model folder>.zip.
"""

from __future__ import annotations

import csv
import json
import shutil
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

from floradeck_ml.calibration import Targets, catalogue_scores, choose, decide, fit_temperature, risk_coverage, similarity, \
    softmax, summarise


def topk(logits: np.ndarray, labels: np.ndarray, k: int) -> float:
    return float((np.argsort(-logits, axis=1)[:, :k] == labels[:, None]).any(axis=1).mean())


def ece(probs: np.ndarray, labels: np.ndarray, bins: int = 15) -> float:
    confidence, prediction = probs.max(1), probs.argmax(1)
    correct = (prediction == labels).astype(float)
    total = 0.0
    for lo, hi in zip(np.linspace(0, 1, bins + 1)[:-1], np.linspace(0, 1, bins + 1)[1:], strict=True):
        inside = (confidence > lo) & (confidence <= hi)
        if inside.any():
            total += inside.mean() * abs(confidence[inside].mean() - correct[inside].mean())
    return float(total)


def summary_text(labels_json: dict, metrics: dict, n_test: int) -> str:
    d = metrics["decisions"]
    t = metrics["targets"]
    bakeoff = ", ".join(r["backbone"].split(".")[0] + " " + format(r["val_top1"], ".1%") for r in metrics.get("bakeoff", []))
    return f"""# FloraDeck · risultato dell'addestramento

- Modello: **{labels_json['backbone']}** ({metrics['format']}, {metrics['model_mb']} MB)
- Addestramento completo: {'sì' if metrics.get('complete') else 'NO'}
- Confronto modelli (validazione, top-1): {bakeoff}
- Soglie ricalcolate in locale il {metrics['recalibrated_at'][:10]} (`ml/kaggle/recalibrate.py`): carta se la sicurezza è
  almeno {metrics['thresholds']['accept']:.0%}, "Non sono sicuro" da {metrics['thresholds']['unsure']:.0%}.

## Sul test set ({n_test:,} foto mai viste, di fotografi diversi)

- Specie giusta al primo tentativo: **{metrics['top1_catalog']:.1%}**; tra le prime tre: **{metrics['top3_catalog']:.1%}** (obiettivi: 85 % e 95 %)
- Con le soglie dell'app, su 100 foto di specie del catalogo:
  - {d['catalog_card_correct']:.0%} carta giusta, {d['catalog_card_wrong']:.0%} carta sbagliata;
  - {d['catalog_unsure_with_answer_in_top3']:.0%} "Non sono sicuro" con la risposta tra le tre proposte, {d['catalog_unsure_without_answer']:.0%} senza;
  - {d['catalog_rejected']:.0%} "non è nel catalogo".
- Su 100 foto fuori catalogo: {d['altro_rejected']:.0%} riconosciute come fuori catalogo, {d['altro_unsure']:.0%} "Non sono sicuro", {d['altro_card']:.0%} carta sbagliata.
- Precisione delle carte date: {d['card_precision']:.1%} (obiettivo {t['card_precision']:.0%}).

Dettagli: `report/metrics.json`, `report/per_class.csv`, `report/confusions.csv`.
"""


def main(model_dir: Path, outputs: Path, out_dir: Path, targets: Targets | None = None) -> dict:
    targets = targets or Targets()
    labels_json = json.loads((model_dir / "labels.json").read_text(encoding="utf-8"))
    metrics = json.loads((model_dir / "report" / "metrics.json").read_text(encoding="utf-8"))
    classes, altro = labels_json["classes"], labels_json["altroIndex"]
    prototypes = np.fromfile(model_dir / labels_json["prototypes"]["file"], "<f4").reshape(labels_json["prototypes"]["shape"])
    data = np.load(outputs)
    val, test = data["split"] == "val", data["split"] == "test"
    logits, emb, y = data["logits"], data["embeddings"], data["labels"]

    temperature = fit_temperature(logits[val], y[val])
    print(f"temperature {temperature:.4f} (Kaggle: {labels_json['temperature']:.4f})")

    def scored(mask):
        probs = softmax(logits[mask], temperature)
        score, _, top3 = catalogue_scores(probs, altro)
        return probs, score, top3, similarity(emb[mask], prototypes)

    _, v_score, v_top3, v_sim = scored(val)
    choice = choose(v_score, v_top3, v_sim, y[val], altro, targets)
    probs, t_score, t_top3, t_sim = scored(test)
    t_y = y[test]
    decision = decide(t_score, t_top3, t_sim, choice["accept"], choice["unsure"], choice["gate"])
    catalog = t_y != altro
    top1 = topk(logits[test][catalog], t_y[catalog], 1)
    print(f"test top-1 {top1:.4f} (Kaggle: {metrics['top1_catalog']:.4f}); thresholds accept {choice['accept']:.3f}, "
          f"unsure {choice['unsure']:.3f}, gate {choice['gate']:+.3f} (p{choice['gate_percentile']})")

    by_source: dict[str, Counter] = defaultdict(Counter)
    for i, source in enumerate(data["source"][test]):
        if t_y[i] == altro:
            by_source[str(source)]["card" if decision["card"][i] else "unsure" if decision["grey"][i] else "rejected"] += 1
    metrics.update({
        "recalibrated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "test_images": int(test.sum()),
        "top1_all": topk(logits[test], t_y, 1),
        "top1_catalog": top1,
        "top3_catalog": topk(logits[test][catalog], t_y[catalog], 3),
        "ece_before": ece(softmax(logits[test]), t_y),
        "ece_after": ece(probs, t_y),
        "temperature": temperature,
        "targets": {"card_precision": targets.card_precision, "grey_top3_precision": targets.grey_top3_precision,
                    "grey_altro_share": targets.grey_altro_share},
        "thresholds": {k: choice[k] for k in ("accept", "unsure", "gate", "gate_percentile")},
        "validation_decisions": choice["val"],
        "decisions": summarise(decision, t_y, altro),
        "altro_by_source": {s: dict(c) for s, c in sorted(by_source.items())},
    })

    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(model_dir, out_dir)
    report = out_dir / "report"
    (report / "metrics.json").write_text(json.dumps(metrics, indent=1, ensure_ascii=False), encoding="utf-8")
    curve = risk_coverage(t_score, t_top3, t_sim, t_y, altro, choice["gate"])
    with (report / "risk_coverage.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(curve[0]))
        writer.writeheader()
        writer.writerows(curve)
    with (model_dir / "report" / "per_class.csv").open(encoding="utf-8", newline="") as handle:
        per_class = list(csv.DictReader(handle))
    index = {c: i for i, c in enumerate(classes)}
    for row in per_class:
        c = index[row["class"]]
        cards = decision["card"] & (decision["prediction"] == c)
        row["cards"] = int(cards.sum())
        row["card_precision"] = round(float((t_y[cards] == c).mean()), 4) if cards.any() else ""
    with (report / "per_class.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(per_class[0]))
        writer.writeheader()
        writer.writerows(per_class)

    labels_json["version"] = labels_json["version"].split("-cal")[0] + "-cal" + time.strftime("%Y%m%d")
    labels_json["temperature"] = temperature
    labels_json["decision"].update({"accept": choice["accept"], "unsure": choice["unsure"],
                                    "targetPrecision": targets.card_precision,
                                    "unsureTop3Precision": targets.grey_top3_precision})
    labels_json["embeddingGate"] = {"enabled": choice["gate"] > -1, "minSimilarity": choice["gate"]}
    labels_json["metrics"] = {k: metrics[k] for k in ("top1_catalog", "top3_catalog", "ece_after", "decisions")}
    (out_dir / "labels.json").write_text(json.dumps(labels_json, indent=1, ensure_ascii=False), encoding="utf-8")
    text = summary_text(labels_json, metrics, int(test.sum()))
    (out_dir / "LEGGIMI.md").write_text(text, encoding="utf-8")
    archive = shutil.make_archive(str(out_dir), "zip", out_dir)
    print(text)
    print(f"Wrote {archive}")
    return metrics


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
