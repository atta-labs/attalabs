// Web Crypto AES-GCM wrappers.
// Principles doc guarantee: user API keys are never persisted in plaintext.
// Every encryption generates a fresh 12-byte IV; IV reuse under the same key
// would break AES-GCM authenticity. Never cache an IV. See /trust for the
// full BYOK architecture story.

// Use ArrayBuffer-backed views explicitly so the types satisfy BufferSource
// (Uint8Array<ArrayBufferLike> vs. ArrayBufferView<ArrayBuffer> narrowing in TS 5.7).
export function generateIv(): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(new ArrayBuffer(12))
  crypto.getRandomValues(iv)
  return iv
}

export async function importKeyFromPrfOutput(prfOutput: ArrayBuffer | Uint8Array): Promise<CryptoKey> {
  const src = prfOutput instanceof Uint8Array ? prfOutput : new Uint8Array(prfOutput)
  if (src.byteLength < 32) {
    throw new Error('PRF output must be at least 32 bytes')
  }
  const raw = new Uint8Array(new ArrayBuffer(32))
  raw.set(src.subarray(0, 32))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encryptJson<T>(
  key: CryptoKey,
  value: T
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
  const iv = generateIv()
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  const plaintext = new Uint8Array(new ArrayBuffer(encoded.byteLength))
  plaintext.set(encoded)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { ciphertext, iv }
}

export async function decryptJson<T>(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<T> {
  const ivCopy = new Uint8Array(new ArrayBuffer(iv.byteLength))
  ivCopy.set(iv)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
