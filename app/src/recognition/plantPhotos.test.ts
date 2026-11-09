import { describe, expect, it } from 'vitest'
import { creditOf, findPlantPhoto } from './plantPhotos'

function fakeApi(responses: Record<string, unknown>) {
  const calls: string[] = []
  const fetcher = async (url: string) => {
    calls.push(url)
    const key = Object.keys(responses).find((part) => url.includes(part))
    return { ok: key !== undefined, json: async () => (key ? responses[key] : {}) }
  }
  return { fetcher, calls }
}

const open = {
  medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpeg',
  attribution: '(c) Evie Bowen, some rights reserved (CC BY-NC), uploaded by Evie Bowen',
  license_code: 'cc-by-nc',
}
const closed = {
  medium_url: 'https://static.inaturalist.org/photos/2/medium.jpg',
  attribution: '(c) Someone, all rights reserved',
  license_code: null,
}

describe('photos for the all-plants names', () => {
  it('takes the openly licensed photo of the exact taxon, with its credit', async () => {
    const { fetcher } = fakeApi({
      'taxa?q=Pelargonium%20zonale': {
        results: [
          { id: 1, name: 'Pelargonium × hybridum', default_photo: closed },
          { id: 2, name: 'Pelargonium zonale', default_photo: open },
        ],
      },
    })
    expect(await findPlantPhoto('Pelargonium zonale', fetcher)).toEqual({
      url: open.medium_url,
      credit: 'Evie Bowen · CC BY-NC · iNaturalist',
    })
  })

  it('looks past an all-rights-reserved default photo', async () => {
    const { fetcher, calls } = fakeApi({
      'taxa?q=': { results: [{ id: 7, name: 'Crepis foetida', default_photo: closed }] },
      'taxa/7': { results: [{ id: 7, name: 'Crepis foetida', taxon_photos: [{ photo: closed }, { photo: open }] }] },
    })
    expect((await findPlantPhoto('Crepis foetida', fetcher))?.url).toBe(open.medium_url)
    expect(calls).toHaveLength(2)
  })

  it('shows nothing rather than another plant’s photo or a closed one', async () => {
    const other = fakeApi({ 'taxa?q=': { results: [{ id: 3, name: 'Crepis capillaris', default_photo: open }] } })
    expect(await findPlantPhoto('Crepis foetida', other.fetcher)).toBeNull()
    const onlyClosed = fakeApi({
      'taxa?q=': { results: [{ id: 7, name: 'Crepis foetida', default_photo: closed }] },
      'taxa/7': { results: [{ id: 7, name: 'Crepis foetida', taxon_photos: [{ photo: closed }] }] },
    })
    expect(await findPlantPhoto('Crepis foetida', onlyClosed.fetcher)).toBeNull()
  })

  it('names the licence the way people read it', () => {
    expect(creditOf({ attribution: '(c) Ann', license_code: 'cc0' })).toBe('Ann · CC0 · iNaturalist')
    expect(creditOf({ attribution: '(c) Ann, some rights reserved (CC BY-SA)', license_code: 'cc-by-sa' })).toBe(
      'Ann · CC BY-SA · iNaturalist',
    )
  })
})
