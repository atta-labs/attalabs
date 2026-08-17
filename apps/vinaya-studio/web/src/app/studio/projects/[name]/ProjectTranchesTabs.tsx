'use client'

import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { Inbox } from 'lucide-react'
import type { ForgeStatus, TrancheSummary } from '@/lib/repo-state'
import { ForgeBanners } from '@/app/studio/_components/ForgeUnavailableBanner'
import { TrancheCard } from '@/app/studio/_components/TrancheCard'

function TranchesGrid({
  projectName,
  tranches,
  emptyHint
}: {
  projectName: string
  tranches: TrancheSummary[]
  emptyHint: string | null
}) {
  if (tranches.length === 0) {
    // A null hint means the empty state is explained by the forge banner.
    if (!emptyHint) return null
    return (
      <Card>
        <CardContent className='flex flex-col items-center gap-4 text-center'>
          <Inbox aria-hidden='true' className='h-8 w-8 text-muted-foreground' />
          <Text className='font-sans text-base text-muted-foreground'>{emptyHint}</Text>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {tranches.map((it) => (
        <TrancheCard
          key={it.fileSlug}
          tranche={it}
          href={`/studio/projects/${projectName}/tranches/${it.fileSlug}`}
          showProjects={false}
        />
      ))}
    </div>
  )
}

export function ProjectTranchesTabs({
  projectName,
  active,
  archived,
  forge
}: {
  projectName: string
  active: TrancheSummary[]
  archived: TrancheSummary[]
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
          <TranchesGrid
            projectName={projectName}
            tranches={active}
            emptyHint={forge.active.kind === 'ok' ? 'No active tranches for this project.' : null}
          />
        </TabsContent>
        <TabsContent value='archived'>
          <TranchesGrid
            projectName={projectName}
            tranches={archived}
            emptyHint={forge.archived.kind === 'ok' ? 'No archived tranches yet.' : null}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
