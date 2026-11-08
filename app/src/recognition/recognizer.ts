import { useSyncExternalStore } from 'react'
import { MOCK_SCENARIOS, MockRecognizer, type MockScenario } from './mock'
import type { Recognizer } from './types'

/** Which mock outcome to force, kept on this phone (Impostazioni → Riconoscimento di prova). */
export const MOCK_SCENARIO_KEY = 'floradeck:mock-scenario'

const listeners = new Set<() => void>()

export function getMockScenario(): MockScenario {
  try {
    const stored = localStorage.getItem(MOCK_SCENARIO_KEY)
    return MOCK_SCENARIOS.includes(stored as MockScenario) ? (stored as MockScenario) : 'random'
  } catch {
    return 'random'
  }
}

export function setMockScenario(scenario: MockScenario): void {
  try {
    if (scenario === 'random') localStorage.removeItem(MOCK_SCENARIO_KEY)
    else localStorage.setItem(MOCK_SCENARIO_KEY, scenario)
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  for (const listener of listeners) listener()
}

export function useMockScenario(): MockScenario {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getMockScenario,
    () => 'random',
  )
}

/** The recogniser the app uses. Phase 7 swaps in the ONNX model behind the same interface. */
export const recognizer: Recognizer = new MockRecognizer(getMockScenario)
