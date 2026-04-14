'use client'

import { Button, Textarea } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { AIACanvas, AIASphere } from '@atta/ui/canvas'
import { ArrowUpRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import type { AgentConfig } from '@/schemas'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import { AGENT_COLOR_BY_ROLE } from '@/lib/agent-theme'
import { PresetSelector } from './PresetSelector'
import { GlobalModelSelector, type ModelSelection } from './GlobalModelSelector'

const AGENT_DESCRIPTIONS: Record<string, string> = {
  strategist: 'Maps the landscape, governs trajectory',
  critic: 'Detects fallacies, demands grounding',
  devils_advocate: 'Prevents early consensus',
  synthesizer: 'Reconciles contradictions into action',
  researcher: 'Grounds claims in evidence',
  operator: 'Drives execution clarity'
}

function AgentRow({ agent }: { agent: AgentConfig }) {
  const color = AGENT_COLOR_BY_ROLE[agent.role] ?? 'var(--foreground)'
  const description = AGENT_DESCRIPTIONS[agent.role]
  return (
    <div className='flex items-center gap-3 border-b border-border/10 px-2 py-3 last:border-0'>
      <div className='shrink-0'>
        <AIASphere id={`roster-${agent.role}`} state='speaking' color={color} size={44} showMatrix particleCount={10} />
      </div>
      <div className='min-w-0 flex-1'>
        <Text as='p' className='font-serif text-sm font-medium text-foreground'>
          {agent.name}
        </Text>
        {description && (
          <Text as='p' size='xs' className='mt-0.5 text-[11px] leading-snug text-foreground/60'>
            {description}
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

          {/* ROOM ROSTER — always visible, spheres with matrix */}
          <div className='mt-6'>
            <Text as='p' className='mb-3 font-mono text-[9px] uppercase tracking-widest text-foreground/50'>
              Room Roster: {selectedPreset.name}
            </Text>
            <AIACanvas alwaysRenderSpheres>
              <div className='grid grid-cols-2 gap-x-4'>
                {selectedPreset.agents.map((agent) => (
                  <AgentRow key={agent.role} agent={agent} />
                ))}
              </div>
            </AIACanvas>
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
