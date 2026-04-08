'use client'

import { Badge, Button, Text, Textarea } from '@atta/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type AgentConfig, DEFAULT_ROOM, OPTIONAL_AGENTS } from '@/schemas'
import { AgentBadge } from '@/components/AgentBadge'
import { ModelSelector, type SelectedModel } from './ModelSelector'

export function QuestionInput({ remainingToday }: { remainingToday: number }) {
  const [question, setQuestion] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([...DEFAULT_ROOM])
  const [showCustomize, setShowCustomize] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null)
  const router = useRouter()

  const toggleAgent = (agent: AgentConfig) => {
    setSelectedAgents((prev) => {
      const exists = prev.find((a) => a.role === agent.role)
      if (exists) return prev.filter((a) => a.role !== agent.role)
      return [...prev, agent]
    })
  }

  const handleStart = async () => {
    if (!question.trim() || loading || !selectedModel) return
    setLoading(true)

    const res = await fetch('/api/deliberation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question.trim(),
        agents: selectedAgents.map((a) => a.role),
        provider: selectedModel.provider,
        modelId: selectedModel.modelId,
        apiKey: selectedModel.apiKey || undefined
      })
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Failed to start deliberation')
      setLoading(false)
      return
    }

    const { session_id } = await res.json()
    router.push(`/deliberation/${session_id}`)
  }

  const startLabel = loading
    ? 'Starting…'
    : selectedModel
      ? `Start with ${selectedModel.modelId.split('/').pop()?.split('-').slice(0, 2).join(' ') ?? selectedModel.provider}`
      : 'Select a model'

  return (
    <div className='flex w-full max-w-2xl flex-col gap-6'>
      <ModelSelector value={selectedModel} onChange={setSelectedModel} />

      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='What do you want to figure out?'
        className='min-h-[120px] resize-none'
      />

      <div className='flex flex-wrap gap-2'>
        {selectedAgents.map((a) => (
          <AgentBadge key={a.role} agentRole={a.role} name={a.name} />
        ))}
      </div>

      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowCustomize(!showCustomize)}
        className='self-start text-xs text-muted-foreground underline'
      >
        {showCustomize ? 'Hide' : 'Customize your room'}
      </Button>

      {showCustomize && (
        <div className='flex flex-wrap gap-2'>
          {OPTIONAL_AGENTS.map((a) => {
            const isSelected = selectedAgents.find((s) => s.role === a.role)
            return (
              <Badge
                key={a.role}
                variant='outline'
                className={`cursor-pointer transition-opacity ${isSelected ? 'border-accent text-accent' : 'text-muted-foreground'}`}
                onClick={() => toggleAgent(a)}
              >
                + {a.name}
              </Badge>
            )
          })}
        </div>
      )}

      <div className='flex items-center justify-between'>
        <Text as='span' size='xs' muted>
          {remainingToday} deliberation{remainingToday !== 1 ? 's' : ''} remaining today
        </Text>
        <Button onClick={handleStart} disabled={!question.trim() || loading || remainingToday <= 0 || !selectedModel}>
          {startLabel}
        </Button>
      </div>
    </div>
  )
}
