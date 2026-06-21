'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components/tabs'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { IterationSummary } from '@/lib/aeg-fs'

function IterationCard({ projectName, it }: { projectName: string; it: IterationSummary }) {
  return (
    <NextLink
      variant='unstyled'
      href={`/projects/${projectName}/iterations/${it.fileSlug}`}
      className='group block rounded-lg border border-border bg-card transition-colors hover:border-accent'
    >
      <Card className='border-0 bg-transparent'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
            <span>{it.name}</span>
            <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent' />
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-1 font-mono text-xs text-muted-foreground'>
          <p>
            {it.taskCount} task{it.taskCount === 1 ? '' : 's'}
          </p>
          {it.goal && <p className='line-clamp-2 font-sans text-xs'>{it.goal}</p>}
        </CardContent>
      </Card>
    </NextLink>
  )
}

function IterationsGrid({
  projectName,
  iterations,
  emptyHint
}: {
  projectName: string
  iterations: IterationSummary[]
  emptyHint: string
}) {
  if (iterations.length === 0) {
    return <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p>
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {iterations.map((it) => (
        <IterationCard key={it.fileSlug} projectName={projectName} it={it} />
      ))}
    </div>
  )
}

export function ProjectIterationsTabs({
  projectName,
  active,
  archived
}: {
  projectName: string
  active: IterationSummary[]
  archived: IterationSummary[]
}) {
  return (
    <Tabs defaultValue='active'>
      <TabsList>
        <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
        <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
      </TabsList>
      <TabsContent value='active'>
        <IterationsGrid
          projectName={projectName}
          iterations={active}
          emptyHint='No active iterations for this project.'
        />
      </TabsContent>
      <TabsContent value='archived'>
        <IterationsGrid projectName={projectName} iterations={archived} emptyHint='No archived iterations yet.' />
      </TabsContent>
    </Tabs>
  )
}
