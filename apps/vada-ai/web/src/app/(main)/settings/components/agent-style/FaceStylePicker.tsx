'use client'

import { useState } from 'react'
import { Text } from '@atta/ui/shared'
import { AGENT_FACES_MINIMAL, AGENT_FACES_FULL, AGENT_LIST } from '@vada/agents-ui'
import type { FaceStyle } from '@vada/agents-ui'

const STYLE_OPTIONS: Array<{ id: FaceStyle; label: string; description: string }> = [
  {
    id: 'reductive',
    label: 'Reductive',
    description: 'Floating features. Minimal marks, pure expression.'
  },
  {
    id: 'emblematic',
    label: 'Emblematic',
    description: 'Full portrait with symbolic sigil. Formal, heraldic.'
  }
]

interface FaceStylePickerProps {
  value: FaceStyle
  onChange: (style: FaceStyle) => void
}

export function FaceStylePicker({ value, onChange }: FaceStylePickerProps) {
  const [pending, setPending] = useState(false)

  const select = async (style: FaceStyle) => {
    if (pending || style === value) return
    const previous = value
    onChange(style)
    setPending(true)
    try {
      const res = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceStyle: style })
      })
      if (!res.ok) throw new Error()
    } catch {
      onChange(previous)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex gap-4'>
      {STYLE_OPTIONS.map((opt) => {
        const faces = opt.id === 'reductive' ? AGENT_FACES_MINIMAL : AGENT_FACES_FULL
        return (
          <button
            key={opt.id}
            type='button'
            onClick={() => select(opt.id)}
            className={`flex flex-1 flex-col gap-4 rounded-lg border p-5 transition-colors ${
              value === opt.id ? 'border-foreground/60 bg-muted/20' : 'border-border/20 hover:border-border/40'
            }`}
          >
            <div className='text-left'>
              <Text as='p' className='font-mono text-[11px] uppercase tracking-widest text-foreground/80'>
                {opt.label}
              </Text>
              <Text as='p' size='xs' muted className='mt-0.5 leading-snug'>
                {opt.description}
              </Text>
            </div>

            {/* 2-column grid of all 6 agent faces */}
            <div className='grid grid-cols-2 gap-3'>
              {AGENT_LIST.map((agent, i) => {
                const FaceComponent = faces[i]
                return FaceComponent ? (
                  <div key={agent.role} className='flex flex-col items-center gap-1'>
                    <div className='h-16 w-16' style={{ color: agent.color }}>
                      <FaceComponent />
                    </div>
                    <Text as='span' className='font-mono text-[8px] uppercase tracking-widest text-foreground/30'>
                      {agent.role}
                    </Text>
                  </div>
                ) : null
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
