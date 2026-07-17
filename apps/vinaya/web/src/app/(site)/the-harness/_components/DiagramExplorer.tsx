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
  viewSourceHrefs: Record<string, string>
}

/** Overview framing, shown in the sidebar before any ring is drilled — copy,
 * not derived data, same status as the ring/seam labels themselves
 * (`groupings.ts`'s `STATIC_GROUP_LABELS`). Prose, not markdown: it renders
 * through `Text`, so backticks would show up literally. */
const HARNESS_TITLE = 'The Vinaya harness — the rings that keep your code safe'
const HARNESS_INTRO =
  'Vinaya is a series of deterministic checks and workflows that hold agentic and human development to the same discipline — an AI agent and a person answer to the identical rules before anything merges. Each ring below is read at build time from this repo’s own doctrine, not hand-written for this page.'

/**
 * The rings, outer → center — the sidebar legend on the overview, and the
 * single-ring framing shown once a ring is drilled (`GROUP_EXPLANATION`,
 * derived below from the entries that map to a drillable `GroupKey`). Two
 * entries — `GitHub` (the static substrate divider) and `main — Protected`
 * (the centre hub) — carry no `GroupKey`: they are framing chrome, not
 * drillable groups, so they appear in the legend only.
 */
type LegendEntry = { name: string; description: string; groupKey?: GroupKey }
const HARNESS_LEGEND: LegendEntry[] = [
  {
    name: 'The Actors',
    groupKey: 'actors',
    description:
      'Every human and AI agent that touches the repo — Developer, Reviewer, Planner, Archivist. One rulebook binds all of them.'
  },
  {
    name: 'What Actors Do',
    groupKey: 'contracts',
    description:
      'The contracts: the defined handoffs between actors — brief to developer, developer to reviewer, reviewer to archivist. Each handoff carries a fixed obligation.'
  },
  {
    name: 'Hooks',
    groupKey: 'ring0',
    description:
      'Checks on the agent’s own machine. An invalid commit or push is refused before it ever leaves the session; the agent reads the error and fixes it in place. Self-correcting — nobody downstream pays.'
  },
  {
    name: 'The Actions',
    groupKey: 'actions',
    description:
      'The canonical acts of work — write the code, commit, open the PR, produce the verdict, post provenance. Ten in all; some cross into GitHub, some stay local.'
  },
  {
    name: 'GitHub',
    description:
      'The forge where actions land — issues, branches, pull requests. The shared substrate everything writes to.'
  },
  {
    name: 'Branch Rules',
    groupKey: 'ring1',
    description:
      'CI on every pull request. The same checks re-run on the forge; a violation turns CI red and the merge gate makes red unmergeable by agents. Catches writers the local hooks can’t reach — the web UI, humans, other tools.'
  },
  {
    name: 'Audits',
    groupKey: 'ring2',
    description:
      'Continuous sweeps across the whole forge, after merge. Drift surfaces as findings no matter who wrote it — even history that predates the gates. Scheduled clean-up, never a mid-work surprise.'
  },
  {
    name: 'main — Protected',
    description:
      'The branch everything guards. It only ever advances through the rings above — reviewed, checked, green. A push that slips past by force doesn’t stay invisible — the Audits ring catches it after the fact.'
  }
]

const GROUP_EXPLANATION = Object.fromEntries(
  HARNESS_LEGEND.filter((entry) => entry.groupKey).map((entry) => [entry.groupKey, entry.description])
) as Record<GroupKey, string>

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
export function DiagramExplorer({ groups, findings, readMoreHrefs, viewSourceHrefs }: Props) {
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
            back-navigation control: "The Harness" resets to the overview,
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
                    The Harness
                  </button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className='font-bold text-foreground'>The Harness</BreadcrumbPage>
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
            <LeafPanel
              node={selectedLeaf}
              groupKey={drilledGroup.key}
              readMoreHref={readMoreHrefs[selectedLeaf.id]}
              viewSourceHref={viewSourceHrefs[selectedLeaf.id]}
            />
          ) : (
            <div className='flex flex-col gap-3'>
              {/* Sidebar title/tagline — page framing (round-2 wrongly
                  dropped this thinking the top-strip breadcrumb replaced it;
                  the breadcrumb is navigation, this is the page's own
                  title/description, a different element). Switches to the
                  drilled ring's own name once drilled, same as before. */}
              <Heading level={2} className='font-serif text-card-foreground text-xl'>
                {drilledGroup ? drilledGroup.label : HARNESS_TITLE}
              </Heading>
              <Text size='sm' className='font-sans text-card-foreground leading-relaxed'>
                {drilledGroup ? GROUP_EXPLANATION[drilledGroup.key] : HARNESS_INTRO}
              </Text>
              {/* Overview only: the ring legend, outer → center. Once a ring
                  is drilled the heading/intro above switch to that ring's own
                  name and framing, so the full legend gives way to the one. */}
              {!drilledGroup && (
                <div className='mt-1 flex flex-col gap-3.5'>
                  {HARNESS_LEGEND.map((entry) => (
                    <div key={entry.name} className='flex flex-col gap-1'>
                      <Text as='span' className='font-mono text-card-foreground text-xs uppercase tracking-[0.1em]'>
                        {entry.name}
                      </Text>
                      <Text size='sm' className='font-sans text-muted-foreground leading-snug'>
                        {entry.description}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
              {/* Drilled ring only: the ring's own members, by full name (the
                  wedges truncate; here they read whole). Derived from
                  `drilledGroup.children` — the same model-derived nodes the
                  diagram paints, never a hardcoded per-ring list, so a doctrine
                  row added or removed shows up here with no page change. Names
                  only, no per-node prose, per the drilled framing above. */}
              {drilledGroup && (
                <div className='mt-1 flex flex-col gap-2'>
                  <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
                    In this ring — {drilledGroup.children.length}
                  </Text>
                  <div className='flex flex-col gap-1.5'>
                    {drilledGroup.children.map((node) => (
                      <Text key={node.id} size='sm' className='font-sans text-card-foreground leading-snug'>
                        {humanLabel(node.label)}
                      </Text>
                    ))}
                  </div>
                </div>
              )}
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
