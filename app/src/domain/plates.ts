import platesData from './plates.generated.json'

/**
 * Public-domain botanical plates from Wikimedia Commons, chosen by catalog/scripts/fetch_plates.py
 * and shrunk to WebP by `npm run plates`, which also writes plates.generated.json: only plates whose
 * file is in public/plates/<id>.webp are listed.
 */
export interface Plate {
  file: string
  source: string
  sourceLabel: string
  artist: string
  licence: string
  pageUrl: string
}

const plates = platesData as Record<string, Plate>

export function plateFor(speciesId: string): Plate | undefined {
  return plates[speciesId]
}

export function plateUrl(speciesId: string): string | undefined {
  return plateFor(speciesId) ? `${import.meta.env.BASE_URL}plates/${speciesId}.webp` : undefined
}

/** "Tavola: Jacob Sturm, Deutschlands Flora in Abbildungen (1796–1862) · pubblico dominio, da Wikimedia Commons". */
export function plateCredit(plate: Plate): string {
  return `Tavola: ${plate.sourceLabel} · pubblico dominio, da Wikimedia Commons`
}
