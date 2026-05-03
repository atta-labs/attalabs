'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { probeProviderKey } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import type { RouteProvider } from '@atta/models'
import { useCatalog } from '@atta/models'
import { Button, Card, ModelPicker, useToastContext } from '@atta/ui'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReviewerConfig } from '@/lib/reviewer-models'

interface ReviewerConfigModalProps {
  spec: DeliberationSpec
  onSave: (config: ReviewerConfig) => void
  onClose: () => void
}

function resolveVendor(model: string): RouteProvider | null {
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'google'
  if (model.startsWith('gpt-') || model.startsWith('o4-')) return 'openai'
  // xai is not yet a RouteProvider — grok slots start empty in the modal
  return null
}

export function ReviewerConfigModal({ spec, onSave, onClose }: ReviewerConfigModalProps) {
  const identity = useIdentity()
  const catalog = useCatalog()
  const { successToast } = useToastContext()

  const editableAgents: SpecAgent[] = useMemo(() => spec.agents.filter((a) => a.editable), [spec.agents])

  // Per-agent selected model (keyed by agent name)
  const [selections, setSelections] = useState<Record<string, { route: RouteProvider; modelId: string } | null>>(() =>
    Object.fromEntries(
      editableAgents.map((a) => {
        const vendor = a.model ? resolveVendor(a.model) : null
        return [a.name, vendor && a.model ? { route: vendor, modelId: a.model } : null]
      })
    )
  )

  const storedKeys = identity.state.keys as Partial<Record<RouteProvider, string>>

  const configuredRoutes = useMemo(() => {
    const set = new Set<RouteProvider>([
      ...(Object.keys(storedKeys) as RouteProvider[]),
      ...(identity.state.providers as RouteProvider[])
    ])
    return set
  }, [storedKeys, identity.state.providers])

  const handleProvideKey = async (route: RouteProvider, key: string) => {
    const probe = await probeProviderKey(route, key)
    if (probe.kind === 'invalid_key') {
      throw new Error(probe.error ?? 'Invalid API key.')
    }
    identity.setKey(route, key)
    if (probe.ok) {
      successToast('Key verified', `${route} is ready to use.`)
    } else {
      successToast(`${route} saved with a warning`, probe.error ?? 'Key stored; provider returned a non-success probe.')
    }
  }

  const allConfigured = editableAgents.every((a) => {
    const sel = selections[a.name]
    if (!sel) return false
    // Key must be present (in-memory or in providers list = locked but known)
    const hasKey =
      storedKeys[sel.route] || (identity.state.kind === 'locked' && identity.state.providers.includes(sel.route))
    return !!hasKey
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

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='reviewer-config-title'
    >
      <Card className='relative w-full max-w-md p-6 space-y-6 border-border shadow-xl mx-4'>
        <Button
          onClick={onClose}
          variant='ghost'
          size='icon'
          className='absolute right-4 top-4 size-7 text-muted-foreground hover:text-foreground'
          aria-label='Close'
          type='button'
        >
          <X className='size-4' />
        </Button>

        <div className='space-y-1'>
          <h2 id='reviewer-config-title' className='font-serif text-lg text-foreground'>
            Configure Reviewers
          </h2>
          <p className='text-sm text-muted-foreground'>
            Pick a model for each reviewer slot. All three need unlocked API keys to run.
          </p>
        </div>

        <div className='space-y-4'>
          {editableAgents.map((agent) => (
            <div key={agent.name} className='space-y-1.5'>
              <div className='text-[11px] font-mono uppercase tracking-widest text-muted-foreground'>{agent.name}</div>
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
            Save & Run
          </Button>
          <Button onClick={onClose} variant='outline' className='flex-1'>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}
