// IndexedDB storage for the encrypted credential blob.
// Single record per origin, keyed on 'primary'. The `providers` field is
// plaintext (no secret material) for UI rendering before unlock. The
// `encryptedKeys` blob is only decryptable with the passkey-derived AES key.

import type { RouteProvider } from '@atta/models'

const DB_NAME = 'atta-identity'
const STORE = 'credentials'
const DB_VERSION = 1
const RECORD_ID = 'primary'

export interface StoredCredential {
  id: string
  credentialId: ArrayBuffer
  encryptedKeys: ArrayBuffer
  iv: Uint8Array
  providers: RouteProvider[]
  createdAt: number
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadCredential(): Promise<StoredCredential | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(RECORD_ID)
    req.onsuccess = () => resolve((req.result as StoredCredential | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCredential(cred: Omit<StoredCredential, 'id'>): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put({ id: RECORD_ID, ...cred })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearCredential(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(RECORD_ID)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
