'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { IterationSummary } from '@/lib/aeg-fs'
import { IterationCard } from '@/app/studio/_components/IterationCard'

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
        <IterationCard
          key={it.fileSlug}
          iteration={it}
          href={`/studio/projects/${projectName}/iterations/${it.fileSlug}`}
          showProjects={false}
        />
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
