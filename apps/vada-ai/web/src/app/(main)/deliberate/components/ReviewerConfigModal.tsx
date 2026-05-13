'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { probeProviderKey } from '@atta/identity'
import type { VendorId } from '@atta/models'
import { useCatalog } from '@atta/models'
import { Button, ModelPicker, useToastContext } from '@atta/ui'
import { Dialog, DialogContent, DialogTitle } from '@atta/ui/components/dialog'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { getReviewerConfig, resolveVendor as resolveVendorFromCatalog } from '@/lib/reviewer-models'
import type { ReviewerConfig } from '@/lib/reviewer-models'

interface ReviewerConfigModalProps {
  spec: Flow
  onSave: (config: ReviewerConfig) => void
  onClose: () => void
  configuredProviders: string[]
}

export function ReviewerConfigModal({ spec, onSave, onClose, configuredProviders }: ReviewerConfigModalProps) {
  const catalog = useCatalog()
  const { successToast } = useToastContext()
  const router = useRouter()

  // Show all agents so role agents (e.g. Synthesizer) can also be configured
  const editableAgents: FlowAgent[] = useMemo(() => spec.agents, [spec.agents])

  // Per-agent selected model.
  // Editable slots: only seed from saved user config — never from YAML default.
  // Non-editable slots (e.g. Synthesizer): seed from YAML model since it's fixed by the spec.
  const [selections, setSelections] = useState<Record<string, { route: VendorId; modelId: string } | null>>(() => {
    const saved = getReviewerConfig(spec.id)
    return Object.fromEntries(
      editableAgents.map((a) => {
        const model = a.editable ? saved?.[a.name] : (saved?.[a.name] ?? a.model)
        const vendor = model ? (resolveVendorFromCatalog(model, catalog) as VendorId | null) : null
        return [a.name, vendor && model ? { route: vendor, modelId: model } : null]
      })
    )
  })

  const [sessionSavedProviders, setSessionSavedProviders] = useState<VendorId[]>([])

  const configuredRoutes = useMemo(() => {
    const set = new Set<VendorId>([...(configuredProviders as VendorId[]), ...sessionSavedProviders])
    return set
  }, [configuredProviders, sessionSavedProviders])

  const handleProvideKey = async (route: VendorId, key: string) => {
    const probe = await probeProviderKey(route, key)
    if (probe.kind === 'invalid_key') {
      throw new Error(probe.error ?? 'Invalid API key.')
    }
    const res = await fetch('/api/keys/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: route, key })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as Record<string, string>).error ?? 'Failed to save key.')
    }
    setSessionSavedProviders((prev) => (prev.includes(route) ? prev : [...prev, route]))
    // Re-run page.tsx so the parent's `configuredProviders` prop reflects the
    // newly saved key. Without this, after the modal saves and closes, the
    // panel's slot-availability check still uses the stale prop and renders a
    // lock for the model the user just enabled.
    router.refresh()
    if (probe.ok) {
      successToast('Key verified', `${route} is ready to use.`)
    } else {
      successToast(`${route} saved with a warning`, probe.error ?? 'Key stored; provider returned a non-success probe.')
    }
  }

  const allConfigured = editableAgents.every((a) => {
    const sel = selections[a.name]
    if (!sel) return false
    return configuredRoutes.has(sel.route)
  })

  const handleSave = () => {
    const config: ReviewerConfig = {}
    for (const agent of editableAgents) {
      const sel = selections[agent.name]
      if (sel) {
        config[agent.name] = sel.modelId
      }
    }
    onSave(config)
  }

  // Production catalog: strip Ollama (reviewer slots need hosted models)
  const reviewerCatalog = useMemo(() => catalog.filter((e) => e.route !== 'ollama'), [catalog])

  // Build a label for each agent: editable slots → "REVIEWER N", role agents → role name
  const reviewerLabels = (() => {
    const labels: Record<string, string> = {}
    let n = 1
    for (const a of editableAgents) {
      if (a.editable) {
        labels[a.name] = `REVIEWER ${n++}`
      } else if (a.role) {
        labels[a.name] = a.role.toUpperCase().replace(/-/g, ' ')
      } else {
        labels[a.name] = a.name.toUpperCase()
      }
    }
    return labels
  })()

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className='w-full max-w-md space-y-6 border-border bg-card p-6'>
        <div className='space-y-1'>
          <DialogTitle className='font-serif text-lg text-foreground'>Configure models</DialogTitle>
          <p className='text-sm text-muted-foreground'>
            Pick a model for each slot. All need unlocked API keys to run.
          </p>
        </div>

        <div className='space-y-4'>
          {editableAgents.map((agent) => (
            <div key={agent.name} className='space-y-1.5'>
              <div className='text-[11px] font-mono uppercase tracking-widest text-muted-foreground'>
                {reviewerLabels[agent.name]}
              </div>
              <ModelPicker
                options={reviewerCatalog}
                value={selections[agent.name] ?? null}
                onChange={(val) => setSelections((prev) => ({ ...prev, [agent.name]: val }))}
                configuredRoutes={configuredRoutes}
                onProvideKey={handleProvideKey}
                mode='popover'
                align='start'
                side='bottom'
              />
            </div>
          ))}
        </div>

        <div className='flex gap-3 pt-2'>
          <Button onClick={handleSave} disabled={!allConfigured} className='flex-1'>
            Save
          </Button>
          <Button onClick={onClose} variant='outline' className='flex-1'>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
