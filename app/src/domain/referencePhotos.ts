import photosData from './photos.generated.json'

/**
 * One good, openly licensed photo per species from iNaturalist (CC0, CC BY, CC BY-SA), chosen by
 * catalog/scripts/fetch_photos.py and shrunk by `npm run photos`: only photos whose file is in
 * public/photos/<id>.webp are listed.
 */
export interface ReferencePhoto {
  licence: string
  /** iNaturalist's own credit line, e.g. "(c) Jeff Jones, some rights reserved (CC BY)". */
  attribution: string
  pageUrl: string
}

const photos = photosData as Record<string, ReferencePhoto>

export function referencePhoto(speciesId: string): ReferencePhoto | undefined {
  return photos[speciesId]
}

export function referencePhotoUrl(speciesId: string): string | undefined {
  return photos[speciesId] ? `${import.meta.env.BASE_URL}photos/${speciesId}.webp` : undefined
}

/** "Foto: Jeff Jones · CC BY · iNaturalist", from iNaturalist's "(c) Name, some rights reserved (…)". */
export function photoCredit(photo: ReferencePhoto): string {
  const author = photo.attribution
    .replace(/^\(c\)\s*/i, '')
    .replace(/,\s*(some|all) rights reserved.*$/i, '')
    .replace(/\s*\((CC[^)]*|public domain)\)\s*$/i, '')
    .trim()
  return `Foto: ${author || 'autore su iNaturalist'} · ${photo.licence} · iNaturalist`
}
