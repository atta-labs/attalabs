'use client'

import { Button, Input } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Search, Plus } from 'lucide-react'
import { useState } from 'react'
import { SessionList } from './SessionList'

interface Session {
  id: string
  question: string
  terminalState: string | null
  state: string
  agentModels: Record<string, { provider: string; modelId: string }> | null
  createdAt: string
}

export function HistoryClientView({ sessions }: { sessions: Session[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? sessions.filter((s) => s.question.toLowerCase().includes(query.toLowerCase()))
    : sessions

  return (
    <div className='space-y-8'>
      {/* Controls row */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search deliberations...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <NextLink variant='unstyled' href='/deliberate'>
          <Button size='sm' className='gap-1.5'>
            <Plus className='h-3.5 w-3.5' />
            New deliberation
          </Button>
        </NextLink>
      </div>

      <SessionList
        sessions={filtered}
        emptyMessage={query.trim() ? 'No deliberations match your search.' : 'No deliberations yet.'}
      />
    </div>
  )
}
