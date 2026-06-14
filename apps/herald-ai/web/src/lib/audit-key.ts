/**
 * Audit credential resolution (task 3b).
 *
 * Centralizes the rules that the settings UI surface AND the audit dispatch
 * path both depend on:
 *
 *   1. Decrypt the stored vendor-key map for a user.
 *   2. Optionally pair it with the user's saved audit-model preference.
 *   3. Auto-fall-back when the stored selection points at a vendor whose key
 *      has since been revoked — the audit must NEVER dispatch against a
 *      vendor with no key. The fallback is always the YAML default
 *      (Anthropic / claude-sonnet-4-20250514 today), and only resolves if
 *      the user still has an Anthropic key. Otherwise we return null and the
 *      caller surfaces a "no key" error to the recruiter — same shape as the
 *      pre-3b behavior.
 *
 * Used by:
 *   - apps/herald-ai/web/src/app/(app)/settings/page.tsx (configured vendors,
 *     current selection, "any key" flag for the publish gate).
 *   - apps/herald-ai/web/src/app/[username]/page.tsx (publish/owner gate).
 *   - apps/herald-ai/web/src/app/api/audit/route.ts (single + batch dispatch).
 *   - apps/herald-ai/web/src/app/api/admin/audit-model/route.ts (validation
 *     that the chosen vendor has a key before persisting).
 */

import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import type { VendorId } from '@atta/models'
import { VENDOR_ORDER } from '@atta/models'

import { db } from '@/db'
import { getUserByClerkId } from '@/db/queries'

// The default vendor + model audits compile against when the user has not
// chosen a model (or the chosen vendor key has been revoked). Mirrors
// yamls/herald-auditor.yaml `defaults.model`. Kept in code so the audit
// dispatch path can fall back without re-reading the YAML.
// must match defaults.model in apps/herald-ai/web/yamls/herald-auditor.yaml
const DEFAULT_AUDIT_VENDOR: VendorId = 'anthropic'
const DEFAULT_AUDIT_MODEL = 'claude-sonnet-4-20250514'

const KNOWN_VENDORS = new Set<string>(VENDOR_ORDER)

export interface DecryptedKeys {
  /** Vendor IDs the user has a non-empty key for, intersected with the
   *  current vendor registry (so orphan keys from older schemas don't leak
   *  into the UI as "configured"). Stable order from VENDOR_ORDER. */
  configuredVendors: VendorId[]
  /** Raw decrypted map — keep the actual key strings off the wire by only
   *  returning the configured-vendor list to the client. Server-only path
   *  uses `keys` directly to call adapter.execute. */
  keys: Record<string, string>
}

/**
 * Load + decrypt a user's vendor-key map. Returns null on any error or when
 * no row exists. Never throws — failures collapse to "no keys".
 */
export async function loadDecryptedKeys(clerkId: string): Promise<DecryptedKeys | null> {
  const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKeyB64) return null

  try {
    const stored = await getProviderKeys(db, clerkId)
    if (!stored) return null

    const masterKey = Buffer.from(masterKeyB64, 'base64')
    const keys = decryptVendorKeys(
      stored.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
      clerkId,
      masterKey
    )

    const configuredVendors = (VENDOR_ORDER as VendorId[]).filter((id) => Boolean(keys[id]) && KNOWN_VENDORS.has(id))

    return { configuredVendors, keys }
  } catch {
    return null
  }
}

export interface AuditSelection {
  vendor: VendorId
  modelId: string
}

/**
 * Resolve the audit selection for a user. Reads their saved selection from
 * the profile row, intersects with the keys they currently have, and falls
 * back to the YAML default (Anthropic / claude-sonnet-4) whenever the
 * selection is missing or stale.
 *
 * Returns null only when the user has NO usable key at all — caller should
 * surface a "configure a key" error to the recruiter.
 */
export async function resolveAuditSelection(
  clerkId: string,
  keys: Record<string, string>
): Promise<AuditSelection | null> {
  // Load saved selection from the profile row.
  const profile = await getUserByClerkId(clerkId)
  const savedVendor = profile?.auditModelVendor ?? null
  const savedModel = profile?.auditModelId ?? null

  if (savedVendor && savedModel && KNOWN_VENDORS.has(savedVendor) && keys[savedVendor]) {
    return { vendor: savedVendor as VendorId, modelId: savedModel }
  }

  // Auto-fall-back: prefer the YAML default; only return it if the user has
  // an Anthropic key. Otherwise, we have no path to dispatch.
  if (keys[DEFAULT_AUDIT_VENDOR]) {
    return { vendor: DEFAULT_AUDIT_VENDOR, modelId: DEFAULT_AUDIT_MODEL }
  }

  return null
}

export interface ResolvedAuditCredentials {
  vendor: VendorId
  modelId: string
  apiKey: string
  /** True when we used the YAML default because the saved selection's vendor
   *  had no key (revoked since selection). Useful for logs and UI surfacing
   *  "Selected model unavailable — using default". */
  fellBackFromSelection: boolean
}

/**
 * One-shot helper for the audit dispatch path. Loads keys, resolves the
 * selection (with auto-fallback), and returns the (vendor, modelId, apiKey)
 * triple ready for compileFlow + LangGraphAdapter. Null = no usable key.
 */
export async function resolveAuditCredentials(clerkId: string): Promise<ResolvedAuditCredentials | null> {
  const decrypted = await loadDecryptedKeys(clerkId)
  if (!decrypted) return null

  const selection = await resolveAuditSelection(clerkId, decrypted.keys)
  if (!selection) return null

  const apiKey = decrypted.keys[selection.vendor]
  if (!apiKey) return null

  // Detect whether we fell back. The selection is "fellback" when either the
  // user had no saved selection, or the saved selection's vendor key is gone.
  const profile = await getUserByClerkId(clerkId)
  const savedVendor = profile?.auditModelVendor ?? null
  const savedModel = profile?.auditModelId ?? null
  const fellBackFromSelection = Boolean(
    savedVendor && savedModel && (savedVendor !== selection.vendor || savedModel !== selection.modelId)
  )

  return { vendor: selection.vendor, modelId: selection.modelId, apiKey, fellBackFromSelection }
}

export { DEFAULT_AUDIT_VENDOR, DEFAULT_AUDIT_MODEL }
