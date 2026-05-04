import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateApiKey(prefix: string): { plaintext: string; hash: string } {
  const random = randomBytes(32).toString('base64url')
  const plaintext = `${prefix}_${random}`
  return { plaintext, hash: hashApiKey(plaintext) }
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function verifyApiKey(plaintext: string, expectedHash: string): boolean {
  // Always hash plaintext first so both buffers are the same length,
  // then compare with timingSafeEqual to prevent timing attacks.
  const actualHash = hashApiKey(plaintext)
  const a = Buffer.from(actualHash, 'hex')
  const b = Buffer.from(expectedHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
