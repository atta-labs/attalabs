import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { decryptVendorKeys, encryptVendorKeys } from '../envelope'

function makeMasterKey() {
  return randomBytes(32)
}

const SAMPLE_KEYS = { anthropic: 'sk-ant-test123', google: 'AIza-test', openai: 'sk-oai-test' }
const USER_ID = 'user_2abc123'

describe('encryptVendorKeys / decryptVendorKeys', () => {
  it('round-trip: decrypt returns original plaintext', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    const result = decryptVendorKeys(payload, USER_ID, master)
    expect(result).toEqual(SAMPLE_KEYS)
  })

  it('wrong userId (AAD mismatch) throws on decrypt', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    expect(() => decryptVendorKeys(payload, 'user_different', master)).toThrow()
  })

  it('wrong masterKey throws on decrypt', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    const wrongMaster = makeMasterKey()
    expect(() => decryptVendorKeys(payload, USER_ID, wrongMaster)).toThrow()
  })

  it('tampered ciphertext byte throws on decrypt', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    // Flip a byte in the middle of encrypted_keys
    const buf = Buffer.from(payload.encrypted_keys, 'base64')
    const midIdx = Math.floor(buf.length / 2)
    buf.writeUInt8(buf.readUInt8(midIdx) ^ 0xff, midIdx)
    const tampered = { ...payload, encrypted_keys: buf.toString('base64') }
    expect(() => decryptVendorKeys(tampered, USER_ID, master)).toThrow()
  })

  it('tampered auth tag throws on decrypt', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    const tagBuf = Buffer.from(payload.keys_auth_tag, 'base64')
    tagBuf.writeUInt8(tagBuf.readUInt8(0) ^ 0xff, 0)
    const tampered = { ...payload, keys_auth_tag: tagBuf.toString('base64') }
    expect(() => decryptVendorKeys(tampered, USER_ID, master)).toThrow()
  })

  it('two encryptions of same input produce different IVs', () => {
    const master = makeMasterKey()
    const a = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    const b = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    expect(a.keys_iv).not.toBe(b.keys_iv)
    expect(a.dek_iv).not.toBe(b.dek_iv)
  })

  it('output contains all required schema fields', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    expect(payload).toHaveProperty('kek_version')
    expect(payload).toHaveProperty('encryption_scheme_version')
    expect(payload).toHaveProperty('encrypted_dek')
    expect(payload).toHaveProperty('dek_iv')
    expect(payload).toHaveProperty('dek_auth_tag')
    expect(payload).toHaveProperty('encrypted_keys')
    expect(payload).toHaveProperty('keys_iv')
    expect(payload).toHaveProperty('keys_auth_tag')
  })

  it('all binary fields are base64 strings', () => {
    const master = makeMasterKey()
    const payload = encryptVendorKeys(SAMPLE_KEYS, USER_ID, master)
    const b64Fields = ['encrypted_dek', 'dek_iv', 'dek_auth_tag', 'encrypted_keys', 'keys_iv', 'keys_auth_tag']
    for (const field of b64Fields) {
      const val = payload[field as keyof typeof payload]
      expect(typeof val).toBe('string')
      expect(() => Buffer.from(val as string, 'base64')).not.toThrow()
    }
  })
})
