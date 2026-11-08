import { describe, expect, it } from 'vitest'
import { averageLogits, decide, softmax, topCatalogCandidates } from './decision'
import type { DecisionMetadata } from './types'

const meta: DecisionMetadata = {
  classes: ['a', 'b', 'c', 'd', 'altro'],
  altroIndex: 4,
  temperature: 1,
  decision: { accept: 0.8, unsure: 0.4 },
  embeddingGate: { enabled: false, minSimilarity: -1 },
}

describe('softmax and view averaging', () => {
  it('sums to one and keeps the order of the logits', () => {
    const p = softmax([2, 1, 0])
    expect(p.reduce((sum, x) => sum + x, 0)).toBeCloseTo(1, 12)
    expect(p[0]).toBeGreaterThan(p[1]!)
    expect(p[1]).toBeGreaterThan(p[2]!)
  })

  it('stays finite with large logits', () => {
    const p = softmax([1000, 999])
    expect(p[0]).toBeCloseTo(1 / (1 + Math.exp(-1)), 12)
  })

  it('flattens the distribution with a higher temperature', () => {
    expect(softmax([2, 0], 2)[0]).toBeLessThan(softmax([2, 0], 1)[0]!)
  })

  it('averages the logits of the views', () => {
    expect(Array.from(averageLogits([[1, 3], [3, 5]]))).toEqual([2, 4])
    expect(() => averageLogits([])).toThrow()
    expect(() => averageLogits([[1], [1, 2]])).toThrow()
  })
})

describe('decision rule (same as ml/floradeck_ml/calibration.py)', () => {
  it('ranks catalogue species and leaves "altro" out', () => {
    const top = topCatalogCandidates([0.1, 0.2, 0.05, 0.05, 0.6], meta)
    expect(top.map((c) => c.speciesId)).toEqual(['b', 'a', 'c'])
  })

  it('gives a card at or above the accept threshold', () => {
    const result = decide([0.8, 0.1, 0.05, 0.05, 0], meta)
    expect(result.kind).toBe('card')
    if (result.kind === 'card') expect(result.best).toEqual({ speciesId: 'a', confidence: 0.8 })
  })

  it('is unsure between the two thresholds and proposes three species', () => {
    const result = decide([0.1, 0.5, 0.3, 0.05, 0.05], meta)
    expect(result.kind).toBe('unsure')
    expect(result.top3.map((c) => c.speciesId)).toEqual(['b', 'c', 'a'])
  })

  it('rejects below the unsure threshold, even when "altro" is low', () => {
    expect(decide([0.39, 0.3, 0.3, 0.01, 0], meta).kind).toBe('not-in-catalog')
  })

  it('rejects when the photo is mostly "altro"', () => {
    expect(decide([0.1, 0.05, 0.05, 0, 0.8], meta).kind).toBe('not-in-catalog')
  })

  it('lets the embedding gate overrule a confident score', () => {
    const gated = { ...meta, embeddingGate: { enabled: true, minSimilarity: 0.3 } }
    expect(decide([0.95, 0.05, 0, 0, 0], gated, 0.2).kind).toBe('not-in-catalog')
    expect(decide([0.95, 0.05, 0, 0, 0], gated, 0.3).kind).toBe('card')
    expect(decide([0.95, 0.05, 0, 0, 0], gated).kind).toBe('card')
  })

  it('refuses a vector of the wrong length', () => {
    expect(() => decide([1, 0], meta)).toThrow()
  })
})
