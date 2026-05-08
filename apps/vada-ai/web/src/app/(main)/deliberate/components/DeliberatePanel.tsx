'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { Button, Checkbox, Card, CardContent } from '@atta/ui'
import { ArrowRight, GitCompare, Loader2, Lock, Settings2 } from 'lucide-react'
import { cn } from '@atta/ui/lib/utils'
import { NextLink } from '@atta/ui/lib/next-link'
import { useEffect, useMemo, useState } from 'react'
import { TeamPicker } from './TeamPicker'
import { GlobalModelSelector } from './GlobalModelSelector'
import type { ModelSelection } from './GlobalModelSelector'
import { ReviewerConfigModal } from './ReviewerConfigModal'
import { getReviewerConfig, resolveVendor } from '@/lib/reviewer-models'
import type { ReviewerConfig } from '@/lib/reviewer-models'
import { useCatalog } from '@atta/models'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
  model: string | undefined
}

function getDisplayAgents(spec: DeliberationSpec): DisplayAgent[] {
  const agentMap = new Map<string, SpecAgent>(spec.agents.map((a) => [a.name, a]))
  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined, model: a?.model }
  }
  if (spec.flow?.rounds) return spec.flow.rounds.agents.map(lookup)
  if (spec.reviewers && spec.reviewers.length > 0) {
    const reviewers = spec.reviewers.map((r) => lookup(r.agent))
    const synthName = spec.flow?.synthesis?.agent
    if (synthName) reviewers.push(lookup(synthName))
    return reviewers
  }
  return spec.agents.slice(0, 1).map((a) => lookup(a.name))
}

function getAgentCount(spec: DeliberationSpec): number {
  if (spec.flow?.rounds) return spec.flow.rounds.agents.length
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return spec.reviewers.length + (hasSynth ? 1 : 0)
  }
  return 1
}

function getShapeLabel(spec: DeliberationSpec): string {
  if (spec.flow?.rounds) return `${spec.flow.rounds.count} rounds`
  if (spec.reviewers) return spec.flow?.synthesis != null ? 'reviewers + synthesis' : 'parallel reviewers'
  return 'single shot'
}

function MiniTeamCard({
  spec,
  isSelected,
  onClick
}: {
  spec: DeliberationSpec
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-md border p-3 text-center transition-colors w-full cursor-pointer',
        'hover:border-primary/60 hover:bg-accent/50',
        isSelected ? 'border-primary bg-accent' : 'border-border/40 bg-card'
      )}
    >
      <span className='font-sans text-xs font-medium text-foreground line-clamp-2 leading-tight'>
        {spec.displayName}
      </span>
      <span className='font-mono text-[9px] uppercase tracking-widest text-muted-foreground'>
        {getAgentCount(spec)} agents · {getShapeLabel(spec)}
      </span>
    </button>
  )
}

interface DeliberatePanelProps {
  specs: DeliberationSpec[]
  selectedSpecId: string
  onSelectSpec: (id: string) => void
  globalModel: ModelSelection | null
  onGlobalModelChange: (m: ModelSelection | null) => void
  configuredProviders: string[]
  benchmarkEnabled: boolean
  onBenchmarkChange: (v: boolean) => void
  onStart: () => void
  loading: boolean
  canStart: boolean
  needsUnlock: boolean
  showReviewerModal: boolean
  onConfigure: () => void
  onModalSave: (config: ReviewerConfig) => void
  onModalClose: () => void
}

export function DeliberatePanel({
  specs,
  selectedSpecId,
  onSelectSpec,
  globalModel,
  onGlobalModelChange,
  configuredProviders,
  benchmarkEnabled,
  onBenchmarkChange,
  onStart,
  loading,
  canStart,
  needsUnlock,
  showReviewerModal,
  onConfigure,
  onModalSave,
  onModalClose
}: DeliberatePanelProps) {
  const selectedSpec = specs.find((s) => s.id === selectedSpecId) ?? specs[0]
  const agents = selectedSpec ? getDisplayAgents(selectedSpec) : []
  const hasEditable = selectedSpec?.agents.some((a) => a.editable) ?? false
  const specAgentNames = useMemo(() => agents.map((a) => a.name), [agents])
  const catalog = useCatalog()

  // localStorage is undefined on the server. Reading it during render produces
  // different HTML on server vs client → hydration mismatch. Defer to after
  // mount so the first client render matches the server (no userConfig), then
  // re-render with the real value once we're hydrated. We re-read on every
  // render after mount so spheres update immediately when the modal saves.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // Single source of truth: vada:team:<specId> — same key/format for every
  // team type. GlobalModelSelector writes all agent names when user picks one
  // model; ReviewerConfigModal writes per-agent. resolveModel reads from one place.
  const teamConfig: ReviewerConfig | null = mounted ? getReviewerConfig(selectedSpecId) : null

  const resolveModel = (a: DisplayAgent): string | undefined => teamConfig?.[a.name] ?? undefined

  // A slot is available when a model is resolved AND its vendor key is configured.
  // Empty editable slots (no model picked yet) are NOT available — they need configuration.
  // Ollama is local — no key concept — so a model routed via 'ollama' is always available
  // when picked (the picker only surfaces ollama models if the local server is reachable).
  const isSlotAvailable = (a: DisplayAgent): boolean => {
    const model = resolveModel(a)
    if (!model) return false
    const vendor = resolveVendor(model, catalog)
    if (!vendor) return false
    if (vendor === 'ollama') return true
    return configuredProviders.includes(vendor)
  }

  const anySlotLocked = agents.some((a) => !isSlotAvailable(a))

  const configureTrigger = (
    <Button
      variant='outline'
      size='sm'
      className='flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest'
    >
      <Settings2 className='size-3' />
      Configure
    </Button>
  )

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* ── Left card ── */}
        <Card className='gap-4 py-0'>
          <CardContent className='flex flex-col gap-4 p-4'>
            <div className='space-y-0.5'>
              <h2 className='font-serif text-xl text-foreground leading-tight'>Pick your team</h2>
              <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>Pick your team</p>
            </div>
            <div className='sr-only'>
              <TeamPicker specs={specs} value={selectedSpecId} onChange={onSelectSpec} />
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {specs.map((spec) => (
                <MiniTeamCard
                  key={spec.id}
                  spec={spec}
                  isSelected={spec.id === selectedSpecId}
                  onClick={() => onSelectSpec(spec.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Right card ── */}
        {selectedSpec && (
          <Card className='gap-4 py-0'>
          <CardContent className='flex flex-col gap-4 p-4'>
            <div className='space-y-0.5'>
              <h2 className='font-serif text-xl text-foreground leading-tight'>{selectedSpec.displayName}</h2>
              <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                {getAgentCount(selectedSpec)} agents · {getShapeLabel(selectedSpec)}
              </p>
            </div>

            <p className='text-sm text-foreground leading-relaxed'>{selectedSpec.description}</p>

            <NextLink
              href={`/teams/${selectedSpec.id}`}
              variant='prose'
              className='flex items-center gap-1 text-xs w-fit'
            >
              Learn more
              <ArrowRight className='size-3' />
            </NextLink>

            <div className='flex flex-col gap-2'>
              <div className='flex flex-row flex-wrap gap-3 pb-1'>
                {agents.map((a) => {
                  const available = isSlotAvailable(a)
                  return (
                    <div key={a.name} className='relative shrink-0'>
                      <VadaAgent
                        id={`panel-${selectedSpec.id}-${a.name}`}
                        name={a.name}
                        role={a.role}
                        model={resolveModel(a)}
                        state='speaking'
                        size='md'
                        visible
                        label={a.role ? undefined : 'REVIEWER'}
                        className={cn(!available && 'opacity-60')}
                      />
                      {!available && (
                        <span className='absolute top-[44px] -right-1 z-[2] flex items-center justify-center rounded-md border border-border bg-card p-0.5 shadow-sm'>
                          <Lock className='size-3 text-muted-foreground' />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {anySlotLocked && (
                <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                  Add API keys to unlock — configure models to enable
                </p>
              )}
            </div>
          </CardContent>
          </Card>
        )}
      </div>

      <div className='flex items-center justify-between'>
        <label
          htmlFor='panel-benchmark-checkbox'
          className='flex items-center gap-2 text-[13px] text-muted-foreground hover:text-accent cursor-pointer'
        >
          <Checkbox
            id='panel-benchmark-checkbox'
            checked={benchmarkEnabled}
            onCheckedChange={(v) => onBenchmarkChange(v === true)}
          />
          <GitCompare className='size-3.5' />
          Run benchmark comparison (single-shot + AI judge)
        </label>
        <div className='flex shrink-0 items-center gap-2'>
          {hasEditable ? (
            <Button
              variant='outline'
              size='sm'
              onClick={onConfigure}
              className='flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest'
            >
              <Settings2 className='size-3' />
              Configure
            </Button>
          ) : (
            <GlobalModelSelector
              value={globalModel}
              onChange={onGlobalModelChange}
              settingsProviders={configuredProviders}
              selectedSpecId={selectedSpecId}
              specAgentNames={specAgentNames}
              trigger={configureTrigger}
            />
          )}
          <Button
            size='sm'
            onClick={onStart}
            disabled={!canStart}
            className='flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest'
          >
            {loading && <Loader2 className='size-3 animate-spin' />}
            {loading ? 'Starting…' : needsUnlock ? 'Unlock & Deliberate' : 'Deliberate'}
          </Button>
        </div>
      </div>

      {showReviewerModal && selectedSpec && (
        <ReviewerConfigModal
          spec={selectedSpec}
          onSave={onModalSave}
          onClose={onModalClose}
          configuredProviders={configuredProviders}
        />
      )}
    </>
  )
}
