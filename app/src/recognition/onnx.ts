import { speciesById } from '../domain/catalog'
import { averageLogits, decide, softmax } from './decision'
import type { View } from './preprocess'
import type { DecisionMetadata, Recognition, Recognizer } from './types'
import { decodePixels, runInWorker } from './workerProtocol'

/** labels.json as exported by ml/kaggle (see ml/kaggle/README.md); only what the app reads. */
export interface ModelLabels extends Omit<DecisionMetadata, 'excludedIndices'> {
  version: string
  catalogHash: string
  model: { file: string; input: string; outputs: string[] }
  input: { mean: number[]; std: number[] }
  tta: Array<View & { name: string }>
  prototypes: { file: string; shape: [number, number]; classes: string[] }
}

const BASE = `${import.meta.env.BASE_URL}models/catalog/`

/** Classes the model knows that are not catalogue species (e.g. rosemary, dropped on 2026-11-08). */
export function excludedClasses(labels: Pick<ModelLabels, 'classes' | 'altroIndex'>, known = speciesById): number[] {
  return labels.classes.flatMap((id, i) => (i !== labels.altroIndex && !known(id) ? [i] : []))
}

/** Highest cosine similarity of an L2-normalised embedding to the class prototypes. */
export function maxSimilarity(embedding: ArrayLike<number>, prototypes: Float32Array, dims: number): number {
  let best = -Infinity
  for (let row = 0; row * dims < prototypes.length; row++) {
    let dot = 0
    for (let i = 0; i < dims; i++) dot += embedding[i]! * prototypes[row * dims + i]!
    best = Math.max(best, dot)
  }
  return best
}

function normalise(vectors: Float32Array[]): Float32Array {
  const dims = vectors[0]?.length ?? 0
  const mean = new Float32Array(dims)
  for (const v of vectors) for (let i = 0; i < dims; i++) mean[i]! += v[i]! / vectors.length
  const norm = Math.hypot(...mean) || 1
  return mean.map((x) => x / norm)
}

/** The trained catalogue model (phase 6) behind the Recognizer interface, run in a worker. */
export class OnnxRecognizer implements Recognizer {
  name = 'onnx'
  private labels: Promise<ModelLabels> | null = null
  private prototypes: Promise<Float32Array> | null = null

  private load(): Promise<ModelLabels> {
    this.labels ??= fetch(`${BASE}labels.json`).then(async (response) => {
      if (!response.ok) throw new Error('labels.json missing')
      const labels = (await response.json()) as ModelLabels
      this.name = labels.version
      return labels
    })
    this.labels.catch(() => (this.labels = null))
    return this.labels
  }

  private loadPrototypes(labels: ModelLabels): Promise<Float32Array> {
    this.prototypes ??= fetch(`${BASE}${labels.prototypes.file}`).then(async (r) => new Float32Array(await r.arrayBuffer()))
    return this.prototypes
  }

  async recognize(image: ImageBitmap | Blob, signal?: AbortSignal): Promise<Recognition> {
    const labels = await this.load()
    const pixels = await decodePixels(image)
    signal?.throwIfAborted()
    const result = await runInWorker({
      kind: 'catalog',
      pixels,
      modelUrl: new URL(`${BASE}${labels.model.file}`, location.href).href,
      inputName: labels.model.input,
      views: labels.tta,
      mean: labels.input.mean,
      std: labels.input.std,
    })
    signal?.throwIfAborted()
    const probabilities = softmax(averageLogits(result.logits), labels.temperature)
    const meta: DecisionMetadata = { ...labels, excludedIndices: excludedClasses(labels) }
    let similarity: number | undefined
    if (labels.embeddingGate.enabled && result.embeddings.length > 0) {
      const prototypes = await this.loadPrototypes(labels)
      similarity = maxSimilarity(normalise(result.embeddings), prototypes, labels.prototypes.shape[1])
    }
    return decide(probabilities, meta, similarity)
  }
}
