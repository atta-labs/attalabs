import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { ArrowRight } from 'lucide-react'
import { Separator } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { getFlatScienceDocs, getNextScienceDoc, getScienceDocBySlug, getScienceDocContent } from '../lib/content'
import { preprocessMdx } from '@/lib/mdx-preprocess'

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm]
  }
}

export async function generateStaticParams() {
  const docs = await getFlatScienceDocs()
  return docs.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = await getScienceDocBySlug(slug)
  if (!doc) return {}
  return {
    title: `${doc.title} · The Science of Vāda`,
    description: doc.description
  }
}

export default async function ScienceDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const loaded = await getScienceDocContent(slug)
  if (!loaded) notFound()

  const { doc, content } = loaded
  const next = await getNextScienceDoc(slug)

  // Strip the first H1 (rendered from frontmatter) and prepare remaining content for MDX.
  const body = preprocessMdx(content.replace(/^\s*#\s+.*\n/, ''))

  return (
    <article className='space-y-8'>
      <header className='space-y-3'>
        <span className='font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'>{doc.section}</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          {doc.title}
        </Heading>
        {doc.description && (
          <Text as='p' muted className='text-lg leading-relaxed'>
            {doc.description}
          </Text>
        )}
      </header>

      <Separator className='opacity-20' />

      <div className='text-base'>
        <MDXRemote source={body} components={mdxComponents} options={mdxOptions} />
      </div>

      {next && (
        <>
          <Separator className='opacity-20' />
          <footer className='flex items-center justify-between pt-2'>
            <span className='font-mono text-xs uppercase tracking-wider text-muted-foreground'>Next</span>
            <NextLink
              variant='unstyled'
              href={next.href}
              className='group flex items-center gap-2 font-serif text-base text-foreground transition-colors hover:text-accent'
            >
              <span>{next.title}</span>
              <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
            </NextLink>
          </footer>
        </>
      )}
    </article>
  )
}
