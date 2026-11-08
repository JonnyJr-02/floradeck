/**
 * The recogniser interface shared by the mock (phase 4) and the ONNX model (phase 7).
 * Every number the decision needs comes from the model metadata (labels.json), never from app code.
 */

/** One proposal: a catalogue species and its calibrated probability (0–1). */
export interface Candidate {
  speciesId: string
  confidence: number
}

export type Recognition =
  /** Confident enough: the card is added straight away. */
  | { kind: 'card'; best: Candidate; top3: Candidate[] }
  /** Grey zone: "Non sono sicuro", the user picks one of the top 3 or shoots again. */
  | { kind: 'unsure'; top3: Candidate[] }
  /** "altro", out of distribution or too weak: not in the catalogue. */
  | { kind: 'not-in-catalog'; top3: Candidate[] }

export interface Recognizer {
  /** Short name for logs and the settings screen. */
  readonly name: string
  recognize(image: ImageBitmap | Blob, signal?: AbortSignal): Promise<Recognition>
}

/** The part of labels.json (ml/kaggle/README.md) the decision rule reads. */
export interface DecisionMetadata {
  /** Class order of the model output: catalogue ids, plus "altro" at altroIndex. */
  classes: string[]
  altroIndex: number
  temperature: number
  decision: { accept: number; unsure: number }
  embeddingGate: { enabled: boolean; minSimilarity: number }
}
