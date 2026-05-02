import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import type { Metadata } from 'next'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { getMcpContent } from './lib/content'
import { preprocessMdx } from '@/lib/mdx-preprocess'
import { ArchitectureDiagram } from '@/components/mcp/ArchitectureDiagram'
import { ConsumersDiagram } from '@/components/mcp/ConsumersDiagram'

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm]
  }
}

const components = {
  ...mdxComponents,
  ArchitectureDiagram,
  ConsumersDiagram
}

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getMcpContent()
  return { title, description }
}

export default async function McpPage() {
  const { section, content } = await getMcpContent()
  const body = preprocessMdx(content)

  return (
    <article className='mx-auto w-full max-w-3xl space-y-2 px-6 py-12'>
      <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>{section}</span>
      <div className='text-base'>
        <MDXRemote source={body} components={components} options={mdxOptions} />
      </div>
    </article>
  )
}
