'use client'
// IdentityProvider: browser-side BYOK state.
// In-memory `keys` during an unlocked session; encrypted at rest in IndexedDB
// via a passkey-derived AES-GCM key. See /trust for the architecture promise.

import type { RouteProvider } from '@atta/models'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { decryptJson, encryptJson, importKeyFromPrfOutput } from './crypto'
import { type ApiKeyMap, hasProviderKey, missingProviders as computeMissing } from './keymap'
import { createPasskeyWithPrf, isPasskeySupported, unlockWithPasskey } from './passkey'
import { clearCredential, loadCredential, saveCredential, type StoredCredential } from './storage'

export type IdentityStateKind = 'no-stored-credential' | 'locked' | 'unlocked'

export interface IdentityState {
  kind: IdentityStateKind
  keys: ApiKeyMap
  providers: RouteProvider[]
}

export interface IdentityValue {
  state: IdentityState
  setKey: (provider: RouteProvider, key: string) => void
  removeKey: (provider: RouteProvider) => void
  signOut: () => void
  hasKey: (provider: RouteProvider) => boolean
  missingProviders: (required: Set<RouteProvider>) => RouteProvider[]
  savePasskey: () => Promise<void>
  unlockWithPasskey: () => Promise<void>
  forgetDevice: () => Promise<void>
  passkeySupported: boolean
}

const IdentityContext = createContext<IdentityValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeyMap>({})
  const [stateKind, setStateKind] = useState<IdentityStateKind>('no-stored-credential')
  const [providers, setProviders] = useState<RouteProvider[]>([])
  const [passkeySupported, setPasskeySupported] = useState(false)
  const cryptoKeyRef = useRef<CryptoKey | null>(null)
  const credentialIdRef = useRef<ArrayBuffer | null>(null)

  // On mount, check passkey support + stored credential
  useEffect(() => {
    setPasskeySupported(isPasskeySupported())
    loadCredential()
      .then((cred) => {
        if (cred) {
          credentialIdRef.current = cred.credentialId
          setProviders(cred.providers)
          setStateKind('locked')
        }
      })
      .catch(() => {
        // IndexedDB unavailable (private mode, quota) — stay in no-credential mode
      })
  }, [])

  // Re-encrypt blob whenever the keymap changes, if we have an unlocked session
  useEffect(() => {
    const cryptoKey = cryptoKeyRef.current
    const credentialId = credentialIdRef.current
    if (stateKind !== 'unlocked' || !credentialId || !cryptoKey) return
    ;(async () => {
      try {
        const { ciphertext, iv } = await encryptJson(cryptoKey, keys)
        const now = Date.now()
        await saveCredential({
          credentialId,
          encryptedKeys: ciphertext,
          iv,
          providers: Object.keys(keys) as RouteProvider[],
          createdAt: now,
          updatedAt: now
        })
        setProviders(Object.keys(keys) as RouteProvider[])
      } catch {
        // Persistence failure — in-memory session keeps working; next mutation will retry
      }
    })()
  }, [keys, stateKind])

  const setKey = useCallback((provider: RouteProvider, key: string) => {
    setKeys((prev) => ({ ...prev, [provider]: key }))
  }, [])

  const removeKey = useCallback((provider: RouteProvider) => {
    setKeys((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }, [])

  const signOut = useCallback(() => {
    cryptoKeyRef.current = null
    setKeys({})
    if (credentialIdRef.current) setStateKind('locked')
  }, [])

  const hasKey = useCallback((p: RouteProvider) => hasProviderKey(keys, p), [keys])

  const missing = useCallback((req: Set<RouteProvider>) => computeMissing(keys, req), [keys])

  const savePasskey = useCallback(async () => {
    if (!passkeySupported) throw new Error('Passkeys are not supported in this browser')
    const rpId = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const result = await createPasskeyWithPrf(rpId)
    if (!result) {
      throw new Error('Passkey setup failed — your authenticator may not support PRF')
    }
    const cryptoKey = await importKeyFromPrfOutput(result.prfOutput)
    const { ciphertext, iv } = await encryptJson(cryptoKey, keys)
    const now = Date.now()
    const providerList = Object.keys(keys) as RouteProvider[]
    await saveCredential({
      credentialId: result.credentialId,
      encryptedKeys: ciphertext,
      iv,
      providers: providerList,
      createdAt: now,
      updatedAt: now
    })
    cryptoKeyRef.current = cryptoKey
    credentialIdRef.current = result.credentialId
    setProviders(providerList)
    setStateKind('unlocked')
  }, [keys, passkeySupported])

  const unlock = useCallback(async () => {
    const cred: StoredCredential | null = await loadCredential()
    if (!cred) throw new Error('No stored credential to unlock')
    const rpId = window.location.hostname
    const prfOutput = await unlockWithPasskey(rpId, cred.credentialId)
    if (!prfOutput) throw new Error('Passkey unlock failed')
    const cryptoKey = await importKeyFromPrfOutput(prfOutput)
    const decrypted = await decryptJson<ApiKeyMap>(cryptoKey, cred.encryptedKeys, cred.iv)
    cryptoKeyRef.current = cryptoKey
    credentialIdRef.current = cred.credentialId
    setKeys(decrypted)
    setProviders(cred.providers)
    setStateKind('unlocked')
  }, [])

  const forgetDevice = useCallback(async () => {
    await clearCredential()
    cryptoKeyRef.current = null
    credentialIdRef.current = null
    setKeys({})
    setProviders([])
    setStateKind('no-stored-credential')
  }, [])

  const value = useMemo<IdentityValue>(
    () => ({
      state: { kind: stateKind, keys, providers },
      setKey,
      removeKey,
      signOut,
      hasKey,
      missingProviders: missing,
      savePasskey,
      unlockWithPasskey: unlock,
      forgetDevice,
      passkeySupported
    }),
    [
      stateKind,
      keys,
      providers,
      setKey,
      removeKey,
      signOut,
      hasKey,
      missing,
      savePasskey,
      unlock,
      forgetDevice,
      passkeySupported
    ]
  )

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityValue {
  const v = useContext(IdentityContext)
  if (!v) throw new Error('useIdentity must be used within <IdentityProvider>')
  return v
}
