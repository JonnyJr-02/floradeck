import { describe, expect, it } from 'vitest'
import { topNames } from './allPlants'
import { excludedClasses, maxSimilarity } from './onnx'

describe('trained model wiring', () => {
  it('treats model classes missing from the catalogue (rosemary) like "altro"', () => {
    const labels = { classes: ['bellis-perennis', 'salvia-rosmarinus', 'papaver-rhoeas', 'altro'], altroIndex: 3 }
    expect(excludedClasses(labels)).toEqual([1])
  })

  it('measures the closest prototype by cosine similarity', () => {
    const prototypes = new Float32Array([1, 0, 0, 1])
    expect(maxSimilarity([0.6, 0.8], prototypes, 2)).toBeCloseTo(0.8)
  })

  it('lists the three most likely names, Italian name when there is one', () => {
    const names = topNames([0.1, 0.7, 0.2], [['A a', ''], ['B b', 'Bi'], ['C c', 'Ci']], 2)
    expect(names).toEqual([
      { scientific: 'B b', italian: 'Bi', confidence: 0.7 },
      { scientific: 'C c', italian: 'Ci', confidence: 0.2 },
    ])
  })
})
