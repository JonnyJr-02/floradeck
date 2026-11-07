export type PersistenceResult = 'persisted' | 'granted' | 'denied' | 'unsupported'

function defaultStorage(): StorageManager | undefined {
  return globalThis.navigator?.storage
}

/**
 * Asks the browser not to evict the collection when the phone runs low on space.
 * Chrome and Safari decide on their own (installed apps are favoured) and show no prompt.
 */
export async function requestPersistence(storage: StorageManager | undefined = defaultStorage()): Promise<PersistenceResult> {
  if (typeof storage?.persist !== 'function' || typeof storage.persisted !== 'function') return 'unsupported'
  if (await storage.persisted()) return 'persisted'
  return (await storage.persist()) ? 'granted' : 'denied'
}

export interface StorageStatus {
  /** null when the browser does not say. */
  persisted: boolean | null
  usage: number | null
  quota: number | null
}

export async function readStorageStatus(storage: StorageManager | undefined = defaultStorage()): Promise<StorageStatus> {
  const persisted = typeof storage?.persisted === 'function' ? await storage.persisted() : null
  const estimate = typeof storage?.estimate === 'function' ? await storage.estimate() : undefined
  return { persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null }
}
