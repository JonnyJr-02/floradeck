/// <reference lib="webworker" />
/**
 * Runs both models off the main thread with ONNX Runtime Web (WASM, one thread: GitHub Pages cannot
 * send the COOP/COEP headers that threads need). The catalogue model comes from the precache; the
 * all-plants model is read from the Cache Storage it was downloaded into, joined from its parts.
 */
import * as ort from 'onnxruntime-web/wasm'
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { allPlantsView, catalogueView, rgbaToRgb, toTensor, type View } from './preprocess'
import type { WorkerProgress, WorkerRequest, WorkerResponse } from './workerProtocol'

ort.env.wasm.wasmPaths = { mjs: mjsUrl, wasm: wasmUrl }
ort.env.wasm.numThreads = 1

const sessions = new Map<string, Promise<ort.InferenceSession>>()
const lastUse = new Map<string, number>()
// The all-plants model takes a few hundred MB while loaded: let it go after a quiet minute.
const RELEASE_AFTER_MS = 60_000

function session(key: string, load: () => Promise<Uint8Array>): Promise<ort.InferenceSession> {
  let pending = sessions.get(key)
  if (!pending) {
    pending = load().then((bytes) => ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] }))
    pending.catch(() => sessions.delete(key))
    sessions.set(key, pending)
  }
  lastUse.set(key, Date.now())
  return pending
}

function scheduleRelease(key: string) {
  setTimeout(async () => {
    const pending = sessions.get(key)
    if (!pending || Date.now() - (lastUse.get(key) ?? 0) < RELEASE_AFTER_MS) return
    sessions.delete(key)
    try {
      await (await pending).release()
    } catch {
      // already gone
    }
  }, RELEASE_AFTER_MS + 1_000)
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`model not available (${response.status})`)
  return new Uint8Array(await response.arrayBuffer())
}

function report(id: number, progress: WorkerProgress['progress']) {
  self.postMessage({ id, progress } satisfies WorkerProgress)
}

async function cachedParts(cacheName: string, urls: string[], id: number): Promise<Uint8Array> {
  const cache = await caches.open(cacheName)
  const parts: Uint8Array[] = []
  for (const [i, url] of urls.entries()) {
    const response = await cache.match(url)
    if (!response) throw new Error('all-plants model not downloaded')
    parts.push(new Uint8Array(await response.arrayBuffer()))
    report(id, { stage: 'load', fraction: (i + 1) / urls.length })
  }
  report(id, { stage: 'prepare' })
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }
  return joined
}

async function handle(request: WorkerRequest): Promise<WorkerResponse> {
  const rgb = rgbaToRgb(request.pixels)
  if (request.kind === 'catalog') {
    const model = await session('catalog', () => fetchBytes(request.modelUrl))
    const logits: Float32Array[] = []
    const embeddings: Float32Array[] = []
    for (const view of request.views as View[]) {
      const data = toTensor(catalogueView(rgb, view), request.mean, request.std)
      const output = await model.run({ [request.inputName]: new ort.Tensor('float32', data, [1, 3, view.crop, view.crop]) })
      logits.push(output.logits!.data as Float32Array)
      if (output.embedding) embeddings.push(output.embedding.data as Float32Array)
    }
    return { id: request.id, ok: true, logits, embeddings }
  }
  const model = await session('allplants', () => cachedParts(request.cacheName, request.partUrls, request.id))
  report(request.id, { stage: 'run' })
  const data = toTensor(allPlantsView(rgb, request.size), request.mean, request.std)
  const output = await model.run({ image: new ort.Tensor('float32', data, [1, 3, request.size, request.size]) })
  scheduleRelease('allplants')
  return { id: request.id, ok: true, logits: [output.logits!.data as Float32Array], embeddings: [] }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  handle(event.data).then(
    (response) => self.postMessage(response),
    (error: unknown) =>
      self.postMessage({ id: event.data.id, ok: false, error: error instanceof Error ? error.message : String(error) }),
  )
}
