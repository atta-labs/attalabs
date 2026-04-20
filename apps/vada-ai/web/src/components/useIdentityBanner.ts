'use client'

// All identity-banner behavior — state, effects, async handlers. The
// IdentityBanner component stays purely presentational and reads from this.

import { providerLabel } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import { useToastContext } from '@atta/ui'
import { useCallback, useState } from 'react'

export function useIdentityBanner() {
  const identity = useIdentity()
  const { errorToast, successToast, infoToast } = useToastContext()
  const [busy, setBusy] = useState(false)
  const [confirmForget, setConfirmForget] = useState(false)
  const [pendingRemoveProvider, setPendingRemoveProvider] = useState<string | null>(null)

  const hasInMemoryKeys = Object.keys(identity.state.keys).length > 0
  const allProviders = Object.keys(identity.state.keys) as typeof identity.state.providers
  const savedProviderLabels = identity.state.providers.map(providerLabel).join(', ')
  const unsavedProviders = allProviders.filter((provider) => !identity.state.providers.includes(provider))
  const unsavedProviderLabels = unsavedProviders.map(providerLabel).join(', ')
  const providerSummary =
    identity.state.providers.length > 0
      ? `${savedProviderLabels} configured on this device.`
      : hasInMemoryKeys
        ? `${(Object.keys(identity.state.keys) as typeof identity.state.providers).map(providerLabel).join(', ')} in memory for this session.`
        : 'no keys yet.'
  const unlockedStatusSuffix =
    identity.state.providers.length > 0 && unsavedProviders.length > 0
      ? `${savedProviderLabels} configured · ${unsavedProviderLabels} in memory`
      : identity.state.providers.length > 0
        ? `${savedProviderLabels} configured`
        : `${(Object.keys(identity.state.keys) as typeof identity.state.providers).map(providerLabel).join(', ')} in memory`

  const save = useCallback(async () => {
    if (!hasInMemoryKeys) {
      errorToast('No keys to save', 'Add at least one API key first.')
      return
    }
    setBusy(true)
    try {
      await identity.savePasskey()
      successToast('Keys saved', 'Unlock with Touch ID / Face ID / Windows Hello next time.')
    } catch (e) {
      errorToast(
        'Could not save with passkey',
        e instanceof Error ? e.message : 'Your keys stay in memory for this session.'
      )
    } finally {
      setBusy(false)
    }
  }, [hasInMemoryKeys, identity, errorToast, successToast])

  const forget = useCallback(async () => {
    setBusy(true)
    try {
      await identity.forgetDevice()
      successToast('This device is forgotten', 'Your passkey in your OS keychain was not touched.')
    } catch (e) {
      errorToast('Could not forget device', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
      setConfirmForget(false)
    }
  }, [identity, errorToast, successToast])

  const updatePasskey = useCallback(async () => {
    if (unsavedProviders.length === 0) return
    setBusy(true)
    try {
      if (identity.state.kind === 'locked') {
        await identity.unlockWithPasskey()
      }
      successToast('Keys updated', 'Your passkey now includes the new API keys.')
    } catch (e) {
      errorToast(
        'Could not update passkey',
        e instanceof Error ? e.message : 'Your keys stay in memory for this session.'
      )
    } finally {
      setBusy(false)
    }
  }, [unsavedProviders, identity, errorToast, successToast])

  const signOut = useCallback(() => identity.signOut(), [identity])
  const promptForget = useCallback(() => setConfirmForget(true), [])
  const cancelForget = useCallback(() => setConfirmForget(false), [])
  const promptRemoveProvider = useCallback(
    (provider: string) => {
      if (identity.state.kind === 'locked') {
        infoToast('Unlock first', 'Pick a model to unlock, then remove keys.')
        return
      }
      setPendingRemoveProvider(provider)
    },
    [identity.state.kind, infoToast]
  )
  const cancelRemoveProvider = useCallback(() => setPendingRemoveProvider(null), [])
  const confirmRemoveProvider = useCallback(async () => {
    if (!pendingRemoveProvider) return
    setBusy(true)
    try {
      identity.removeKey(pendingRemoveProvider as (typeof identity.state.providers)[0])
      successToast(
        'Key removed',
        `${providerLabel(pendingRemoveProvider as (typeof identity.state.providers)[0])} key deleted.`
      )
      setPendingRemoveProvider(null)
    } catch (e) {
      errorToast('Could not remove key', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }, [pendingRemoveProvider, identity, successToast, errorToast])

  return {
    kind: identity.state.kind,
    hasInMemoryKeys,
    allProviders,
    unsavedProviders,
    passkeySupported: identity.passkeySupported,
    providerSummary,
    savedProviderLabels,
    unlockedStatusSuffix,
    busy,
    confirmForget,
    pendingRemoveProvider,
    save,
    forget,
    updatePasskey,
    signOut,
    promptForget,
    cancelForget,
    promptRemoveProvider,
    cancelRemoveProvider,
    confirmRemoveProvider
  }
}
