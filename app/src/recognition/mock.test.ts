import { describe, expect, it } from 'vitest'
import { speciesById } from '../domain/catalog'
import { MOCK_METADATA, MockRecognizer, mockProbabilities, mockRecognition } from './mock'

/** Small deterministic generator (mulberry32), so every run checks the same cases. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('mock recogniser', () => {
  it('has one class per collectable species plus "altro", without the legendary one', () => {
    expect(MOCK_METADATA.classes).toHaveLength(211)
    expect(MOCK_METADATA.classes.at(-1)).toBe('altro')
    expect(MOCK_METADATA.classes).not.toContain('cypripedium-calceolus')
  })

  it('lands every forced scenario in its decision zone', () => {
    const random = seeded(7)
    for (let i = 0; i < 300; i++) {
      expect(mockRecognition('sure', random).kind).toBe('card')
      expect(mockRecognition('unsure', random).kind).toBe('unsure')
      expect(mockRecognition('out', random).kind).toBe('not-in-catalog')
    }
  })

  it('builds probability vectors that sum to one', () => {
    const random = seeded(11)
    for (const scenario of ['sure', 'unsure', 'out'] as const) {
      const sum = mockProbabilities(scenario, random).reduce((total, p) => total + p, 0)
      expect(sum).toBeCloseTo(1, 9)
    }
  })

  it('proposes three different catalogue species', () => {
    const random = seeded(3)
    for (let i = 0; i < 100; i++) {
      const result = mockRecognition('unsure', random)
      const ids = result.top3.map((c) => c.speciesId)
      expect(new Set(ids).size).toBe(3)
      for (const id of ids) expect(speciesById(id)?.albumId).toBeTruthy()
    }
  })

  it('mixes the outcomes when nothing is forced', () => {
    const random = seeded(5)
    const kinds = new Set(Array.from({ length: 200 }, () => mockRecognition('random', random).kind))
    expect(kinds).toEqual(new Set(['card', 'unsure', 'not-in-catalog']))
  })

  it('can be cancelled while it is "thinking"', async () => {
    const recognizer = new MockRecognizer(() => 'sure', () => 10_000)
    const controller = new AbortController()
    const pending = recognizer.recognize(new Blob(), controller.signal)
    controller.abort(new DOMException('cancelled', 'AbortError'))
    await expect(pending).rejects.toThrow('cancelled')
  })

  it('answers after its delay', async () => {
    const recognizer = new MockRecognizer(() => 'out', () => 1)
    await expect(recognizer.recognize(new Blob())).resolves.toMatchObject({ kind: 'not-in-catalog' })
  })
})
