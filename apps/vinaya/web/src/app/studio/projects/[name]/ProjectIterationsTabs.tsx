'use client'

import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { Inbox } from 'lucide-react'
import type { ForgeStatus, IterationSummary } from '@/lib/repo-state'
import { ForgeBanners } from '@/app/studio/_components/ForgeUnavailableBanner'
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
  forge
}: {
  projectName: string
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
          <IterationsGrid
            projectName={projectName}
            iterations={active}
            emptyHint={forge.active.kind === 'ok' ? 'No active iterations for this project.' : null}
          />
        </TabsContent>
        <TabsContent value='archived'>
          <IterationsGrid projectName={projectName} iterations={archived} emptyHint='No archived iterations yet.' />
        </TabsContent>
      </Tabs>
    </div>
  )
}
