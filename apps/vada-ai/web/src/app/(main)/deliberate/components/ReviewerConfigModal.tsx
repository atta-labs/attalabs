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
import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { getReviewerConfig, resolveVendor as resolveVendorFromCatalog } from '@/lib/reviewer-models'
import type { ReviewerConfig } from '@/lib/reviewer-models'
import { formatRoleLabel } from '@/lib/flow-helpers'

interface ReviewerConfigModalProps {
  spec: Flow
  onSave: (config: ReviewerConfig) => void
  onClose: () => void
  configuredProviders: string[]
  /** True when the modal was opened because a submit attempt was blocked by an incomplete config. */
  configRequired?: boolean
}

export function ReviewerConfigModal({
  spec,
  onSave,
  onClose,
  configuredProviders,
  configRequired
}: ReviewerConfigModalProps) {
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

  // Split CamelCase agent name into display words: "AssumptionHunter" → "Assumption Hunter".
  // The `uppercase` CSS class handles visual capitalization; names stay distinct across agents
  // that share a role (e.g. FailureMode and BlindCritic both use the critic face but differ
  // by name, system_prompt, and phase — the label keeps them unambiguous in the modal).
  const splitCamelCase = (name: string) => name.replace(/([A-Z])/g, ' $1').trim()

  // Build a label for each agent: always the agent's own name.
  // Role drives the face/color in the deliberation UI and team cards (via VadaAgent → AGENT_BY_ROLE);
  // the modal slot label uses the name so agents sharing a role (critic, researcher) remain distinct.
  const reviewerLabels = Object.fromEntries(editableAgents.map((a) => [a.name, splitCamelCase(a.name)]))

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
      <DialogContent className='w-full max-w-md max-h-[85vh]'>
        <DialogHeader>
          {/* Title is dynamic per spec — names the team being configured so
              the user never has to leave the modal to confirm "which team is
              this?". `text-xl` override (canonical baseline is `text-lg`)
              gives the modal a stronger heading than the default Dialog so
              the title sits visibly above the REVIEWER N slot labels — the
              hierarchy is `text-xl` title > `text-xs` slot labels > 10px
              ModelPicker triggers. Layout-only override, the rest of the
              DialogTitle chrome (`font-serif`, weight, tracking) is kept. */}
          <DialogTitle className='text-xl'>Configure {spec.displayName}</DialogTitle>
          {configRequired && (
            <div className='flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning'>
              <AlertTriangle className='size-4 shrink-0' />
              Configure all slots to run this team.
            </div>
          )}
          {spec.description && <DialogDescription className='text-base'>{spec.description}</DialogDescription>}
          <NextLink href={`/teams/${spec.id}`} variant='link' className='inline-flex w-fit items-center gap-1'>
            View team
            <ArrowUpRight className='size-4' />
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
        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
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
            <div key={agent.name} className='flex flex-col items-start gap-1.5'>
              {/* `text-xs` (12px) sits between the `text-xl` title above and
                  the 10px ModelPicker trigger below — slot label reads as a
                  real heading for the row without competing with the modal
                  title. `tracking-widest` aligns with the other uppercase
                  mono labels in the file (single tracking preset). */}
              <div className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>
                {reviewerLabels[agent.name]}
                {agent.role && (
                  <span className='text-muted-foreground/60'>
                    {' · '}
                    {formatRoleLabel(agent.role as string)}
                  </span>
                )}
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
