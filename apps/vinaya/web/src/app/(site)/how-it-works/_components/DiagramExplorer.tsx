'use client'

import type { DiagramFinding, DiagramNode } from '@atta/aeg-core'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import Link from 'next/link'
import { useState } from 'react'
import { humanLabel, shortLabel } from '../_lib/display-label'
import type { DiagramGroup, GroupKey } from '../_lib/groupings'
import { DiagramCanvas } from './DiagramCanvas'
import { FindingsBanner } from './FindingsBanner'
import { LeafPanel } from './LeafPanel'

type Props = {
  groups: DiagramGroup[]
  findings: DiagramFinding[]
  readMoreHrefs: Record<string, string>
}

/** Prose, not markdown — this string renders through `Text`, so backticks
 * would show up as literal backticks. The filenames read fine unquoted. */
const OVERVIEW_TEXT =
  'Every node here is derived at build time from this monorepo’s own doctrine — enforcement.md, roles/*.md and contracts/*.md — nothing on this page is hand-typed.'

/** One-line editorial framing per ring, shown in the sidebar once that ring
 * is drilled — copy, same status as the ring/seam labels themselves
 * (`groupings.ts`'s `STATIC_GROUP_LABELS`), not derived data. */
const GROUP_EXPLANATION: Record<GroupKey, string> = {
  actors: 'The roles that operate this mechanism — some are agents, some are human, some can be either.',
  contracts:
    'Every hand-off between two roles is a written contract, not a hallway conversation — each with a named producer and consumer.',
  ring0: 'Runs on the agent’s own machine, before anything leaves it. A violation here never becomes a commit.',
  actions: 'The exact acts that cross from an agent’s local machine into GitHub — every one of them gated.',
  ring1: 'Runs in CI, on every pull request — the same checks Ring 0 ran, but nothing gets to skip them.',
  ring2: 'Runs continuously after merge, across the whole forge — drift gets surfaced, never silently inherited.'
}

/**
 * Client-side orchestrator — receives already-derived `groups` as a plain
 * prop. It must never import `deriveGroups` or any other `@atta/aeg-core`
 * value directly: that barrel transitively pulls in `@atta/aeg-forge-state`'s
 * `node:child_process` usage, which Turbopack cannot bundle for the
 * browser. Derivation happens once, server-side, in `page.tsx`.
 *
 * Full-bleed layout: the diagram is the page's dominant element and must be
 * fully visible without scrolling. Title/description/legend live in a
 * fixed-width sidebar on the left; the diagram takes the rest of the row.
 */
export function DiagramExplorer({ groups, findings, readMoreHrefs }: Props) {
  const [drilledKey, setDrilledKey] = useState<GroupKey | null>(null)
  const [selectedLeaf, setSelectedLeaf] = useState<DiagramNode | null>(null)

  const drilledGroup = groups.find((g) => g.key === drilledKey) ?? null

  const handleDrill = (key: GroupKey) => {
    setDrilledKey(key)
    setSelectedLeaf(null)
  }

  const handleBack = () => {
    setDrilledKey(null)
    setSelectedLeaf(null)
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 items-center justify-between gap-4 border-border border-b px-6 py-3'>
        {/* Dynamic breadcrumb — depth mirrors drill state (round-4 fix; used
            to be a static "Home / How it works" string regardless of how
            deep you'd drilled). Every segment before the last is a real
            back-navigation control: "How it works" resets to the overview,
            the ring segment (when a leaf is selected) drops back to that
            ring. This replaces the sidebar's old "← Back" button entirely —
            one back-affordance, not two doing the same job. */}
        <Breadcrumb>
          <BreadcrumbList className='font-mono text-xs uppercase tracking-[0.1em]'>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/'>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {drilledGroup ? (
                // `uppercase` reapplied directly: Tailwind Preflight resets
                // `text-transform` on `<button>` (form-control normalization),
                // which breaks inheritance from `BreadcrumbList` — the `<a>`
                // segment above isn't affected since anchors keep it.
                <BreadcrumbLink asChild className='uppercase'>
                  <button type='button' onClick={handleBack}>
                    How it works
                  </button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className='font-bold text-foreground'>How it works</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {drilledGroup && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {selectedLeaf ? (
                    <BreadcrumbLink asChild className='uppercase'>
                      <button type='button' onClick={() => setSelectedLeaf(null)}>
                        {drilledGroup.label}
                      </button>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className='font-bold text-foreground'>{drilledGroup.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {selectedLeaf && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {/* The node's NAME, never its full `Action` cell — a
                      breadcrumb is a trail marker, and ten doctrine rows
                      carry a whole sentence here (see `shortLabel`). The
                      untruncated string is one glance away in the panel
                      title beside it. */}
                  <BreadcrumbPage className='font-bold text-foreground'>
                    {shortLabel(humanLabel(selectedLeaf.label))}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <Text as='span' className='hidden font-mono text-muted-foreground text-xs sm:block'>
          Click a ring to drill in. Click a node for its detail.
        </Text>
      </div>

      {/* Below `lg` there isn't room for a 340px sidebar next to a legible
          ring — stack instead: `flex-col-reverse` puts the diagram (second
          in DOM) on top and the sidebar (first in DOM) below it, matching
          `lg:flex-row`'s left-sidebar order once there's room. */}
      <div className='flex flex-col-reverse lg:min-h-0 lg:flex-1 lg:flex-row'>
        <aside className='flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-border border-t bg-card p-6 text-card-foreground lg:w-[340px] lg:border-t-0 lg:border-r'>
          {selectedLeaf && drilledGroup ? (
            <LeafPanel node={selectedLeaf} groupKey={drilledGroup.key} readMoreHref={readMoreHrefs[selectedLeaf.id]} />
          ) : (
            <div className='flex flex-col gap-3'>
              {/* Sidebar title/tagline — page framing (round-2 wrongly
                  dropped this thinking the top-strip breadcrumb replaced it;
                  the breadcrumb is navigation, this is the page's own
                  title/description, a different element). Switches to the
                  drilled ring's own name once drilled, same as before. */}
              <Heading level={2} className='font-serif text-card-foreground text-xl'>
                {drilledGroup ? drilledGroup.label : 'Agents obey checkers, not documents.'}
              </Heading>
              <Text size='sm' className='font-sans text-card-foreground leading-relaxed'>
                {drilledGroup ? GROUP_EXPLANATION[drilledGroup.key] : OVERVIEW_TEXT}
              </Text>
            </div>
          )}

          <FindingsBanner findings={findings} />
        </aside>

        <div className='flex min-h-[420px] w-full min-w-0 items-center justify-center p-4 lg:flex-1'>
          <DiagramCanvas
            groups={groups}
            drilledGroup={drilledGroup}
            selectedLeafId={selectedLeaf?.id ?? null}
            onDrill={handleDrill}
            onBack={handleBack}
            onSelectLeaf={setSelectedLeaf}
          />
        </div>
      </div>
    </div>
  )
}
