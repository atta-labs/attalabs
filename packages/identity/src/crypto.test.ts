import { describe, expect, it } from 'vitest'
import { decryptJson, encryptJson, generateIv, importKeyFromPrfOutput } from './crypto'

async function makeKey() {
  const prf = crypto.getRandomValues(new Uint8Array(32))
  return importKeyFromPrfOutput(prf)
}

describe('crypto', () => {
  it('encrypts and decrypts JSON roundtrip', async () => {
    const key = await makeKey()
    const plain = { anthropic: 'sk-ant-test', openai: 'sk-oai-test' }
    const { ciphertext, iv } = await encryptJson(key, plain)
    const decrypted = await decryptJson<typeof plain>(key, ciphertext, iv)
    expect(decrypted).toEqual(plain)
  })

  it('generates fresh 12-byte IV each call', () => {
    const a = generateIv()
    const b = generateIv()
    expect(a.byteLength).toBe(12)
    expect(b.byteLength).toBe(12)
    let identical = true
    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) {
        identical = false
        break
      }
    }
    expect(identical).toBe(false)
  })

  it('decryption fails with wrong key', async () => {
    const keyA = await makeKey()
    const keyB = await makeKey()
    const { ciphertext, iv } = await encryptJson(keyA, { a: 1 })
    await expect(decryptJson(keyB, ciphertext, iv)).rejects.toBeDefined()
  })

  it('decryption fails with tampered ciphertext', async () => {
    const key = await makeKey()
    const { ciphertext, iv } = await encryptJson(key, { a: 1 })
    const tampered = new Uint8Array(ciphertext.slice(0))
    tampered[0] = (tampered[0] ?? 0) ^ 0xff
    await expect(decryptJson(key, tampered.buffer, iv)).rejects.toBeDefined()
  })

  it('rejects PRF output shorter than 32 bytes', async () => {
    await expect(importKeyFromPrfOutput(new Uint8Array(16))).rejects.toThrow(/at least 32/)
  })
})
