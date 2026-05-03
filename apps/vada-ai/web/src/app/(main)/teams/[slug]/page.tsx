import { listPublicSpecs, compileSpec } from '@atta/engine'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TeamHeader } from './components/TeamHeader'
import { TeamDetailTabs } from './components/TeamDetailTabs'
import { Button } from '@atta/ui/components/button'
import { ArrowRight } from 'lucide-react'

const PLACEHOLDER_QUESTION = 'What is the best approach for this challenge?'

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const specs = listPublicSpecs()
  const spec = specs.find((s) => s.id === slug)

  if (!spec) notFound()

  const plan = compileSpec(spec, PLACEHOLDER_QUESTION)

  return (
    <div className='mx-auto w-full max-w-5xl space-y-8 px-6 py-12'>
      <TeamHeader spec={spec} />
      <p className='max-w-2xl text-base text-foreground leading-relaxed'>{spec.description}</p>
      <TeamDetailTabs spec={spec} plan={plan} />
      <div className='pt-4 border-t border-border/40'>
        <Button asChild>
          <Link href={`/deliberate?team=${spec.id}`} className='flex items-center gap-2'>
            Use this team
            <ArrowRight className='size-4' />
          </Link>
        </Button>
      </div>
    </div>
  )
}
