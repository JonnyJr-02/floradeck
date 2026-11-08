import { species, type Species } from '../domain/catalog'
import { decide } from './decision'
import type { DecisionMetadata, Recognition, Recognizer } from './types'

/**
 * Stand-in recogniser until the real model ships (phase 7). It ignores the photo, invents a
 * probability vector for the chosen scenario and runs it through the real decision rule, so the
 * screens see exactly what the model will give them.
 */

/** 'legendary' is only ever forced: it lets the secret card (and its tilt sheen) be tried by hand. */
export type MockScenario = 'random' | 'sure' | 'unsure' | 'out' | 'legendary'

export const MOCK_SCENARIOS: readonly MockScenario[] = ['random', 'sure', 'unsure', 'out', 'legendary']

/** The secret legendary card is never handed out by the mock. */
const collectable = species.filter((entry) => entry.albumId !== null)

/** The mock's own metadata, shaped like labels.json. These numbers are not the real model's. */
export const MOCK_METADATA: DecisionMetadata = {
  classes: [...collectable.map((entry) => entry.id), 'altro'],
  altroIndex: collectable.length,
  temperature: 1,
  decision: { accept: 0.8, unsure: 0.35 },
  embeddingGate: { enabled: false, minSimilarity: -1 },
}

type Random = () => number

function between(random: Random, low: number, high: number): number {
  return low + random() * (high - low)
}

function pick<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length) % items.length]
  if (item === undefined) throw new Error('nothing to pick from')
  return item
}

/** Two plausible runners-up: the species' lookalikes first, then others from its album. */
function runnersUp(random: Random, best: Species): Species[] {
  const chosen: Species[] = []
  const add = (entry: Species | undefined) => {
    if (entry && entry.id !== best.id && !chosen.includes(entry) && entry.albumId !== null) chosen.push(entry)
  }
  for (const id of best.lookalikes) add(collectable.find((entry) => entry.id === id))
  const sameAlbum = collectable.filter((entry) => entry.albumId === best.albumId)
  for (let guard = 0; chosen.length < 2 && guard < 50; guard++) add(pick(random, sameAlbum))
  for (let guard = 0; chosen.length < 2 && guard < 50; guard++) add(pick(random, collectable))
  return chosen.slice(0, 2)
}

export function resolveScenario(
  scenario: Exclude<MockScenario, 'legendary'>,
  random: Random,
): Exclude<MockScenario, 'random' | 'legendary'> {
  if (scenario !== 'random') return scenario
  const roll = random()
  return roll < 0.6 ? 'sure' : roll < 0.85 ? 'unsure' : 'out'
}

/** A probability vector over MOCK_METADATA.classes that lands in the scenario's decision zone. */
export function mockProbabilities(
  scenario: Exclude<MockScenario, 'legendary'>,
  random: Random = Math.random,
): Float64Array {
  const { classes, altroIndex, decision } = MOCK_METADATA
  const probabilities = new Float64Array(classes.length)
  const best = pick(random, collectable)
  const [second, third] = runnersUp(random, best)
  if (!second || !third) throw new Error(`no runners-up for ${best.id}`)
  const index = (entry: Species) => classes.indexOf(entry.id)

  const zone = resolveScenario(scenario, random)
  let top: number
  let mid: number
  let low: number
  if (zone === 'sure') {
    top = between(random, decision.accept + 0.04, 0.97)
    mid = (1 - top) * between(random, 0.4, 0.6)
    low = (1 - top - mid) * between(random, 0.3, 0.6)
  } else if (zone === 'unsure') {
    top = between(random, decision.unsure + 0.05, decision.accept - 0.08)
    mid = between(random, 0.12, Math.min(top - 0.04, 1 - top - 0.04))
    low = (1 - top - mid) * between(random, 0.3, 0.6)
  } else {
    top = between(random, 0.08, decision.unsure - 0.08)
    mid = top * between(random, 0.4, 0.8)
    low = mid * between(random, 0.4, 0.8)
  }

  probabilities[index(best)] = top
  probabilities[index(second)] = mid
  probabilities[index(third)] = low
  const rest = 1 - top - mid - low
  if (zone === 'out') {
    probabilities[altroIndex] = rest
  } else {
    // Spread what is left thinly, so the three proposals stay the top three.
    const share = rest / (classes.length - 3)
    for (let i = 0; i < probabilities.length; i++) if (probabilities[i] === 0) probabilities[i] = share
  }
  return probabilities
}

const legendary = species.find((entry) => entry.rarity === 'legendary')

export function mockRecognition(scenario: MockScenario, random: Random = Math.random): Recognition {
  if (scenario === 'legendary' && legendary) {
    const best = { speciesId: legendary.id, confidence: 0.97 }
    return { kind: 'card', best, top3: [best] }
  }
  return decide(mockProbabilities(scenario === 'legendary' ? 'sure' : scenario, random), MOCK_METADATA)
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export class MockRecognizer implements Recognizer {
  readonly name = 'mock'

  constructor(
    private readonly scenario: () => MockScenario,
    private readonly delayMs: () => number = () => 700 + Math.random() * 500,
  ) {}

  async recognize(_image: ImageBitmap | Blob, signal?: AbortSignal): Promise<Recognition> {
    await wait(this.delayMs(), signal)
    return mockRecognition(this.scenario())
  }
}
