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
const HARNESS_NAME = 'The Vinaya Harness'
const HARNESS_TITLE = 'The forge rings that keep your code safe'
const HARNESS_INTRO =
  'Vinaya is a series of deterministic checks and workflows that hold agentic and human development to the same discipline — an AI agent and a person answer to the identical rules before anything merges. Each ring below is read at build time from this repo’s own doctrine, not hand-written for this page.'

/** Sentence-case a display label's first character — doctrine `Action` cells
 * are written lower-case ("publish the branch"), and the sidebar list reads
 * them back as "Publish the branch". First letter only, never title-case:
 * "reviewer-archivist" must not become "Reviewer-Archivist". */
const capitalizeFirst = (s: string): string => (s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s)

type LegendEntry = { name: string; description: string; groupKey?: GroupKey }

/**
 * The rings, outer → center — the sidebar legend on the overview, and (via
 * `GROUP_EXPLANATION`, built from the entries that map to a drillable
 * `GroupKey`) the single-ring framing shown once a ring is drilled.
 *
 * Built from the live `DiagramModel` groups, NOT a hardcoded table. Two facts
 * that must never drift from the diagram the ring itself paints are DERIVED
 * from the model here rather than typed into prose — the actor roster and the
 * count of canonical actions. That is the page's whole thesis (D-119): counts
 * and names come from `aeg-root/**` doctrine at build time, so a role added or
 * an action retired updates this copy with zero page change. The rest is fixed
 * editorial framing, same status as the ring/seam labels in `groupings.ts`.
 * `GitHub` (the substrate divider) and `main — Protected` (the hub) carry no
 * `GroupKey` — framing chrome, legend-only, never drilled.
 */
function buildHarnessLegend(groups: DiagramGroup[]): LegendEntry[] {
  const childrenOf = (key: GroupKey): DiagramNode[] => groups.find((g) => g.key === key)?.children ?? []
  const actorRoster = childrenOf('actors')
    .map((n) => capitalizeFirst(humanLabel(n.label)))
    .join(', ')
  const actionCount = childrenOf('actions').length

  return [
    {
      name: 'The Actors',
      groupKey: 'actors',
      description: `Every human and AI agent that touches the repo — ${actorRoster}. One rulebook binds all of them.`
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
      description: `The canonical acts of work an agent or human performs — ${actionCount} in all; some cross into GitHub, some stay local.`
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
}

/** The one body-copy style, shared by the intro, every ring description, and
 * every list item — same font, colour and line-height everywhere, so no two
 * paragraphs in this sidebar can drift apart. Paired with `size='sm'`. */
const BODY_TEXT = 'font-sans text-card-foreground leading-relaxed'

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

  // Built from the live model each render — the roster/count inside the copy
  // track the doctrine, never a stale constant (D-119). `groupExplanation` is
  // the same source, so the drilled-ring text can never disagree with the
  // overview legend for the same ring.
  const legend = buildHarnessLegend(groups)
  const groupExplanation = Object.fromEntries(
    legend.filter((entry) => entry.groupKey).map((entry) => [entry.groupKey, entry.description])
  ) as Record<GroupKey, string>

  const handleDrill = (key: GroupKey) => {
    setDrilledKey(key)
    setSelectedLeaf(null)
  }

  const handleBack = () => {
    setDrilledKey(null)
    setSelectedLeaf(null)
  }

  return (
    <div className='flex h-full w-full flex-col overflow-hidden'>
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
              <Text size='sm' className={BODY_TEXT}>
                {drilledGroup ? groupExplanation[drilledGroup.key] : HARNESS_INTRO}
              </Text>
              {/* Overview only: the ring legend, outer → center. Once a ring
                  is drilled the heading/intro above switch to that ring's own
                  name and framing, so the full legend gives way to the one. */}
              {!drilledGroup && (
                <div className='mt-1 flex flex-col gap-3.5'>
                  {legend.map((entry) => (
                    <div key={entry.name} className='flex flex-col gap-1'>
                      <Text as='span' size='sm' className='font-sans font-bold text-card-foreground'>
                        {entry.name}
                      </Text>
                      <Text size='sm' className={BODY_TEXT}>
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
                  <ol className='flex list-decimal flex-col gap-1 pl-5'>
                    {drilledGroup.children.map((node) => (
                      <li key={node.id} className='pl-1 marker:text-muted-foreground'>
                        <Text as='span' size='sm' className={BODY_TEXT}>
                          {capitalizeFirst(humanLabel(node.label))}
                        </Text>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          <FindingsBanner findings={findings} />
        </aside>

        {/* Diagram column: a title row on top, then the ring filling whatever
            height is left. The page fills the app-shell's scroll region via
            `h-full` (see `(site)/layout.tsx`), so the SVG — which scales to its
            box via `viewBox` + `h-full` — just renders smaller to make room for
            the title, rather than pushing the page taller. `min-h-0` lets the
            canvas wrapper shrink below the ring's intrinsic size instead of
            forcing a scroll. */}
        <div className='flex min-h-[420px] w-full min-w-0 flex-col items-center gap-2 p-4 lg:min-h-0 lg:flex-1'>
          {/* Matches the ring's own hub-centre label (`DiagramCanvas`'s
              `font-mono text-muted-foreground` "The actors" title) — same
              typeface and colour, so the page title and the ring read as one
              type system, not two. */}
          <Heading level={1} className='shrink-0 text-center font-mono text-3xl text-muted-foreground'>
            {HARNESS_NAME}
          </Heading>
          {/* `items-start` + the SVG's own `xMidYMin` alignment pin the ring to
              the top of this box, so the gap from title to ring equals the gap
              from title to the top bar (both the `gap-4`/`p-4` value) instead of
              the ring floating centred with a big gap above it. */}
          <div className='flex min-h-0 w-full flex-1 items-start justify-center'>
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
    </div>
  )
}
