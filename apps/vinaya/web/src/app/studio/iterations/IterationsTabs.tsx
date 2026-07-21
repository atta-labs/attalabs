'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { ForgeStatus, IterationSummary } from '@/lib/repo-state'
import { ForgeBanners } from '@/app/studio/_components/ForgeUnavailableBanner'
import { IterationCard } from '@/app/studio/_components/IterationCard'
import { iterationHref } from '@/app/studio/_lib/iteration-href'

function IterationsGrid({
  iterations,
  emptyHint,
  registered
}: {
  iterations: IterationSummary[]
  emptyHint: string | null
  registered: ReadonlySet<string>
}) {
  if (iterations.length === 0) {
    // A null hint means the empty state is explained elsewhere (the forge
    // banner) — render nothing rather than a truth-shaped "none" message.
    return emptyHint ? <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p> : null
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {iterations.map((it) => (
        <IterationCard key={it.fileSlug} iteration={it} href={iterationHref(it, registered)} showProjects={true} />
      ))}
    </div>
  )
}

export function IterationsTabs({
  active,
  archived,
  forge,
  registeredProjects
}: {
  active: IterationSummary[]
  archived: IterationSummary[]
  forge: { active: ForgeStatus; archived: ForgeStatus }
  /** Registered project names (from `projects.md`) — only these resolve a board. */
  registeredProjects: string[]
}) {
  const registered = new Set(registeredProjects)
  return (
    <div className='space-y-4'>
      <ForgeBanners forge={forge} />
      <Tabs defaultValue='active'>
        <TabsList>
          <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
          <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='active'>
          <IterationsGrid
            iterations={active}
            emptyHint={forge.active.kind === 'ok' ? 'No active iterations.' : null}
            registered={registered}
          />
        </TabsContent>
        <TabsContent value='archived'>
          <IterationsGrid iterations={archived} emptyHint='No archived iterations yet.' registered={registered} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
