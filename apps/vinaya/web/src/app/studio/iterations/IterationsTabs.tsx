'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { IterationSummary } from '@/lib/aeg-fs'
import { IterationCard } from '@/app/studio/_components/IterationCard'

function resolveDetailHref(it: IterationSummary): string | null {
  const firstProject = it.projects[0]
  if (!firstProject) return null
  return `/studio/projects/${firstProject}/iterations/${it.fileSlug}`
}

function IterationsGrid({ iterations, emptyHint }: { iterations: IterationSummary[]; emptyHint: string }) {
  if (iterations.length === 0) {
    return <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p>
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {iterations.map((it) => (
        <IterationCard key={it.fileSlug} iteration={it} href={resolveDetailHref(it)} showProjects={true} />
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
