import type { Rgba, View } from './preprocess'

interface Base {
  id: number
  pixels: Rgba
  mean: number[]
  std: number[]
}

export type WorkerRequest =
  | (Base & { kind: 'catalog'; modelUrl: string; inputName: string; views: View[] })
  | (Base & { kind: 'allplants'; cacheName: string; partUrls: string[]; size: number })

export type WorkerResponse =
  | { id: number; ok: true; logits: Float32Array[]; embeddings: Float32Array[] }
  | { id: number; ok: false; error: string }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (r: WorkerResponse) => void }>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./inference.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      pending.get(event.data.id)?.resolve(event.data)
      pending.delete(event.data.id)
    }
  }
  return worker
}

type Request = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never

/** Send pixels to the inference worker; the pixel buffer is transferred, not copied. */
export function runInWorker(request: Request): Promise<Extract<WorkerResponse, { ok: true }>> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (response) => (response.ok ? resolve(response) : reject(new Error(response.error))),
    })
    getWorker().postMessage({ ...request, id }, [request.pixels.data.buffer])
  })
}

/** Decode a photo into RGBA pixels on the main thread (canvas), with its EXIF orientation applied. */
export async function decodePixels(image: Blob | ImageBitmap): Promise<Rgba> {
  const bitmap = image instanceof Blob ? await createImageBitmap(image, { imageOrientation: 'from-image' }) : image
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('canvas 2D is not available')
  context.drawImage(bitmap, 0, 0)
  const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height)
  canvas.width = canvas.height = 0
  if (image instanceof Blob) bitmap.close()
  return { width, height, data }
}
