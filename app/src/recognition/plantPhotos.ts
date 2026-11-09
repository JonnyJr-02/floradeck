/**
 * Photos for the all-plants names: the 7,806 species have no pictures on the phone (that would be
 * ~80 MB), so with a network the app asks iNaturalist for the taxon's photo. Only the scientific name
 * leaves the phone. Only openly licensed photos (Creative Commons), shown with their credit; a name
 * iNaturalist does not know exactly gets no photo rather than a wrong one.
 */

const API = 'https://api.inaturalist.org/v1'
const OPEN_LICENCES = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'])

export interface PlantPhoto {
  url: string
  /** "Evie Bowen · CC BY-NC · iNaturalist" */
  credit: string
}

interface ApiPhoto {
  medium_url?: string
  url?: string
  attribution?: string
  license_code?: string | null
}
interface ApiTaxon {
  id: number
  name: string
  default_photo?: ApiPhoto | null
  taxon_photos?: Array<{ photo: ApiPhoto }>
}

const licenceLabel = (code: string) => (code === 'cc0' ? 'CC0' : code.toUpperCase().replace(/^CC-/, 'CC '))

/** "(c) Evie Bowen, some rights reserved (CC BY-NC), uploaded by Evie Bowen" → "Evie Bowen · CC BY-NC · iNaturalist". */
export function creditOf(photo: ApiPhoto): string {
  const author = (photo.attribution ?? '')
    .replace(/^\(c\)\s*/i, '')
    .split(',')[0]!
    .trim()
  const parts = [author || 'Autore su iNaturalist', licenceLabel(photo.license_code ?? ''), 'iNaturalist']
  return parts.filter(Boolean).join(' · ')
}

function usable(photo: ApiPhoto | null | undefined): PlantPhoto | null {
  const code = photo?.license_code
  if (!photo || !code || !OPEN_LICENCES.has(code)) return null
  const url = photo.medium_url ?? photo.url?.replace('/square.', '/medium.')
  return url ? { url, credit: creditOf(photo) } : null
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

async function getJson(fetcher: Fetcher, url: string): Promise<unknown> {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`iNaturalist answered ${url} with an error`)
  return response.json()
}

/** The first openly licensed photo of the taxon with exactly this scientific name, or null. */
export async function findPlantPhoto(scientific: string, fetcher: Fetcher = (url) => fetch(url)): Promise<PlantPhoto | null> {
  const search = (await getJson(fetcher, `${API}/taxa?q=${encodeURIComponent(scientific)}&is_active=true&per_page=10`)) as {
    results?: ApiTaxon[]
  }
  const taxon = search.results?.find((result) => same(result.name, scientific))
  if (!taxon) return null
  const direct = usable(taxon.default_photo)
  if (direct) return direct
  // The default photo is "all rights reserved": look through the taxon's other photos.
  const detail = (await getJson(fetcher, `${API}/taxa/${taxon.id}`)) as { results?: ApiTaxon[] }
  for (const { photo } of detail.results?.[0]?.taxon_photos ?? []) {
    const found = usable(photo)
    if (found) return found
  }
  return null
}

const asked = new Map<string, Promise<PlantPhoto | null>>()

/** Cached for the session: a name shown twice is asked for once. Failures (no network) are not kept. */
export function plantPhoto(scientific: string): Promise<PlantPhoto | null> {
  const key = scientific.toLowerCase()
  let request = asked.get(key)
  if (!request) {
    request = findPlantPhoto(scientific)
    asked.set(key, request)
    request.catch(() => asked.delete(key))
  }
  return request
}
