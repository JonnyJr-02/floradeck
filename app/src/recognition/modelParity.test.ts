import { readFile } from 'node:fs/promises'
import * as ort from 'onnxruntime-web/wasm'
import { describe, expect, it } from 'vitest'

const fixtures = new URL('../../test/fixtures/parity/', import.meta.url)
const modelUrl = new URL('../../public/models/catalog/model.onnx', import.meta.url)

interface Fixture {
  image: string
  tensor: string
  label: string
  logits: number[]
}

describe('catalogue model parity (ONNX Runtime Web against Python)', () => {
  it('gives the logits Python computed for the same input tensors', async () => {
    ort.env.wasm.numThreads = 1
    const session = await ort.InferenceSession.create(new Uint8Array(await readFile(modelUrl)))
    const parity = JSON.parse(await readFile(new URL('parity.json', fixtures), 'utf8')) as { fixtures: Fixture[] }
    const labels = JSON.parse(await readFile(new URL('../../public/models/catalog/labels.json', import.meta.url), 'utf8')) as {
      classes: string[]
    }
    let checked = 0
    for (const fixture of parity.fixtures) {
      let bytes: Buffer
      try {
        bytes = await readFile(new URL(fixture.tensor, fixtures))
      } catch {
        continue // only two tensors are kept in the repository
      }
      const input = new ort.Tensor('float32', new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), [1, 3, 256, 256])
      const output = await session.run({ image: input })
      const logits = Array.from(output.logits!.data as Float32Array)
      expect(logits).toHaveLength(fixture.logits.length)
      const worst = Math.max(...logits.map((value, i) => Math.abs(value - fixture.logits[i]!)))
      expect(worst).toBeLessThan(1e-2)
      const best = logits.indexOf(Math.max(...logits))
      expect(labels.classes[best]).toBe(fixture.label)
      checked++
    }
    expect(checked).toBe(2)
  }, 60_000)
})
