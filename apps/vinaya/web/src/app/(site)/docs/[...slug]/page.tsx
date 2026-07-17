import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { findDoc, getNextDoc, getPrevDoc } from '@atta/aeg-core/docs'
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

export default async function AegDocPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const joined = slug.join('/')
  const { nav, bodyBySlug, basePath } = await loadAegDocs()
  const doc = findDoc(nav, joined)
  const body = bodyBySlug.get(joined)
  if (!doc || body === undefined) notFound()

  const next = getNextDoc(nav, joined)
  const prev = getPrevDoc(nav, joined)

  return <DocPage doc={doc} body={body} next={next} prev={prev} basePath={basePath} />
}
