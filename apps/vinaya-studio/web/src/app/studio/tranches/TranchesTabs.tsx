'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { ForgeStatus, TrancheSummary } from '@/lib/repo-state'
import { ForgeBanners } from '@/app/studio/_components/ForgeUnavailableBanner'
import { TrancheCard } from '@/app/studio/_components/TrancheCard'
import { trancheHref } from '@/app/studio/_lib/tranche-href'

function TranchesGrid({
  tranches,
  emptyHint,
  registered
}: {
  tranches: TrancheSummary[]
  emptyHint: string | null
  registered: ReadonlySet<string> | null
}) {
  if (tranches.length === 0) {
    // A null hint means the empty state is explained elsewhere (the forge
    // banner) — render nothing rather than a truth-shaped "none" message.
    return emptyHint ? <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p> : null
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {tranches.map((it) => (
        <TrancheCard key={it.fileSlug} tranche={it} href={trancheHref(it, registered)} showProjects={true} />
      ))}
    </div>
  )
}

export function TranchesTabs({
  active,
  archived,
  forge,
  registeredProjects,
  registryPresent
}: {
  active: TrancheSummary[]
  archived: TrancheSummary[]
  forge: { active: ForgeStatus; archived: ForgeStatus }
  /** Registered project names (from `projects.md`) — only these resolve a board. */
  registeredProjects: string[]
  /** `false` means no `.vinaya/projects.md` exists — `registeredProjects` is
   *  then irrelevant and every row resolves a forge-derived (or default)
   *  board instead (#811). */
  registryPresent: boolean
}) {
  const registered = registryPresent ? new Set(registeredProjects) : null
  return (
    <div className='space-y-4'>
      <ForgeBanners forge={forge} />
      <Tabs defaultValue='active'>
        <TabsList>
          <TabsTrigger value='active'>Active ({active.length})</TabsTrigger>
          <TabsTrigger value='archived'>Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='active'>
          <TranchesGrid
            tranches={active}
            emptyHint={forge.active.kind === 'ok' ? 'No active tranches.' : null}
            registered={registered}
          />
        </TabsContent>
        <TabsContent value='archived'>
          <TranchesGrid tranches={archived} emptyHint='No archived tranches yet.' registered={registered} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
