/**
 * Image preprocessing identical to the Python export (PIL), so the phone feeds the models what they
 * were measured on. PIL's resampling for 8-bit images is reproduced step by step (Resample.c):
 * separable passes (horizontal, then vertical), filter support widened when downscaling, and
 * coefficients in 22-bit fixed point with an 8-bit image between the two passes.
 */

export interface Rgba {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, as from canvas getImageData. */
  data: Uint8ClampedArray | Uint8Array
}

export interface Rgb {
  width: number
  height: number
  /** RGB, 3 bytes per pixel. */
  data: Uint8Array
}

export type Filter = 'bilinear' | 'bicubic'

const PRECISION_BITS = 32 - 8 - 2

const FILTERS: Record<Filter, { support: number; weight: (x: number) => number }> = {
  bilinear: {
    support: 1,
    weight: (x) => {
      const v = Math.abs(x)
      return v < 1 ? 1 - v : 0
    },
  },
  bicubic: {
    support: 2,
    weight: (x) => {
      const a = -0.5
      const v = Math.abs(x)
      if (v < 1) return ((a + 2) * v - (a + 3)) * v * v + 1
      if (v < 2) return (((v - 5) * v + 8) * v - 4) * a
      return 0
    },
  },
}

interface Coefficients {
  /** Per output pixel: first input pixel and how many are used. */
  bounds: Int32Array
  /** Per output pixel: ksize fixed-point weights. */
  weights: Int32Array
  ksize: number
}

/** PIL precompute_coeffs + normalize_coeffs_8bpc, for the whole input range. */
function coefficients(inSize: number, outSize: number, filter: Filter): Coefficients {
  const { support: baseSupport, weight } = FILTERS[filter]
  const scale = inSize / outSize
  const filterScale = Math.max(scale, 1)
  const support = baseSupport * filterScale
  const ksize = Math.ceil(support) * 2 + 1
  const bounds = new Int32Array(outSize * 2)
  const weights = new Int32Array(outSize * ksize)
  const row = new Float64Array(ksize)
  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale
    const ss = 1 / filterScale
    let xmin = Math.trunc(center - support + 0.5)
    if (xmin < 0) xmin = 0
    let xmax = Math.trunc(center + support + 0.5)
    if (xmax > inSize) xmax = inSize
    xmax -= xmin
    let total = 0
    row.fill(0)
    for (let x = 0; x < xmax; x++) {
      const w = weight((x + xmin - center + 0.5) * ss)
      row[x] = w
      total += w
    }
    for (let x = 0; x < xmax; x++) {
      const k = total !== 0 ? row[x]! / total : row[x]!
      weights[xx * ksize + x] = k < 0 ? Math.trunc(-0.5 + k * (1 << PRECISION_BITS)) : Math.trunc(0.5 + k * (1 << PRECISION_BITS))
    }
    bounds[xx * 2] = xmin
    bounds[xx * 2 + 1] = xmax
  }
  return { bounds, weights, ksize }
}

function clip8(value: number): number {
  const shifted = value >> PRECISION_BITS
  return shifted < 0 ? 0 : shifted > 255 ? 255 : shifted
}

function horizontal(src: Rgb, outWidth: number, filter: Filter): Rgb {
  const { bounds, weights, ksize } = coefficients(src.width, outWidth, filter)
  const out = new Uint8Array(outWidth * src.height * 3)
  const half = 1 << (PRECISION_BITS - 1)
  for (let y = 0; y < src.height; y++) {
    const rowIn = y * src.width * 3
    const rowOut = y * outWidth * 3
    for (let xx = 0; xx < outWidth; xx++) {
      const xmin = bounds[xx * 2]!
      const count = bounds[xx * 2 + 1]!
      let r = half
      let g = half
      let b = half
      for (let x = 0; x < count; x++) {
        const k = weights[xx * ksize + x]!
        const i = rowIn + (xmin + x) * 3
        r += src.data[i]! * k
        g += src.data[i + 1]! * k
        b += src.data[i + 2]! * k
      }
      const o = rowOut + xx * 3
      out[o] = clip8(r)
      out[o + 1] = clip8(g)
      out[o + 2] = clip8(b)
    }
  }
  return { width: outWidth, height: src.height, data: out }
}

function vertical(src: Rgb, outHeight: number, filter: Filter): Rgb {
  const { bounds, weights, ksize } = coefficients(src.height, outHeight, filter)
  const out = new Uint8Array(src.width * outHeight * 3)
  const half = 1 << (PRECISION_BITS - 1)
  const stride = src.width * 3
  for (let yy = 0; yy < outHeight; yy++) {
    const ymin = bounds[yy * 2]!
    const count = bounds[yy * 2 + 1]!
    for (let x = 0; x < src.width; x++) {
      let r = half
      let g = half
      let b = half
      for (let y = 0; y < count; y++) {
        const k = weights[yy * ksize + y]!
        const i = (ymin + y) * stride + x * 3
        r += src.data[i]! * k
        g += src.data[i + 1]! * k
        b += src.data[i + 2]! * k
      }
      const o = yy * stride + x * 3
      out[o] = clip8(r)
      out[o + 1] = clip8(g)
      out[o + 2] = clip8(b)
    }
  }
  return { width: src.width, height: outHeight, data: out }
}

/** PIL Image.resize((width, height), BILINEAR | BICUBIC) on an RGB image. */
export function resize(src: Rgb, width: number, height: number, filter: Filter): Rgb {
  let image = src
  if (width !== image.width) image = horizontal(image, width, filter)
  if (height !== image.height) image = vertical(image, height, filter)
  return image
}

export function rgbaToRgb(src: Rgba): Rgb {
  const out = new Uint8Array(src.width * src.height * 3)
  for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
    out[i] = src.data[j]!
    out[i + 1] = src.data[j + 1]!
    out[i + 2] = src.data[j + 2]!
  }
  return { width: src.width, height: src.height, data: out }
}

/** Python's round(): halves go to the even neighbour. */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value)
  const diff = value - floor
  if (diff > 0.5) return floor + 1
  if (diff < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}

export interface View {
  resizeShortSide: number
  crop: number
  flip: boolean
}

/**
 * The catalogue model's view (labels.json): short side to resizeShortSide with PIL BILINEAR,
 * long side floor(long * scale + 0.5), centre crop at floor((w - crop) / 2), optional mirror.
 */
export function catalogueView(src: Rgb, view: View): Rgb {
  const scale = view.resizeShortSide / Math.min(src.width, src.height)
  const width = src.width <= src.height ? view.resizeShortSide : Math.floor(src.width * scale + 0.5)
  const height = src.height < src.width ? view.resizeShortSide : Math.floor(src.height * scale + 0.5)
  const resized = resize(src, width, height, 'bilinear')
  return crop(resized, view.crop, view.flip)
}

/** PlantCLEF's view (ml/allplants/plantclef.py): short side to size with PIL BICUBIC, centre crop. */
export function allPlantsView(src: Rgb, size: number): Rgb {
  const scale = size / Math.min(src.width, src.height)
  const width = Math.max(size, roundHalfEven(src.width * scale))
  const height = Math.max(size, roundHalfEven(src.height * scale))
  return crop(resize(src, width, height, 'bicubic'), size, false)
}

function crop(src: Rgb, size: number, flip: boolean): Rgb {
  const left = Math.floor((src.width - size) / 2)
  const top = Math.floor((src.height - size) / 2)
  const out = new Uint8Array(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = flip ? left + size - 1 - x : left + x
      const i = ((top + y) * src.width + sx) * 3
      const o = (y * size + x) * 3
      out[o] = src.data[i]!
      out[o + 1] = src.data[i + 1]!
      out[o + 2] = src.data[i + 2]!
    }
  }
  return { width: size, height: size, data: out }
}

/** NCHW float32: pixel / 255, then (x - mean) / std per channel. */
export function toTensor(src: Rgb, mean: readonly number[], std: readonly number[]): Float32Array {
  const plane = src.width * src.height
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * plane + i] = (src.data[i * 3 + c]! / 255 - mean[c]!) / std[c]!
    }
  }
  return out
}
