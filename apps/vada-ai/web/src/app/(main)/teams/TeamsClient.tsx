'use client'

import { useState, useCallback } from 'react'
import { FlowGraph, mockEventDriver } from '@atta/ui/engine-flow'
import type { FlowEventSource } from '@atta/ui/engine-flow'
import type { Plan } from '@atta/engine'
import type { DeliberationSpec } from '@atta/engine'
import { Button, Badge, Separator } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'
import { Play, RotateCcw } from 'lucide-react'

interface SpecEntry {
  spec: DeliberationSpec
  plan: Plan
  agentCount: number
  shapeLabel: string
}

interface TeamsClientProps {
  specs: SpecEntry[]
}

export function TeamsClient({ specs }: TeamsClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [driver, setDriver] = useState<FlowEventSource | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const selected = specs[selectedIndex]

  const handleSelectSpec = useCallback((index: number) => {
    setSelectedIndex(index)
    setDriver(null)
    setIsRunning(false)
  }, [])

  const handleRunDemo = useCallback(() => {
    if (!selected) return
    const newDriver = mockEventDriver(selected.plan, { speed: 1, loop: false })
    // Wrap to detect completion
    const wrappedDriver: FlowEventSource = {
      subscribe(handler) {
        const unsub = newDriver.subscribe((event) => {
          handler(event)
          if (event.type === 'flow:complete') {
            setIsRunning(false)
          }
        })
        return unsub
      }
    }
    setDriver(wrappedDriver)
    setIsRunning(true)
  }, [selected])

  const handleReset = useCallback(() => {
    setDriver(null)
    setIsRunning(false)
  }, [])

  if (!selected) return null

  return (
    <div className='flex h-dvh overflow-hidden'>
      {/* Sidebar */}
      <aside className='w-72 shrink-0 border-r border-border flex flex-col bg-card'>
        <div className='px-4 py-4 border-b border-border'>
          <h1 className='font-serif text-lg text-foreground'>Teams</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>Engine YAML specs</p>
        </div>

        <nav className='flex-1 overflow-y-auto py-2'>
          {specs.map((entry, i) => (
            <button
              key={entry.spec.id}
              type='button'
              onClick={() => handleSelectSpec(i)}
              className={cn(
                'w-full text-left px-4 py-3 transition-colors',
                'hover:bg-accent/50',
                i === selectedIndex && 'bg-accent'
              )}
            >
              <div className='flex items-start justify-between gap-2'>
                <span className='font-sans text-sm font-medium text-foreground leading-snug'>
                  {entry.spec.displayName}
                </span>
                {entry.spec.experimental && (
                  <Badge variant='outline' className='text-[10px] shrink-0 mt-0.5'>
                    beta
                  </Badge>
                )}
              </div>
              <p className='font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed'>{entry.shapeLabel}</p>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Top bar */}
        <header className='h-14 shrink-0 border-b border-border flex items-center px-6 gap-4'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <h2 className='font-serif text-base text-foreground truncate'>{selected.spec.displayName}</h2>
              <span className='text-muted-foreground/40'>·</span>
              <span className='font-mono text-xs text-muted-foreground'>
                {selected.agentCount} {selected.agentCount === 1 ? 'agent' : 'agents'}
              </span>
            </div>
            <p className='font-sans text-xs text-muted-foreground truncate mt-0.5'>{selected.spec.description}</p>
          </div>

          <Separator orientation='vertical' className='h-6' />

          <div className='flex items-center gap-2 shrink-0'>
            {isRunning || driver ? (
              <Button variant='outline' size='sm' onClick={handleReset} className='gap-1.5'>
                <RotateCcw className='size-3' />
                Reset
              </Button>
            ) : null}
            <Button size='sm' onClick={handleRunDemo} disabled={isRunning} className='gap-1.5'>
              <Play className='size-3' />
              {isRunning ? 'Running…' : 'Run demo'}
            </Button>
          </div>
        </header>

        {/* Flow graph */}
        <div className='flex-1 relative'>
          <FlowGraph
            key={selected.spec.id}
            plan={selected.plan}
            events={driver ?? undefined}
            className='absolute inset-0'
          />
        </div>
      </div>
    </div>
  )
}
