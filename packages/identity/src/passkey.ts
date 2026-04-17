// WebAuthn PRF setup and retrieval. Part of the BYOK architecture — see /trust.
//
// PRF (pseudorandom function) is the WebAuthn extension that lets us derive a
// deterministic 256-bit secret from a passkey + fixed salt. We use that secret
// as the AES-GCM key to encrypt/decrypt the user's API key map at rest.
//
// If PRF is unsupported (older browsers, certain authenticators), the
// IdentityProvider falls back to in-memory-only mode — keys are re-entered each
// session. No weak-key fallback ever.

const PRF_SALT = new TextEncoder().encode('vada-api-keys-v1')

export interface PasskeySetupResult {
  credentialId: ArrayBuffer
  prfOutput: ArrayBuffer
}

export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.PublicKeyCredential !== 'undefined'
}

function prfSalt(): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(PRF_SALT.byteLength))
  copy.set(PRF_SALT)
  return copy
}

function challenge(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(32))
  crypto.getRandomValues(buf)
  return buf
}

function userHandle(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(16))
  crypto.getRandomValues(buf)
  return buf
}

export async function createPasskeyWithPrf(
  rpId: string,
  displayName = 'Vāda API Keys'
): Promise<PasskeySetupResult | null> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'Vāda', id: rpId },
      user: {
        id: userHandle(),
        name: 'vada-keys',
        displayName
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: { userVerification: 'required', residentKey: 'required' },
      extensions: { prf: { eval: { first: prfSalt() } } }
    }
  })) as PublicKeyCredential | null

  if (!credential) return null
  const ext = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer }; enabled?: boolean }
  }
  const prfFirst = ext.prf?.results?.first
  if (!prfFirst) return null
  return { credentialId: credential.rawId, prfOutput: prfFirst }
}

export async function unlockWithPasskey(rpId: string, credentialId: ArrayBuffer): Promise<ArrayBuffer | null> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId,
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: prfSalt() } } }
    }
  })) as PublicKeyCredential | null

  if (!assertion) return null
  const ext = assertion.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } }
  return ext.prf?.results?.first ?? null
}
