/**
 * What travels between the two phones without a server (CLAUDE.md, Gifts and couple):
 * - a gift: one duplicate card with its photo, inside the URL fragment of a link (or a .floradeck file);
 * - a progress snapshot: profile plus one bit per catalogue species, small enough for a QR code.
 * The fragment never reaches the web server. Everything is checked on arrival.
 */

export const GIFT_PREFIX = 'g1.'
export const SNAPSHOT_PREFIX = 's1.'

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export class ShareError extends Error {}

/** FNV-1a over the catalogue ids, so both phones know they count the same species in the same order. */
export function catalogueFingerprint(ids: readonly string[]): string {
  let hash = 0x811c9dc5
  for (const char of ids.join('\n')) {
    hash ^= char.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

// ---------- Gifts ----------

export interface Gift {
  giftId: string
  speciesId: string
  /** Sender's display name and profile id. */
  from: string
  fromId: string
  message: string
  /** When the card was found, and when it was given (ISO 8601). */
  foundAt: string
  sentAt: string
  photo: { type: string; bytes: Uint8Array }
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** g1.<base64url( 4-byte header length | header JSON | photo bytes )> */
export function encodeGift(gift: Gift): string {
  const { photo, ...rest } = gift
  const header = encoder.encode(JSON.stringify({ ...rest, photoType: photo.type }))
  const out = new Uint8Array(4 + header.length + photo.bytes.length)
  new DataView(out.buffer).setUint32(0, header.length)
  out.set(header, 4)
  out.set(photo.bytes, 4 + header.length)
  return GIFT_PREFIX + toBase64Url(out)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_GIFT_BYTES = 200_000

export function decodeGift(text: string): Gift {
  const payload = extractPayload(text, GIFT_PREFIX)
  if (!payload) throw new ShareError('Questo non è un regalo di FloraDeck.')
  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(payload)
  } catch {
    throw new ShareError('Il regalo è incompleto: forse il link è stato tagliato.')
  }
  if (bytes.length < 8 || bytes.length > MAX_GIFT_BYTES) throw new ShareError('Il regalo è incompleto: forse il link è stato tagliato.')
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0)
  if (length > bytes.length - 4) throw new ShareError('Il regalo è incompleto: forse il link è stato tagliato.')
  let header: Record<string, unknown>
  try {
    header = JSON.parse(decoder.decode(bytes.subarray(4, 4 + length))) as Record<string, unknown>
  } catch {
    throw new ShareError('Il regalo è danneggiato.')
  }
  const text_ = (key: string) => (typeof header[key] === 'string' ? (header[key] as string) : '')
  const photoType = text_('photoType')
  if (!UUID.test(text_('giftId')) || !text_('speciesId') || !/^image\/(webp|jpeg|png)$/.test(photoType)) {
    throw new ShareError('Il regalo è danneggiato.')
  }
  return {
    giftId: text_('giftId').toLowerCase(),
    speciesId: text_('speciesId'),
    from: text_('from').slice(0, 40),
    fromId: text_('fromId'),
    message: text_('message').slice(0, 200),
    foundAt: text_('foundAt'),
    sentAt: text_('sentAt'),
    photo: { type: photoType, bytes: bytes.slice(4 + length) },
  }
}

/**
 * Accept what people actually paste: the whole link, the fragment, or the bare payload, with
 * spaces or line breaks a chat app may have added.
 */
export function extractPayload(text: string, prefix: string): string | null {
  const compact = text.replace(/\s+/g, '')
  const at = compact.indexOf(prefix)
  if (at < 0) return null
  const rest = compact.slice(at + prefix.length)
  const match = /^[A-Za-z0-9_-]+/.exec(rest)
  return match ? match[0] : null
}

// ---------- Progress snapshots ----------

export interface Snapshot {
  profileId: string
  name: string
  colour: string
  at: string
  /** Catalogue species found (ids). */
  found: string[]
}

export function encodeSnapshot(snapshot: Snapshot, catalogue: readonly string[]): string {
  const bits = new Uint8Array(Math.ceil(catalogue.length / 8))
  const found = new Set(snapshot.found)
  catalogue.forEach((id, i) => {
    if (found.has(id)) bits[i >> 3]! |= 1 << (i & 7)
  })
  const header = {
    p: snapshot.profileId,
    n: snapshot.name.slice(0, 40),
    c: snapshot.colour,
    t: snapshot.at,
    h: catalogueFingerprint(catalogue),
    b: toBase64Url(bits),
  }
  return SNAPSHOT_PREFIX + toBase64Url(encoder.encode(JSON.stringify(header)))
}

export function decodeSnapshot(text: string, catalogue: readonly string[]): Snapshot {
  const payload = extractPayload(text, SNAPSHOT_PREFIX)
  if (!payload) throw new ShareError('Questi non sono i progressi di FloraDeck.')
  let header: Record<string, unknown>
  try {
    header = JSON.parse(decoder.decode(fromBase64Url(payload))) as Record<string, unknown>
  } catch {
    throw new ShareError('I progressi sono danneggiati.')
  }
  if (header.h !== catalogueFingerprint(catalogue)) {
    throw new ShareError('Le due app hanno cataloghi diversi: aggiornatele tutte e due e riprova.')
  }
  if (typeof header.p !== 'string' || typeof header.b !== 'string') throw new ShareError('I progressi sono danneggiati.')
  const bits = fromBase64Url(header.b)
  const found = catalogue.filter((_, i) => ((bits[i >> 3] ?? 0) >> (i & 7)) & 1)
  return {
    profileId: header.p,
    name: typeof header.n === 'string' ? header.n.slice(0, 40) : '',
    colour: typeof header.c === 'string' ? header.c : '',
    at: typeof header.t === 'string' ? header.t : '',
    found,
  }
}
