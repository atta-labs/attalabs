'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { Button, Checkbox, Card, CardContent } from '@atta/ui/components'
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
import { getDisplayAgentNames, getFlowAgentCount, getFlowShapeLabel } from '@/lib/flow-helpers'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
  model: string | undefined
}

function getDisplayAgents(flow: Flow): DisplayAgent[] {
  const agentMap = new Map<string, FlowAgent>(flow.agents.map((a) => [a.name, a]))
  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined, model: a?.model }
  }
  return getDisplayAgentNames(flow).map(lookup)
}

function MiniTeamCard({ spec, isSelected, onClick }: { spec: Flow; isSelected: boolean; onClick: () => void }) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      onClick={onClick}
      className={cn('text-center h-auto w-full', isSelected && 'bg-accent hover:bg-accent border-primary')}
    >
      <div className='flex flex-col items-center justify-center gap-2  text-center w-full'>
        <span className='font-sans text-sm font-semibold text-foreground leading-tight w-full'>{spec.displayName}</span>
        <span className='font-mono text-[8px] uppercase tracking-widest text-muted-foreground w-full'>
          {getFlowAgentCount(spec)} agents · {getFlowShapeLabel(spec)}
        </span>
      </div>
    </Button>
  )
}

interface DeliberatePanelProps {
  specs: Flow[]
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

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const teamConfig: ReviewerConfig | null = mounted ? getReviewerConfig(selectedSpecId) : null

  const resolveModel = (a: DisplayAgent): string | undefined => teamConfig?.[a.name] ?? undefined

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
                  {getFlowAgentCount(selectedSpec)} agents · {getFlowShapeLabel(selectedSpec)}
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
            variant='default'
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
