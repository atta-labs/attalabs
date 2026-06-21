'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components/tabs'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { IterationSummary } from '@/lib/aeg-fs'

function resolveDetailHref(it: IterationSummary): string | null {
  const firstProject = it.projects[0]
  if (!firstProject) return null
  return `/projects/${firstProject}/iterations/${it.fileSlug}`
}

function IterationCard({ it }: { it: IterationSummary }) {
  const href = resolveDetailHref(it)

  const content = (
    <Card className='border-0 bg-transparent'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
          <span>{it.name}</span>
          {href ? (
            <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent' />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1 font-mono text-xs text-muted-foreground'>
        <p>
          {it.taskCount} task{it.taskCount === 1 ? '' : 's'}
        </p>
        {it.projects.length > 0 && <p>projects · {it.projects.join(' · ')}</p>}
        {it.goal && <p className='line-clamp-2 font-sans text-xs'>{it.goal}</p>}
      </CardContent>
    </Card>
  )

  if (!href) {
    return <div className='rounded-lg border border-border bg-card'>{content}</div>
  }

  return (
    <NextLink
      variant='unstyled'
      href={href}
      className='group block rounded-lg border border-border bg-card transition-colors hover:border-accent'
    >
      {content}
    </NextLink>
  )
}

function IterationsGrid({ iterations, emptyHint }: { iterations: IterationSummary[]; emptyHint: string }) {
  if (iterations.length === 0) {
    return <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p>
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {iterations.map((it) => (
        <IterationCard key={it.fileSlug} it={it} />
      ))}
    </div>
  )
}

export function IterationsTabs({ active, archived }: { active: IterationSummary[]; archived: IterationSummary[] }) {
  return (
    <Tabs defaultValue='active'>
      <TabsList>
        <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
        <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
      </TabsList>
      <TabsContent value='active'>
        <IterationsGrid iterations={active} emptyHint='No active iterations.' />
      </TabsContent>
      <TabsContent value='archived'>
        <IterationsGrid iterations={archived} emptyHint='No archived iterations yet.' />
      </TabsContent>
    </Tabs>
  )
}
