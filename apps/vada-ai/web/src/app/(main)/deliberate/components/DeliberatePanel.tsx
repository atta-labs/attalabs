'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { Button, Checkbox } from '@atta/ui'
import { ArrowRight, GitCompare, Loader2, Lock, Settings2 } from 'lucide-react'
import { cn } from '@atta/ui/lib/utils'
import { NextLink } from '@atta/ui/lib/next-link'
import { TeamPicker } from './TeamPicker'
import { GlobalModelSelector } from './GlobalModelSelector'
import type { ModelSelection } from './GlobalModelSelector'
import { ReviewerConfigModal } from './ReviewerConfigModal'
import { getReviewerConfig, resolveVendor } from '@/lib/reviewer-models'
import type { ReviewerConfig } from '@/lib/reviewer-models'

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
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
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
  initialTeamModels,
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
  const defaultModel = selectedSpec?.defaults.model ?? ''
  // Re-reads localStorage on every render so spheres update immediately after config save
  const userConfig = getReviewerConfig(selectedSpecId)

  // Resolve the model to display on each agent sphere.
  // Role agents: model shows as a bottom-right vendor badge.
  // Non-role agents: model shows as a centered ModelIcon face.
  const resolveModel = (a: DisplayAgent): string | undefined => {
    if (userConfig?.[a.name]) return userConfig[a.name]
    if (globalModel?.modelId) return globalModel.modelId
    return a.model ?? defaultModel ?? undefined
  }

  // For editable specs: a slot is available when its resolved model's vendor key is configured.
  const isSlotAvailable = (a: DisplayAgent): boolean => {
    if (!hasEditable) return true
    const model = resolveModel(a)
    if (!model) return true
    const vendor = resolveVendor(model)
    if (!vendor) return false
    return configuredProviders.includes(vendor)
  }

  const anySlotLocked = hasEditable && agents.some((a) => !isSlotAvailable(a))

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
        <div className='rounded-lg border border-border/40 bg-card p-4 flex flex-col gap-4'>
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
        </div>

        {/* ── Right card ── */}
        {selectedSpec && (
          <div className='rounded-lg border border-border/40 bg-card p-4 flex flex-col gap-4'>
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
              <div className='flex flex-row gap-3 overflow-x-auto pb-1'>
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
          </div>
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
              initialTeamModels={initialTeamModels}
              selectedSpecId={selectedSpecId}
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
