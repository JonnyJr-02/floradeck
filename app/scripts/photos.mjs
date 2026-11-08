// Shrink the reference photos chosen by catalog/scripts/fetch_photos.py into WebP files for the
// species sheet: public/photos/<species id>.webp (640 px on the long side) and their credits in
// src/domain/photos.generated.json. Run with `npm run photos` after fetching; commit both.
// They are cached on the phone the first time they are seen (runtime cache, not the precache).
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const app = dirname(dirname(fileURLToPath(import.meta.url)))
const catalog = join(app, '..', 'catalog')
const photos = JSON.parse(await readFile(join(catalog, 'photos', 'photos.json'), 'utf8'))
const source = join(catalog, '.cache', 'photos')
const target = join(app, 'public', 'photos')
await mkdir(target, { recursive: true })

const wanted = new Set()
const credits = {}
let bytes = 0
for (const [id, photo] of Object.entries(photos)) {
  if (photo.status !== 'found') continue
  wanted.add(`${id}.webp`)
  credits[id] = { licence: photo.licence, attribution: photo.attribution, pageUrl: photo.pageUrl }
  const output = join(target, `${id}.webp`)
  await sharp(join(source, `${id}.jpg`))
    .rotate()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(output)
  bytes += (await stat(output)).size
}
for (const file of await readdir(target)) {
  if (!wanted.has(file)) await rm(join(target, file))
}
// The app only knows the photos written here, so it never points at a missing file.
await writeFile(join(app, 'src', 'domain', 'photos.generated.json'), `${JSON.stringify(credits, null, 1)}\n`)
console.log(`${wanted.size} photos, ${(bytes / 1024 / 1024).toFixed(1)} MB in public/photos`)
