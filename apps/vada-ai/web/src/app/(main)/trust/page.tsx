import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import type { Metadata } from 'next'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { getTrustContent } from './lib/content'
import { preprocessMdx } from '@/lib/mdx-preprocess'

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm]
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getTrustContent()
  return { title, description }
}

export default async function TrustPage() {
  const { section, content } = await getTrustContent()
  const body = preprocessMdx(content)

  return (
    <article className='mx-auto w-full max-w-3xl space-y-2 px-6 py-12'>
      <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>{section}</span>
      <div className='text-base'>
        <MDXRemote source={body} components={mdxComponents} options={mdxOptions} />
      </div>
    </article>
  )
}
