'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { probeProviderKey } from '@atta/identity'
import type { VendorId } from '@atta/models'
import { useCatalog } from '@atta/models'
import { Button, ModelPicker, useToastContext } from '@atta/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@atta/ui/components/dialog'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowUpRight } from 'lucide-react'
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
      {/* Canonical `DialogContent` ships its own surface (`bg-popover`,
          `text-popover-foreground`, `flex flex-col gap-4 p-6 rounded-lg
          border border-border shadow-lg`) — we do NOT override `bg-card`
          here. `bg-popover` is the right surface for floating/transient
          containers per the theme-token role doctrine.
          The `flex flex-col gap-4` from the compound governs the spacing
          between Header / body / Footer uniformly — no hand-rolled
          `space-y-*` divs. */}
      <DialogContent className='w-full max-w-md'>
        <DialogHeader>
          {/* Title is dynamic per spec — names the team being configured so
              the user never has to leave the modal to confirm "which team is
              this?". */}
          <DialogTitle>Configure {spec.displayName}</DialogTitle>
          {/* DialogDescription lives in the proper compound slot so it inherits
              the canonical `text-sm text-muted-foreground` styling and the
              accessible `aria-describedby` association on the dialog. */}
          {spec.description && <DialogDescription>{spec.description}</DialogDescription>}
          {/* "View team" link — the single navigation path out of this modal.
              Mono micro-label, hover-to-accent per the doctrine (hover always
              reaches for `accent`). */}
          <NextLink
            href={`/teams/${spec.id}`}
            variant='subtle'
            className='inline-flex w-fit items-center gap-1 text-xs uppercase tracking-widest'
          >
            View team
            <ArrowUpRight className='size-3' />
          </NextLink>
        </DialogHeader>

        {/* Body — stacked form rows: each agent gets a small mono label
            (REVIEWER 1 / REVIEWER 2 / SYNTHESIZER …) on top and the model
            picker directly below it, full-width. The previous two-column grid
            (label-left, picker-right) compressed the picker into a partial
            row and made the label feel detached from the control it described.
            Stacking restores the natural reading order — slot identity first,
            then the choice for that slot — and lets the trigger fill the dialog
            width so long model names don't truncate prematurely. */}
        <div className='flex flex-col gap-4'>
          {editableAgents.map((agent) => (
            // `items-start` keeps the row's children at the leading edge:
            // ModelPicker renders a Radix-trigger `Button` (display: inline-flex
            // with `justify-center` baked into the variant). Inside a flex-col
            // parent the default `align-items: stretch` would expand the Button
            // to the row's full width, and `justify-center` then centers its
            // content — which is why the picker visually drifted away from the
            // REVIEWER N label above it. `items-start` (align-items: flex-start)
            // suppresses the stretch, so the Button shrinks to content and
            // anchors to the left, flush under the label.
            <div key={agent.name} className='flex flex-col items-start gap-2'>
              <div className='font-mono text-sm uppercase tracking-wider text-muted-foreground'>
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

        {/* DialogFooter — canonical compound slot. Inherits `mt-2 flex
            flex-col-reverse gap-2 sm:flex-row sm:justify-end` from the
            primitive, so spacing matches the header automatically. No
            hand-rolled `pt-*` padding hack. */}
        <DialogFooter>
          <Button onClick={onClose} variant='outline'>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allConfigured}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
