// server-only — never import this from client components

const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // bytes — standard for GCM

function getKey(): Promise<CryptoKey> {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY
  if (!raw) throw new Error('SETTINGS_ENCRYPTION_KEY env var is missing')
  const bytes = Buffer.from(raw, 'base64')
  if (bytes.length !== 32) throw new Error('SETTINGS_ENCRYPTION_KEY must be 32 bytes (base64 encoded)')
  return crypto.subtle.importKey('raw', bytes, { name: ALGORITHM }, false, ['encrypt', 'decrypt'])
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), IV_LENGTH)
  return Buffer.from(combined).toString('base64')
}

export async function decryptApiKey(stored: string): Promise<string> {
  const key = await getKey()
  const combined = Buffer.from(stored, 'base64')
  const iv = combined.subarray(0, IV_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

export function makeKeyHint(apiKey: string): string {
  return `…${apiKey.slice(-4)}`
}
