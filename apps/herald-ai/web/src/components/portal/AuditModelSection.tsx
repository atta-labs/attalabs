'use client'

/**
 * Audit model selector — task 3b.
 *
 * Sits under the multi-vendor key list inside Settings → API Keys. Lets the
 * user pick which model the forensic audit compiles + dispatches against.
 *
 * Constraints:
 *   - Per-user default only (V1). No per-audit override.
 *   - Filtered to vendors the user has keys for. Selecting a model for a
 *     vendor with no key is impossible in the UI (lock state). The server
 *     enforces the same invariant — see /api/admin/audit-model.
 *   - Auto-fallback: if the user revokes the selected vendor's key, the
 *     audit dispatch path resolves to the YAML default at runtime. This
 *     component reflects the saved selection; the audit picks the safest
 *     model at audit time.
 *
 * Key UX rule: never show a config that the next audit can't actually run.
 * Locked rows (no key for that vendor) appear via the ModelPicker's own
 * lock affordance — we omit `onProvideKey` so clicking does nothing
 * (matches the "Settings page = separate key management" pattern from
 * .claude/skills/model-picker/SKILL.md RULE #3).
 */

import { useState } from 'react'
import { Badge, Button, ModelPicker, useToastContext } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useCatalog, type VendorId } from '@atta/models'

interface AuditModelSectionProps {
  configuredVendors: VendorId[]
  initialSelection: { vendor: VendorId; modelId: string } | null
}

export function AuditModelSection({ configuredVendors, initialSelection }: AuditModelSectionProps) {
  const catalog = useCatalog()
  const { successToast, errorToast } = useToastContext()

  const [selection, setSelection] = useState(initialSelection)
  const [saving, setSaving] = useState(false)

  const configuredRoutes = new Set<VendorId>(configuredVendors)

  // ModelPicker uses { route, modelId } where `route` is a VendorId.
  const pickerValue = selection ? { route: selection.vendor, modelId: selection.modelId } : null

  async function persist(next: { vendor: VendorId; modelId: string } | null) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/audit-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          next === null ? { vendor: null, modelId: null } : { vendor: next.vendor, modelId: next.modelId }
        )
      })
      if (!res.ok) {
        errorToast('Save failed', 'Could not save audit model. Please try again.')
        return
      }
      setSelection(next)
      successToast('Audit model updated', 'New audits will use this model.')
    } catch {
      errorToast('Save failed', 'Could not save audit model. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(v: { route: VendorId; modelId: string }) {
    void persist({ vendor: v.route, modelId: v.modelId })
  }

  function handleReset() {
    void persist(null)
  }

  return (
    <div className='space-y-4 border-t border-border pt-6'>
      <div className='space-y-1'>
        <Text as='p' className='font-medium'>
          Audit Model
        </Text>
        <Text as='p' muted className='text-sm'>
          Choose which model compiles your forensic audit. Falls back to Claude Sonnet 4 when the selected model's
          vendor key is missing — your audits never silently break.
        </Text>
      </div>

      {configuredVendors.length === 0 ? (
        <Text as='p' muted className='text-sm'>
          Add a vendor key above to choose a model.
        </Text>
      ) : (
        <div className='flex flex-wrap items-center gap-3'>
          <ModelPicker
            options={catalog}
            value={pickerValue}
            onChange={handleChange}
            configuredRoutes={configuredRoutes}
          />
          {selection ? (
            <Badge variant='outline' className='text-success border-success/40 text-xs'>
              Selected
            </Badge>
          ) : (
            <Badge variant='outline' className='text-muted-foreground border-border text-xs'>
              Default (Claude Sonnet 4)
            </Badge>
          )}
          {selection && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleReset}
              disabled={saving}
              className='text-xs text-muted-foreground hover:text-foreground'
            >
              Reset to default
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
