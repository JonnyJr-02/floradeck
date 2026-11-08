import type { Candidate, DecisionMetadata, Recognition } from './types'

/** Average the logits of the test-time views (one array per view). */
export function averageLogits(views: readonly ArrayLike<number>[]): number[] {
  const [first] = views
  if (!first) throw new Error('averageLogits needs at least one view')
  const rows = views.map((view) => Array.from(view))
  if (rows.some((row) => row.length !== first.length)) throw new Error('every view must have the same number of classes')
  return Array.from(first, (_, i) => rows.reduce((sum, row) => sum + (row[i] ?? 0), 0) / rows.length)
}

/** softmax(logits / temperature), numerically stable. */
export function softmax(logits: ArrayLike<number>, temperature = 1): number[] {
  const scaled = Array.from(logits, (logit) => logit / temperature)
  const max = Math.max(...scaled)
  const exps = scaled.map((value) => Math.exp(value - max))
  const sum = exps.reduce((total, value) => total + value, 0)
  return exps.map((value) => value / sum)
}

/** The three most likely catalogue species ("altro" excluded), most likely first. */
export function topCatalogCandidates(
  probabilities: ArrayLike<number>,
  meta: Pick<DecisionMetadata, 'classes' | 'altroIndex' | 'excludedIndices'>,
  count = 3,
): Candidate[] {
  const excluded = new Set(meta.excludedIndices ?? [])
  const candidates: Candidate[] = []
  Array.from(probabilities).forEach((confidence, i) => {
    const speciesId = meta.classes[i]
    if (i !== meta.altroIndex && !excluded.has(i) && speciesId !== undefined) candidates.push({ speciesId, confidence })
  })
  // Stable sort: ties keep catalogue order, like the stable argsort in ml/floradeck_ml/calibration.py.
  candidates.sort((a, b) => b.confidence - a.confidence)
  return candidates.slice(0, count)
}

/**
 * The decision rule of ml/floradeck_ml/calibration.py `decide`:
 * score = highest catalogue probability; card if score ≥ accept, "Non sono sicuro" if score ≥ unsure,
 * otherwise not in the catalogue. With the embedding gate on, a photo whose embedding is far from
 * every prototype (max cosine similarity < minSimilarity) is not in the catalogue whatever the score.
 */
export function decide(
  probabilities: ArrayLike<number>,
  meta: DecisionMetadata,
  maxPrototypeSimilarity?: number,
): Recognition {
  if (probabilities.length !== meta.classes.length) {
    throw new Error(`expected ${meta.classes.length} probabilities, got ${probabilities.length}`)
  }
  const top3 = topCatalogCandidates(probabilities, meta)
  const [best] = top3
  const score = best?.confidence ?? 0
  const gated =
    meta.embeddingGate.enabled &&
    maxPrototypeSimilarity !== undefined &&
    maxPrototypeSimilarity < meta.embeddingGate.minSimilarity

  if (best && !gated && score >= meta.decision.accept) return { kind: 'card', best, top3 }
  if (!gated && score >= meta.decision.unsure) return { kind: 'unsure', top3 }
  return { kind: 'not-in-catalog', top3 }
}
