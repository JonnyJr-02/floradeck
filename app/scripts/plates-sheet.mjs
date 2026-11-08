// Contact sheet of every plate with its species, to check by eye that each plate shows the right
// plant: catalog/plates/plates-<album>.jpg, one image per album. Run after `npm run plates`.
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const app = dirname(dirname(fileURLToPath(import.meta.url)))
const catalog = join(app, '..', 'catalog')
const plates = JSON.parse(await readFile(join(catalog, 'plates', 'plates.json'), 'utf8'))
const species = JSON.parse(await readFile(join(catalog, 'species.json'), 'utf8'))
const out = process.argv[2] ?? join(catalog, '.cache')

const CELL = 220
const LABEL = 46
const COLUMNS = 6
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const albums = [...new Set(species.map((entry) => entry.albumId ?? 'leggendaria'))]
for (const album of albums) {
  const list = species.filter((entry) => (entry.albumId ?? 'leggendaria') === album)
  const rows = Math.ceil(list.length / COLUMNS)
  const layers = []
  for (const [i, entry] of list.entries()) {
    const left = (i % COLUMNS) * CELL
    const top = Math.floor(i / COLUMNS) * (CELL + LABEL)
    const plate = plates[entry.id]
    if (plate?.status === 'found') {
      const input = await sharp(join(app, 'public', 'plates', `${entry.id}.webp`))
        .resize(CELL - 10, CELL - 10, { fit: 'contain', background: '#ffffff' })
        .toBuffer()
      layers.push({ input, left: left + 5, top: top + 5 })
    }
    const label = `<svg width="${CELL}" height="${LABEL}"><text x="6" y="17" font-family="Arial" font-size="14" font-weight="bold">${escape(`${entry.number ?? '★'} ${entry.commonNameIt}`)}</text><text x="6" y="36" font-family="Arial" font-size="12" font-style="italic">${escape(entry.scientificName)}${plate?.status === 'found' ? ` · ${plate.source}` : ' · NO PLATE'}</text></svg>`
    layers.push({ input: Buffer.from(label), left, top: top + CELL })
  }
  await sharp({ create: { width: COLUMNS * CELL, height: rows * (CELL + LABEL), channels: 3, background: '#ffffff' } })
    .composite(layers)
    .jpeg({ quality: 80 })
    .toFile(join(out, `plates-${album}.jpg`))
  console.log(`plates-${album}.jpg`)
}
