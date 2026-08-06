import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ACTIONS, type DiagramModel, type DiagramNode } from '@atta/aeg-core'
import { findDoc, getNextDoc, getPrevDoc, nodeDocRoute, publishedDoctrineBody } from '@atta/aeg-core/docs'
import { badgeLabels, humanLabel } from '../../the-harness/_lib/display-label'
import { loadDiagramModel } from '../../the-harness/_lib/load-diagram'
import { githubBlobUrl } from '@/lib/github-links'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocPage } from '../_components/DocPage'
import { type HarnessSection, type HarnessSectionGroup, HarnessSectionsPage } from '../_components/HarnessSectionsPage'

type Params = { slug: string[] }

export async function generateStaticParams(): Promise<Params[]> {
  const { nav } = await loadAegDocs()
  return nav.flat.map((doc) => ({ slug: doc.slug.split('/') }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const { nav } = await loadAegDocs()
  const doc = findDoc(nav, slug.join('/'))
  if (!doc) return {}
  return {
    title: `${doc.title} · Vinaya Docs`,
    description: doc.description
  }
}

/**
 * The model frame for a file-sized doc slug: the node that points at it
 *. `role`/`contract` docs each back exactly one node — its
 * `category`/`actorType` is the frame.
 */
function docFrameBadges(node: { category?: string; actorType?: string; crosses?: string }): string[] {
  if (node.actorType === 'either') return ['human or agent']
  return badgeLabels(node)
}

function frameForSlug(slug: string, model: DiagramModel): { kindTag: string; badges: string[] } | undefined {
  if (slug.startsWith('roles/')) {
    const node = model.nodes.find((n) => n.kind === 'role' && n.label === slug.slice('roles/'.length))
    return node ? { kindTag: 'role', badges: docFrameBadges(node) } : undefined
  }
  if (slug.startsWith('contracts/')) {
    const node = model.nodes.find((n) => n.kind === 'contract' && n.label === slug.slice('contracts/'.length))
    return node ? { kindTag: 'contract', badges: docFrameBadges(node) } : undefined
  }
  return undefined
}

/**
 * A contract's seam, as words: the role that fills it and the role that drains
 * it. Read from the model's own `produces`/`consumes` edges (which are derived
 * from the contract's `producer:`/`consumer:` frontmatter) and named with the
 * same `displayLabel` the map cards use, so the two surfaces can never call a
 * role different things. `carrier:` is deliberately not rendered — its values
 * are identifiers, and the short version already states the carrier in words.
 */
function seamForSlug(slug: string, model: DiagramModel): { producer?: string; consumer?: string } | undefined {
  if (!slug.startsWith('contracts/')) return undefined
  const contractNodeId = `contract:${slug.slice('contracts/'.length)}`
  const roleName = (nodeId: string | undefined): string | undefined => {
    const node = model.nodes.find((n) => n.id === nodeId)
    return node ? (node.displayLabel ?? humanLabel(node.label)) : undefined
  }
  const edgeFrom = (kind: 'produces' | 'consumes') =>
    model.edges.find((e) => e.kind === kind && e.to === contractNodeId)?.from
  const producer = roleName(edgeFrom('produces'))
  const consumer = roleName(edgeFrom('consumes'))
  return producer || consumer ? { producer, consumer } : undefined
}

/** `enforcement.md`'s intro — everything before the first per-ring detail
 * heading (`## Ring 0 — …`). The one place `enforcement.md` raw text renders;
 * the ring details themselves render as model-derived gate sections. */
function ringsLandingBody(enforcement: string): string {
  const idx = enforcement.search(/^## Ring 0\b/m)
  return idx === -1 ? enforcement : enforcement.slice(0, idx).trimEnd()
}

/** ring-0 gate → the action label(s) it guards, from the model's `guards` edges. */
function guardsByNode(model: DiagramModel): Map<string, string[]> {
  const actionLabel = new Map(model.nodes.filter((n) => n.kind === 'action').map((n) => [n.id, n.label]))
  const out = new Map<string, string[]>()
  for (const edge of model.edges) {
    if (edge.kind !== 'guards') continue
    const label = actionLabel.get(edge.to)
    if (!label) continue
    out.set(edge.from, [...(out.get(edge.from) ?? []), humanLabel(label)])
  }
  return out
}

function gateSections(model: DiagramModel, ringIndex: 0 | 1 | 2): HarnessSection[] {
  const guards = guardsByNode(model)
  return model.nodes
    .filter((n): n is DiagramNode => (n.kind === 'gate' || n.kind === 'check') && n.ringIndex === ringIndex)
    .map((n) => ({
      slug: nodeDocRoute(n)?.slug ?? n.id,
      heading: humanLabel(n.label),
      badges: badgeLabels(n),
      guards: guards.get(n.id),
      summary: n.summary,
      detail: n.detail,
      viewSourceHref: githubBlobUrl('aeg-root/enforcement.md', n.sourceLine)
    }))
}

/**
 * The actions page, split into two `#`-anchored groups by GitHub crossing —
 * the two `/docs/actions#reaches-github` / `#stays-local` sidebar entries. The
 * crossing is the group heading, so no redundant per-action badge.
 */
function actionGroups(model: DiagramModel): HarnessSectionGroup[] {
  // `ACTIONS.performedBy` carries role IDS (`brief-author`), which are identity,
  // not names. Resolve each through the model's own role node so this line
  // reads as words — the same `displayLabel` the map cards use, so the two
  // surfaces can never name the same role differently.
  const roleName = new Map(
    model.nodes.filter((n) => n.kind === 'role').map((n) => [n.label, n.displayLabel ?? n.label])
  )
  const toSection = (a: (typeof ACTIONS)[number]): HarnessSection => ({
    slug: a.id,
    heading: humanLabel(a.label),
    badges: [],
    performedBy: a.performedBy.map((id) => roleName.get(id) ?? id),
    summary: a.summary,
    detail: a.description,
    viewSourceHref: githubBlobUrl('packages/aeg-core/src/actions.ts')
  })
  return [
    {
      id: 'reaches-github',
      label: 'Reaches GitHub',
      sections: ACTIONS.filter((a) => a.crosses === 'into-github').map(toSection)
    },
    { id: 'stays-local', label: 'Stays local', sections: ACTIONS.filter((a) => a.crosses === 'none').map(toSection) }
  ]
}

export default async function AegDocPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const joined = slug.join('/')

  // The old surfaced URL — kept alive, now the rings landing.
  if (joined === 'enforcement') redirect('/docs/rings')

  const { nav, bodyBySlug, basePath } = await loadAegDocs()
  const doc = findDoc(nav, joined)
  if (!doc) notFound()

  const model = await loadDiagramModel()
  const next = getNextDoc(nav, joined)
  const prev = getPrevDoc(nav, joined)

  // --- Model-derived synthetic pages ---
  if (joined === 'rings') {
    const body = ringsLandingBody(bodyBySlug.get('enforcement') ?? '')
    return <DocPage doc={doc} body={body} next={next} prev={prev} basePath={basePath} />
  }
  const ringMatch = joined.match(/^rings\/ring-([012])$/)
  if (ringMatch) {
    const ringIndex = Number(ringMatch[1]) as 0 | 1 | 2
    return (
      <HarnessSectionsPage
        doc={doc}
        sections={gateSections(model, ringIndex)}
        next={next}
        prev={prev}
        basePath={basePath}
      />
    )
  }
  if (joined === 'actions') {
    return <HarnessSectionsPage doc={doc} groups={actionGroups(model)} next={next} prev={prev} basePath={basePath} />
  }

  // --- File-sized pages (roles / contracts): the short version under the
  // frame. The published page is the binding short version, never the
  // reference beneath it — `publishedDoctrineBody` is the same extraction the
  // C7 gate checks, so the page and the gate can never disagree about what
  // publishes. The full file is linked, not inlined.
  const body = bodyBySlug.get(joined)
  if (body === undefined) notFound()
  const frame = frameForSlug(joined, model)
  return (
    <DocPage
      doc={doc}
      body={publishedDoctrineBody(body)}
      next={next}
      prev={prev}
      basePath={basePath}
      frame={frame}
      seam={seamForSlug(joined, model)}
      sourceHref={githubBlobUrl(`aeg-root/${joined}.md`)}
    />
  )
}
