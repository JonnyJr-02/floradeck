import { useSyncExternalStore } from 'react'
import { MOCK_SCENARIOS, MockRecognizer, type MockScenario } from './mock'
import { OnnxRecognizer } from './onnx'
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

/**
 * The stand-in recogniser is kept for automated tests and hand checks of the screens: it is used only
 * when localStorage `floradeck:recognizer` is "mock" (the E2E tests set it). Everyone else gets the
 * trained model.
 */
export const RECOGNIZER_KEY = 'floradeck:recognizer'

function mockRequested(): boolean {
  try {
    return localStorage.getItem(RECOGNIZER_KEY) === 'mock'
  } catch {
    return false
  }
}

/** The recogniser the app uses: the ONNX model of phase 6, behind the same interface as the mock. */
export const recognizer: Recognizer = mockRequested() ? new MockRecognizer(getMockScenario) : new OnnxRecognizer()
