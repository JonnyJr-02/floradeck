// Contact sheets of every plate (or, with --photos, every reference photo) with its species, to check
// by eye that each shows the right plant: <folder>/<kind>-<album>.jpg, one image per album.
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const app = dirname(dirname(fileURLToPath(import.meta.url)))
const catalog = join(app, '..', 'catalog')
const plates = JSON.parse(await readFile(join(catalog, 'plates', 'plates.json'), 'utf8'))
const species = JSON.parse(await readFile(join(catalog, 'species.json'), 'utf8'))
const photos = process.argv.includes('--photos')
const out = process.argv.filter((a) => !a.startsWith('--'))[2] ?? join(catalog, '.cache')
const kind = photos ? 'photos' : 'plates'
const chosen = photos ? JSON.parse(await readFile(join(catalog, 'photos', 'photos.json'), 'utf8')) : plates

const CELL = 220
const LABEL = 46
const COLUMNS = 6
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const albums = [...new Set(species.flatMap((entry) => entry.albums.map((m) => m.albumId)))]
for (const album of albums) {
  const list = species
    .flatMap((entry) => entry.albums.filter((m) => m.albumId === album).map((m) => ({ ...entry, number: m.number })))
    .sort((a, b) => a.number - b.number)
  const rows = Math.ceil(list.length / COLUMNS)
  const layers = []
  for (const [i, entry] of list.entries()) {
    const left = (i % COLUMNS) * CELL
    const top = Math.floor(i / COLUMNS) * (CELL + LABEL)
    const plate = chosen[entry.id]
    if (plate?.status === 'found') {
      const input = await sharp(join(app, 'public', kind, `${entry.id}.webp`))
        .resize(CELL - 10, CELL - 10, { fit: 'contain', background: '#ffffff' })
        .toBuffer()
      layers.push({ input, left: left + 5, top: top + 5 })
    }
    const label = `<svg width="${CELL}" height="${LABEL}"><text x="6" y="17" font-family="Arial" font-size="14" font-weight="bold">${escape(`${entry.number ?? '★'} ${entry.commonNameIt}`)}</text><text x="6" y="36" font-family="Arial" font-size="12" font-style="italic">${escape(entry.scientificName)}${plate?.status === 'found' ? ` · ${plate.source ?? plate.licence}` : ' · NONE'}</text></svg>`
    layers.push({ input: Buffer.from(label), left, top: top + CELL })
  }
  await sharp({ create: { width: COLUMNS * CELL, height: rows * (CELL + LABEL), channels: 3, background: '#ffffff' } })
    .composite(layers)
    .jpeg({ quality: 80 })
    .toFile(join(out, `${kind}-${album}.jpg`))
  console.log(`${kind}-${album}.jpg`)
}
