'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { ForgeStatus, IterationSummary } from '@/lib/aeg-fs'
import { ForgeBanners } from '@/app/studio/_components/ForgeUnavailableBanner'
import { IterationCard } from '@/app/studio/_components/IterationCard'

function resolveDetailHref(it: IterationSummary): string | null {
  const firstProject = it.projects[0]
  if (!firstProject) return null
  return `/studio/projects/${firstProject}/iterations/${it.fileSlug}`
}

function IterationsGrid({ iterations, emptyHint }: { iterations: IterationSummary[]; emptyHint: string | null }) {
  if (iterations.length === 0) {
    // A null hint means the empty state is explained elsewhere (the forge
    // banner) — render nothing rather than a truth-shaped "none" message.
    return emptyHint ? <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p> : null
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {iterations.map((it) => (
        <IterationCard key={it.fileSlug} iteration={it} href={resolveDetailHref(it)} showProjects={true} />
      ))}
    </div>
  )
}

export function IterationsTabs({
  active,
  archived,
  forge
}: {
  active: IterationSummary[]
  archived: IterationSummary[]
  forge: { active: ForgeStatus; archived: ForgeStatus }
}) {
  return (
    <div className='space-y-4'>
      <ForgeBanners forge={forge} />
      <Tabs defaultValue='active'>
        <TabsList>
          <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
          <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='active'>
          <IterationsGrid iterations={active} emptyHint={forge.active.kind === 'ok' ? 'No active iterations.' : null} />
        </TabsContent>
        <TabsContent value='archived'>
          <IterationsGrid iterations={archived} emptyHint='No archived iterations yet.' />
        </TabsContent>
      </Tabs>
    </div>
  )
}
