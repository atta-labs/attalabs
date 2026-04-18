'use client'

// All identity-banner behavior — state, effects, async handlers. The
// IdentityBanner component stays purely presentational and reads from this.

import { providerLabel } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import { useToastContext } from '@atta/ui'
import { useCallback, useState } from 'react'

export function useIdentityBanner() {
  const identity = useIdentity()
  const { errorToast, successToast } = useToastContext()
  const [busy, setBusy] = useState(false)
  const [confirmForget, setConfirmForget] = useState(false)

  const hasInMemoryKeys = Object.keys(identity.state.keys).length > 0
  const providerSummary =
    identity.state.providers.length > 0
      ? `${identity.state.providers.map(providerLabel).join(', ')} configured on this device.`
      : hasInMemoryKeys
        ? `${(Object.keys(identity.state.keys) as typeof identity.state.providers).map(providerLabel).join(', ')} in memory for this session.`
        : 'no keys yet.'

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

  const signOut = useCallback(() => identity.signOut(), [identity])
  const promptForget = useCallback(() => setConfirmForget(true), [])
  const cancelForget = useCallback(() => setConfirmForget(false), [])

  return {
    kind: identity.state.kind,
    hasInMemoryKeys,
    passkeySupported: identity.passkeySupported,
    providerSummary,
    busy,
    confirmForget,
    save,
    forget,
    signOut,
    promptForget,
    cancelForget
  }
}
