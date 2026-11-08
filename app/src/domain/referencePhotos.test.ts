import { describe, expect, it } from 'vitest'
import { photoCredit } from './referencePhotos'

describe('reference photo credit', () => {
  it('keeps the author and the licence from iNaturalist attribution lines', () => {
    expect(
      photoCredit({ licence: 'CC BY', attribution: '(c) Jeff Jones, some rights reserved (CC BY), uploaded by Jeff Jones', pageUrl: '' }),
    ).toBe('Foto: Jeff Jones · CC BY · iNaturalist')
    expect(
      photoCredit({ licence: 'CC BY-SA', attribution: '(c) m.dolores paderne sa…, some rights reserved (CC BY-SA)', pageUrl: '' }),
    ).toBe('Foto: m.dolores paderne sa… · CC BY-SA · iNaturalist')
    expect(photoCredit({ licence: 'CC0', attribution: 'no rights reserved', pageUrl: '' })).toBe(
      'Foto: no rights reserved · CC0 · iNaturalist',
    )
  })
})
