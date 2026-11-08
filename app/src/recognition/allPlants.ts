import { useCallback, useEffect, useState } from 'react'
import { softmax } from './decision'
import { decodePixels, runInWorker } from './workerProtocol'

/**
 * Names for plants outside the catalogue (user's choice on 2026-11-08: offline, unlimited, no
 * accounts). PlantCLEF 2024 (Pl@ntNet, ViT-B/14, 7,806 species of south-western Europe, CC BY 4.0),
 * int8 at 336 px, 94.5 MB in two parts checked with SHA-256. Downloaded once into Cache Storage from
 * Impostazioni; it runs only when the user asks, and it gives names, never a card.
 */

const BASE = `${import.meta.env.BASE_URL}models/allplants/`
const MANIFEST = 'plantclef-336-int8.parts.json'
const NAMES = 'names.json'
export const ALL_PLANTS_CACHE = 'floradeck-allplants-v1'
export const ALL_PLANTS_MB = 95
const SIZE = 336
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

interface Manifest {
  model: string
  bytes: number
  sha256: string
  parts: Array<{ file: string; bytes: number; sha256: string }>
}

export interface PlantName {
  scientific: string
  /** Italian common name from iNaturalist or GBIF; empty when none exists (never invented). */
  italian: string
  confidence: number
}

const absolute = (file: string) => new URL(`${BASE}${file}`, location.href).href

async function hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function cachedManifest(): Promise<Manifest | null> {
  if (typeof caches === 'undefined') return null
  const response = await (await caches.open(ALL_PLANTS_CACHE)).match(absolute(MANIFEST))
  return response ? ((await response.json()) as Manifest) : null
}

/** True when every part and the names are in the cache. */
export async function isDownloaded(): Promise<boolean> {
  const manifest = await cachedManifest()
  if (!manifest) return false
  const cache = await caches.open(ALL_PLANTS_CACHE)
  for (const file of [...manifest.parts.map((p) => p.file), NAMES]) {
    if (!(await cache.match(absolute(file)))) return false
  }
  return true
}

async function fetchChecked(file: string, bytes: number, sha256: string, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(absolute(file), { cache: 'no-store' })
  if (!response.ok || !response.body) throw new Error(`download failed (${response.status})`)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onBytes(value.length)
  }
  if (received !== bytes) throw new Error('incomplete download')
  const joined = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.length
  }
  if ((await hex(joined.buffer)) !== sha256) throw new Error('checksum mismatch')
  return joined.buffer
}

/** Download, check and store the model; progress goes from 0 to 1. */
export async function downloadAllPlants(onProgress: (fraction: number) => void): Promise<void> {
  const manifestResponse = await fetch(absolute(MANIFEST), { cache: 'no-store' })
  if (!manifestResponse.ok) throw new Error('manifest not available')
  const manifestText = await manifestResponse.text()
  const manifest = JSON.parse(manifestText) as Manifest
  const cache = await caches.open(ALL_PLANTS_CACHE)
  let done = 0
  for (const part of manifest.parts) {
    const body = await fetchChecked(part.file, part.bytes, part.sha256, (n) => {
      done += n
      onProgress(Math.min(0.99, done / manifest.bytes))
    })
    await cache.put(absolute(part.file), new Response(body, { headers: { 'Content-Type': 'application/octet-stream' } }))
  }
  const names = await fetch(absolute(NAMES), { cache: 'no-store' })
  if (!names.ok) throw new Error('names not available')
  await cache.put(absolute(NAMES), new Response(await names.text(), { headers: { 'Content-Type': 'application/json' } }))
  // The manifest goes last: it marks the download as complete.
  await cache.put(absolute(MANIFEST), new Response(manifestText, { headers: { 'Content-Type': 'application/json' } }))
  onProgress(1)
}

export async function removeAllPlants(): Promise<void> {
  if (typeof caches !== 'undefined') await caches.delete(ALL_PLANTS_CACHE)
}

let namesCache: Promise<Array<[string, string]>> | null = null

async function names(): Promise<Array<[string, string]>> {
  namesCache ??= caches
    .open(ALL_PLANTS_CACHE)
    .then((cache) => cache.match(absolute(NAMES)))
    .then(async (response) => {
      if (!response) throw new Error('names not downloaded')
      return ((await response.json()) as { classes: Array<[string, string]> }).classes
    })
  namesCache.catch(() => (namesCache = null))
  return namesCache
}

/** The three most likely names among the 7,806 species (a few seconds on a phone). */
export async function identifyPlant(image: Blob): Promise<PlantName[]> {
  const manifest = await cachedManifest()
  if (!manifest) throw new Error('all-plants model not downloaded')
  const [pixels, classes] = await Promise.all([decodePixels(image), names()])
  const result = await runInWorker({
    kind: 'allplants',
    pixels,
    cacheName: ALL_PLANTS_CACHE,
    partUrls: manifest.parts.map((part) => absolute(part.file)),
    size: SIZE,
    mean: MEAN,
    std: STD,
  })
  const probabilities = softmax(result.logits[0]!)
  return topNames(probabilities, classes, 3)
}

export function topNames(probabilities: readonly number[], classes: ReadonlyArray<readonly [string, string]>, count: number): PlantName[] {
  return probabilities
    .map((confidence, i) => ({ confidence, i }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, count)
    .map(({ confidence, i }) => ({ scientific: classes[i]?.[0] ?? '', italian: classes[i]?.[1] ?? '', confidence }))
}

export type AllPlantsState =
  | { status: 'checking' }
  | { status: 'missing' }
  | { status: 'downloading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string }

const listeners = new Set<() => void>()
let shared: AllPlantsState = { status: 'checking' }
function publish(state: AllPlantsState) {
  shared = state
  for (const listener of listeners) listener()
}

/** Download state of the all-plants model, shared by Impostazioni and the result sheets. */
export function useAllPlants() {
  const [state, setState] = useState<AllPlantsState>(shared)
  useEffect(() => {
    const listener = () => setState(shared)
    listeners.add(listener)
    if (shared.status === 'checking' || shared.status === 'missing' || shared.status === 'ready') {
      void isDownloaded().then((ready) => {
        if (shared.status !== 'downloading') publish({ status: ready ? 'ready' : 'missing' })
      }, () => publish({ status: 'missing' }))
    }
    return () => {
      listeners.delete(listener)
    }
  }, [])
  const download = useCallback(async () => {
    publish({ status: 'downloading', progress: 0 })
    try {
      await downloadAllPlants((progress) => publish({ status: 'downloading', progress }))
      publish({ status: 'ready' })
    } catch {
      await removeAllPlants().catch(() => undefined)
      publish({ status: 'error', message: 'Download non riuscito. Controlla la connessione e lo spazio sul telefono, poi riprova.' })
    }
  }, [])
  const remove = useCallback(async () => {
    await removeAllPlants()
    namesCache = null
    publish({ status: 'missing' })
  }, [])
  return { state, download, remove }
}
