'use client'
// IdentityProvider: in-memory key map during Phase 5 execution.
// Phase 6 replaces the passkey stubs with real WebAuthn PRF + IndexedDB storage.
// See /trust for the BYOK architecture guarantee this implements.

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { RouteProvider } from '@atta/models'
import { type ApiKeyMap, hasProviderKey, missingProviders as computeMissing } from './keymap'

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
  // Passkey surface — stubs until Phase 6 wires them up:
  savePasskey: () => Promise<void>
  unlockWithPasskey: () => Promise<void>
  forgetDevice: () => Promise<void>
  passkeySupported: boolean
}

const IdentityContext = createContext<IdentityValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeyMap>({})

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

  const signOut = useCallback(() => setKeys({}), [])

  const hasKey = useCallback((p: RouteProvider) => hasProviderKey(keys, p), [keys])

  const missing = useCallback((req: Set<RouteProvider>) => computeMissing(keys, req), [keys])

  // Stubs replaced in Phase 6:
  const savePasskey = useCallback(async () => {}, [])
  const unlockWithPasskeyFn = useCallback(async () => {}, [])
  const forgetDevice = useCallback(async () => {}, [])

  const value = useMemo<IdentityValue>(
    () => ({
      state: {
        kind: 'no-stored-credential',
        keys,
        providers: Object.keys(keys) as RouteProvider[]
      },
      setKey,
      removeKey,
      signOut,
      hasKey,
      missingProviders: missing,
      savePasskey,
      unlockWithPasskey: unlockWithPasskeyFn,
      forgetDevice,
      passkeySupported: false
    }),
    [keys, setKey, removeKey, signOut, hasKey, missing, savePasskey, unlockWithPasskeyFn, forgetDevice]
  )

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityValue {
  const v = useContext(IdentityContext)
  if (!v) throw new Error('useIdentity must be used within <IdentityProvider>')
  return v
}
