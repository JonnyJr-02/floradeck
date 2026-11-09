import { describe, expect, it } from 'vitest'
import { species } from './catalog'
import {
  ShareError,
  catalogueFingerprint,
  decodeGift,
  decodeGiftCode,
  decodeSnapshot,
  encodeGift,
  encodeGiftCode,
  encodeSnapshot,
  extractPayload,
  fromBase64Url,
  isGiftCode,
  toBase64Url,
  type Gift,
} from './share'

const catalogue = species.map((entry) => entry.id)

const gift: Gift = {
  giftId: '3f1c2a8e-7b4d-4c1e-9a2b-1d2e3f4a5b6c',
  speciesId: 'papaver-rhoeas',
  from: 'Jonny',
  fromId: 'a1',
  message: "L'ho trovato pensando a te",
  foundAt: '2026-05-14T10:00:00.000Z',
  sentAt: '2026-11-09T18:00:00.000Z',
  photo: { type: 'image/webp', bytes: new Uint8Array(18_000).map((_, i) => (i * 37) % 256) },
}

describe('gift links', () => {
  it('round-trips a gift with its photo', () => {
    const encoded = encodeGift(gift)
    expect(encoded.startsWith('g1.')).toBe(true)
    // A 18 KB photo stays a link a chat app accepts (~24 KB of text).
    expect(encoded.length).toBeLessThan(26_000)
    const back = decodeGift(encoded)
    expect({ ...back, photo: undefined }).toEqual({ ...gift, photo: undefined })
    expect(back.photo.type).toBe('image/webp')
    expect(Array.from(back.photo.bytes)).toEqual(Array.from(gift.photo.bytes))
  })

  it('accepts the whole link, the fragment or the payload, even with line breaks', () => {
    const encoded = encodeGift(gift)
    const link = `https://jonnyjr-02.github.io/floradeck/regalo#${encoded}`
    const broken = `Un regalo per te:\n${link.slice(0, 60)}\n${link.slice(60)}`
    for (const text of [link, `#${encoded}`, encoded, broken]) expect(decodeGift(text).giftId).toBe(gift.giftId)
  })

  it('refuses what is not a gift, a cut link and a tampered header', () => {
    expect(() => decodeGift('ciao')).toThrow(ShareError)
    const encoded = encodeGift(gift)
    expect(() => decodeGift(encoded.slice(0, 40))).toThrow(/incompleto/)
    const bad = encodeGift({ ...gift, giftId: 'not-a-uuid' })
    expect(() => decodeGift(bad)).toThrow(/danneggiato/)
  })

  it('keeps base64url free of characters links would mangle', () => {
    const bytes = new Uint8Array(256).map((_, i) => i)
    const text = toBase64Url(bytes)
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(Array.from(fromBase64Url(text))).toEqual(Array.from(bytes))
    expect(extractPayload('nothing here', 'g1.')).toBeNull()
  })
})

describe('progress snapshots', () => {
  it('round-trips the species found in a few hundred characters (fits a QR code)', () => {
    const found = catalogue.filter((_, i) => i % 3 === 0)
    const encoded = encodeSnapshot({ profileId: 'b2', name: 'Bea', colour: '#a83e2b', at: '2026-11-09T18:00:00Z', found }, catalogue)
    expect(encoded.length).toBeLessThan(300)
    const back = decodeSnapshot(encoded, catalogue)
    expect(back).toMatchObject({ profileId: 'b2', name: 'Bea', colour: '#a83e2b' })
    expect(back.found).toEqual(found)
  })

  it('refuses a snapshot made with another catalogue', () => {
    const encoded = encodeSnapshot({ profileId: 'b2', name: 'Bea', colour: '', at: '', found: [] }, catalogue)
    expect(() => decodeSnapshot(encoded, [...catalogue, 'nuova-specie'])).toThrow(/cataloghi diversi/)
    expect(catalogueFingerprint(['a', 'b'])).not.toBe(catalogueFingerprint(['b', 'a']))
  })
})

describe('gift codes (inside the gift picture)', () => {
  const info = {
    giftId: '0f8fad5b-d9cb-469f-a165-70867728950e',
    speciesId: 'papaver-rhoeas',
    from: 'Anna',
    fromId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    message: 'Per te, dal prato dietro casa',
    foundAt: '2026-05-02T10:00:00.000Z',
    sentAt: '2026-11-09T18:00:00.000Z',
  }

  it('carries the gift and the sender’s progress', () => {
    const found = catalogue.filter((_, i) => i % 4 === 0)
    const progress = { profileId: info.fromId, name: 'Anna', colour: '#b45f8a', at: info.sentAt, found }
    const text = encodeGiftCode(info, progress, catalogue)
    expect(isGiftCode(text)).toBe(true)
    expect(decodeGiftCode(text, catalogue)).toEqual({ gift: info, progress })
  })

  it('is still a gift between apps with different catalogues, only without the progress', () => {
    const text = encodeGiftCode(info, { profileId: info.fromId, name: 'Anna', colour: '', at: '', found: [] }, catalogue)
    expect(decodeGiftCode(text, [...catalogue, 'nuova-specie'])).toEqual({ gift: info, progress: undefined })
  })

  it('refuses what is not a gift', () => {
    expect(isGiftCode('https://example.test')).toBe(false)
    expect(() => decodeGiftCode('{"fd":1}', catalogue)).toThrow(/non è un regalo/)
    expect(() => decodeGiftCode('{"fd":2,"i":"x","s":"a","p":"b"}', catalogue)).toThrow(/danneggiato/)
    expect(() => decodeGiftCode('ciao', catalogue)).toThrow(/non è un regalo/)
  })
})
