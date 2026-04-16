'use client'

import { Button, Textarea } from '@atta/ui'
import { PresetSelector } from './PresetSelector'
import { GlobalModelSelector, type ModelSelection } from './GlobalModelSelector'
import type { Preset, PresetId } from '@/schemas'

interface QuestionInputAreaProps {
  question: string
  onQuestionChange: (q: string) => void
  selectedPreset: Preset
  onPresetChange: (p: Preset) => void
  globalModel: ModelSelection | null
  onModelChange: (m: ModelSelection | null) => void
  loading: boolean
  canStart: boolean
  onStart: () => void
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export function QuestionInputArea({
  question,
  onQuestionChange,
  selectedPreset,
  onPresetChange,
  globalModel,
  onModelChange,
  loading,
  canStart,
  onStart,
  configuredProviders,
  initialTeamModels
}: QuestionInputAreaProps) {
  return (
    <div className='flex flex-col gap-4'>
      <Textarea
        variant='underlined'
        textareaClassName='text-3xl font-serif font-light italic text-left leading-tight placeholder:text-foreground/50 resize-none'
        className='w-full'
        placeholder='What decision are you wrestling with?'
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        rows={2}
        size='lg'
      />

      <div className='flex flex-col gap-4 border-t border-border/20 pt-4'>
        <div className='flex items-center gap-6'>
          <PresetSelector selected={selectedPreset.id as PresetId} onChange={onPresetChange} />
          <GlobalModelSelector
            value={globalModel}
            onChange={onModelChange}
            settingsProviders={configuredProviders}
            initialTeamModels={initialTeamModels}
            selectedPresetId={selectedPreset.id}
          />
          <div className='flex-1' />
          <Button
            variant='default'
            size='sm'
            onClick={onStart}
            disabled={!canStart}
            className='font-mono text-[10px] uppercase tracking-widest'
          >
            {loading ? 'Starting…' : 'Start'}
          </Button>
        </div>
      </div>
    </div>
  )
}
