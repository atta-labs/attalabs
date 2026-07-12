'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { IterationSummary } from '@/lib/aeg-fs'
import { ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { IterationCard } from '@/app/studio/_components/IterationCard'

function IterationsGrid({
  projectName,
  iterations,
  emptyHint
}: {
  projectName: string
  iterations: IterationSummary[]
  emptyHint: string | null
}) {
  if (iterations.length === 0) {
    // A null hint means the empty state is explained by the forge banner.
    return emptyHint ? <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p> : null
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
  archived,
  forgeAvailable
}: {
  projectName: string
  active: IterationSummary[]
  archived: IterationSummary[]
  forgeAvailable: boolean
}) {
  return (
    <div className='space-y-4'>
      {!forgeAvailable && <ForgeUnavailableBanner />}
      <Tabs defaultValue='active'>
        <TabsList>
          <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
          <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='active'>
          <IterationsGrid
            projectName={projectName}
            iterations={active}
            emptyHint={forgeAvailable ? 'No active iterations for this project.' : null}
          />
        </TabsContent>
        <TabsContent value='archived'>
          <IterationsGrid projectName={projectName} iterations={archived} emptyHint='No archived iterations yet.' />
        </TabsContent>
      </Tabs>
    </div>
  )
}
