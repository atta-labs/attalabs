import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export type EncryptedVendorKeys = {
  kek_version: string
  encryption_scheme_version: string
  encrypted_dek: string
  dek_iv: string
  dek_auth_tag: string
  encrypted_keys: string
  keys_iv: string
  keys_auth_tag: string
}

export function encryptVendorKeys(
  plaintext: Record<string, string>,
  userId: string,
  masterKey: Buffer
): EncryptedVendorKeys {
  // Generate a fresh DEK and IVs for each call
  const dek = randomBytes(32)
  const dekIv = randomBytes(12)
  const keysIv = randomBytes(12)
  const aad = Buffer.from(userId)

  // Encrypt the DEK under the master key
  const dekCipher = createCipheriv('aes-256-gcm', masterKey, dekIv)
  dekCipher.setAAD(aad)
  const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()])
  const dekAuthTag = dekCipher.getAuthTag()

  // Encrypt the vendor keys JSON under the DEK
  const keysCipher = createCipheriv('aes-256-gcm', dek, keysIv)
  keysCipher.setAAD(aad)
  const keysJson = Buffer.from(JSON.stringify(plaintext))
  const encryptedKeys = Buffer.concat([keysCipher.update(keysJson), keysCipher.final()])
  const keysAuthTag = keysCipher.getAuthTag()

  return {
    kek_version: 'v1-env',
    encryption_scheme_version: 'v1-aesgcm-256',
    encrypted_dek: encryptedDek.toString('base64'),
    dek_iv: dekIv.toString('base64'),
    dek_auth_tag: dekAuthTag.toString('base64'),
    encrypted_keys: encryptedKeys.toString('base64'),
    keys_iv: keysIv.toString('base64'),
    keys_auth_tag: keysAuthTag.toString('base64')
  }
}

export function decryptVendorKeys(
  payload: EncryptedVendorKeys,
  userId: string,
  masterKey: Buffer
): Record<string, string> {
  const aad = Buffer.from(userId)

  // Decrypt the DEK
  const dekDecipher = createDecipheriv('aes-256-gcm', masterKey, Buffer.from(payload.dek_iv, 'base64'))
  dekDecipher.setAAD(aad)
  dekDecipher.setAuthTag(Buffer.from(payload.dek_auth_tag, 'base64'))
  const dek = Buffer.concat([dekDecipher.update(Buffer.from(payload.encrypted_dek, 'base64')), dekDecipher.final()])

  // Decrypt the vendor keys
  const keysDecipher = createDecipheriv('aes-256-gcm', dek, Buffer.from(payload.keys_iv, 'base64'))
  keysDecipher.setAAD(aad)
  keysDecipher.setAuthTag(Buffer.from(payload.keys_auth_tag, 'base64'))
  const keysJson = Buffer.concat([
    keysDecipher.update(Buffer.from(payload.encrypted_keys, 'base64')),
    keysDecipher.final()
  ])

  return JSON.parse(keysJson.toString()) as Record<string, string>
}
