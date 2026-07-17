import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { DiagramModel } from '@atta/aeg-core'
import { findDoc, getNextDoc, getPrevDoc } from '@atta/aeg-core/docs'
import { badgeLabels } from '../../how-it-works/_lib/display-label'
import { loadDiagramModel } from '../../how-it-works/_lib/load-diagram'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocPage } from '../_components/DocPage'

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
 * The model frame for a doc slug: the node that points at it (D-079). `role`
 * and `contract` docs each back exactly one node — its `category`/`actorType`
 * is the frame. `enforcement.md` backs every ring-0 gate and ring-1/2 check, so
 * it carries no single node's badges — just the kind tag. Returns `undefined`
 * for any slug no node points at (which cannot be surfaced anyway).
 */
function frameForSlug(slug: string, model: DiagramModel): { kindTag: string; badges: string[] } | undefined {
  if (slug === 'enforcement') return { kindTag: 'enforcement', badges: [] }
  if (slug.startsWith('roles/')) {
    const node = model.nodes.find((n) => n.kind === 'role' && n.label === slug.slice('roles/'.length))
    return node ? { kindTag: 'role', badges: badgeLabels(node) } : undefined
  }
  if (slug.startsWith('contracts/')) {
    const node = model.nodes.find((n) => n.kind === 'contract' && n.label === slug.slice('contracts/'.length))
    return node ? { kindTag: 'contract', badges: badgeLabels(node) } : undefined
  }
  return undefined
}

export default async function AegDocPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const joined = slug.join('/')
  const { nav, bodyBySlug, basePath } = await loadAegDocs()
  const doc = findDoc(nav, joined)
  const body = bodyBySlug.get(joined)
  if (!doc || body === undefined) notFound()

  const next = getNextDoc(nav, joined)
  const prev = getPrevDoc(nav, joined)
  const frame = frameForSlug(joined, await loadDiagramModel())

  return <DocPage doc={doc} body={body} next={next} prev={prev} basePath={basePath} frame={frame} />
}
