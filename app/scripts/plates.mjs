// Shrink the botanical plates chosen by catalog/scripts/fetch_plates.py into small WebP files
// for the album: public/plates/<species id>.webp, 480 px on the long side, and their credits in
// src/domain/plates.generated.json. Run with `npm run plates` after fetching; commit both.
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const app = dirname(dirname(fileURLToPath(import.meta.url)))
const catalog = join(app, '..', 'catalog')
const plates = JSON.parse(await readFile(join(catalog, 'plates', 'plates.json'), 'utf8'))
const source = join(catalog, '.cache', 'plates')
const target = join(app, 'public', 'plates')
await mkdir(target, { recursive: true })

const wanted = new Set()
const credits = {}
let bytes = 0
for (const [id, plate] of Object.entries(plates)) {
  if (plate.status !== 'found') continue
  wanted.add(`${id}.webp`)
  credits[id] = { source: plate.source, sourceLabel: plate.sourceLabel, artist: plate.artist, licence: plate.licence, file: plate.file, pageUrl: plate.pageUrl }
  const output = join(target, `${id}.webp`)
  await sharp(join(source, plate.thumbFile))
    .rotate()
    // Old scans carry yellowed margins: trim the flat border, keep the drawing.
    .trim({ threshold: 18 })
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 74, effort: 6 })
    .toFile(output)
  bytes += (await stat(output)).size
}
// Plates of species that left the catalogue (or lost their plate) leave the app too.
for (const file of await readdir(target)) {
  if (!wanted.has(file)) await rm(join(target, file))
}
// The app only knows the plates written here, so it never points at a missing file.
await writeFile(join(app, 'src', 'domain', 'plates.generated.json'), `${JSON.stringify(credits, null, 1)}\n`)
console.log(`${wanted.size} plates, ${(bytes / 1024 / 1024).toFixed(1)} MB in public/plates`)
