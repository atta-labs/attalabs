'use client'

import { Button, Textarea } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { ArrowUpRight, BookOpen, Map as MapIcon, Scale, Settings, ShieldAlert, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { AgentConfig } from '@/schemas'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import { PresetSelector } from './PresetSelector'
import { GlobalModelSelector, type ModelSelection } from './GlobalModelSelector'

const AGENT_META: Record<string, { icon: LucideIcon; description: string }> = {
  strategist: { icon: MapIcon, description: 'Maps the landscape, governs trajectory' },
  critic: { icon: ShieldAlert, description: 'Detects fallacies, demands grounding' },
  devils_advocate: { icon: Zap, description: 'Prevents early consensus' },
  synthesizer: { icon: Scale, description: 'Reconciles contradictions into action' },
  researcher: { icon: BookOpen, description: 'Grounds claims in evidence' },
  operator: { icon: Settings, description: 'Drives execution clarity' }
}

function AgentRow({ agent }: { agent: AgentConfig }) {
  const meta = AGENT_META[agent.role]
  const Icon = meta?.icon
  return (
    <div className='flex items-start gap-3 border-b border-border/10 px-2 py-2.5 last:border-0'>
      <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/30'>
        {Icon && <Icon className='h-3 w-3 text-foreground/60' />}
      </div>
      <div className='min-w-0 flex-1'>
        <Text as='p' className='font-serif text-sm font-medium text-foreground'>
          {agent.name}
        </Text>
        {meta?.description && (
          <Text as='p' size='xs' className='mt-0.5 text-[11px] leading-snug text-foreground/60'>
            {meta.description}
          </Text>
        )}
      </div>
    </div>
  )
}

export function QuestionInput({ remainingToday, initialError }: { remainingToday: number; initialError?: string }) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]!)
  const [question, setQuestion] = useState('')
  const [globalModel, setGlobalModel] = useState<ModelSelection | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const router = useRouter()

  const canStart = !!question.trim() && remainingToday > 0 && !loading && !!globalModel?.provider

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    setError(null)

    const agentRoles = selectedPreset.agents.map((a) => a.role)
    const body: Record<string, unknown> = {
      question: question.trim(),
      agents: agentRoles,
      ...(globalModel && {
        provider: globalModel.provider,
        modelId: globalModel.modelId,
        ...(globalModel.apiKey ? { apiKey: globalModel.apiKey } : {})
      })
    }

    const res = await fetch('/api/deliberation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to start deliberation')
      setLoading(false)
      return
    }

    const { session_id } = await res.json()
    router.push(`/deliberation/${session_id}`)
  }

  return (
    <div className='flex flex-1 flex-col'>
      {/* Content column — centered, anchored below header */}
      <div className='mx-auto w-full max-w-2xl flex-1 px-8 pt-24'>
        {error && (
          <div className='mb-8 flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3'>
            <Text as='p' size='sm' className='text-destructive'>
              {error}
            </Text>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setError(null)}
              className='mt-0.5 h-auto shrink-0 p-0 text-destructive/60 hover:opacity-70'
            >
              <X className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}

        {/* Question textarea */}
        <Textarea
          variant='underlined'
          textareaClassName='text-5xl font-serif font-light italic text-left leading-tight placeholder:text-foreground/50 resize-none'
          className='w-full'
          placeholder='What decision are you wrestling with?'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          size='lg'
        />

        {/* Controls — right below the textarea */}
        <div className='mt-8 border-t border-border/20 pt-5'>
          {/* TEAM / MODEL / START row */}
          <div className='flex items-center gap-6'>
            <PresetSelector selected={selectedPreset.id as PresetId} onChange={(p) => setSelectedPreset(p)} />
            <GlobalModelSelector value={globalModel} onChange={setGlobalModel} />
            <div className='flex-1' />
            <Button
              variant='default'
              size='sm'
              onClick={handleStart}
              disabled={!canStart}
              className='font-mono text-[10px] uppercase tracking-widest'
            >
              {loading ? 'Starting…' : 'Start'}
            </Button>
          </div>

          {/* ROOM ROSTER — always visible, updates as team preset changes */}
          <div className='mt-6'>
            <Text as='p' className='mb-3 font-mono text-[9px] uppercase tracking-widest text-foreground/50'>
              Room Roster: {selectedPreset.name}
            </Text>
            <div className='grid grid-cols-2 gap-x-4'>
              {selectedPreset.agents.map((agent) => (
                <AgentRow key={agent.role} agent={agent} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — pushed to bottom */}
      <footer className='mt-auto border-t border-border/10 py-6 text-center'>
        <div className='flex items-center justify-center gap-8'>
          <Text as='span' className='font-mono text-[9px] uppercase tracking-widest text-foreground/60'>
            Privacy Protocol
          </Text>
          <Text as='span' className='font-mono text-[9px] uppercase tracking-widest text-foreground/60'>
            Legal Ledger
          </Text>
        </div>
        <Text as='p' size='xs' muted className='mt-2 font-mono text-[9px]'>
          © 2024 Vāda Deliberation. All Rights Reserved.
        </Text>
        <div className='mt-2'>
          <Link
            href='/science'
            className='inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-foreground/60 transition-colors hover:text-foreground'
          >
            How does this work? Read the Science of Deliberation
            <ArrowUpRight className='h-2.5 w-2.5' />
          </Link>
        </div>
      </footer>
    </div>
  )
}
