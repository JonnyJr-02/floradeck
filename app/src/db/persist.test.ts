import { describe, expect, it, vi } from 'vitest'
import { readStorageStatus, requestPersistence } from './persist'

function fakeStorage({ persisted = false, grant = false, usage = 0, quota = 0 } = {}) {
  return {
    persisted: vi.fn(async () => persisted),
    persist: vi.fn(async () => grant),
    estimate: vi.fn(async () => ({ usage, quota })),
  }
}

const asStorage = (fake: object) => fake as unknown as StorageManager

describe('requestPersistence', () => {
  it('does not ask again when the archive is already protected', async () => {
    const storage = fakeStorage({ persisted: true })
    expect(await requestPersistence(asStorage(storage))).toBe('persisted')
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('reports what the browser answers', async () => {
    expect(await requestPersistence(asStorage(fakeStorage({ grant: true })))).toBe('granted')
    expect(await requestPersistence(asStorage(fakeStorage({ grant: false })))).toBe('denied')
  })

  it('copes with browsers without the API', async () => {
    expect(await requestPersistence(undefined)).toBe('unsupported')
    expect(await requestPersistence(asStorage({}))).toBe('unsupported')
  })
})

describe('readStorageStatus', () => {
  it('reads protection, usage and quota', async () => {
    const storage = fakeStorage({ persisted: true, usage: 2048, quota: 1_000_000 })
    expect(await readStorageStatus(asStorage(storage))).toEqual({ persisted: true, usage: 2048, quota: 1_000_000 })
  })

  it('says nothing it does not know', async () => {
    expect(await readStorageStatus(undefined)).toEqual({ persisted: null, usage: null, quota: null })
  })
})
