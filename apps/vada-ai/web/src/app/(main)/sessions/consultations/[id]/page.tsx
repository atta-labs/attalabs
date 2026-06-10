import { auth } from '@atta/auth/hooks'
import { notFound } from 'next/navigation'
import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { getBrokeredConsultation } from '@/db/mcp-queries'
import { ResponseBody } from './components/ResponseBody'

const PROFILE_LABELS: Record<string, string> = {
  critic: 'Critic',
  strategist: 'Strategist',
  devils_advocate: "Devil's Advocate",
  mentor: 'Mentor',
  optimist: 'Optimist'
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-4 py-1.5'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='font-mono text-xs text-foreground'>{value}</span>
    </div>
  )
}

export default async function BrokeredConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()

  const { id } = await params
  const consultation = await getBrokeredConsultation(id, clerkId!)

  if (!consultation) notFound()

  const totalTokens = consultation.tokensInput + consultation.tokensOutput
  const costFormatted = consultation.costUsd ? `$${Number(consultation.costUsd).toFixed(4)}` : '—'
  const dateFormatted = consultation.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const durationFormatted =
    consultation.durationMs < 1000 ? `${consultation.durationMs}ms` : `${(consultation.durationMs / 1000).toFixed(1)}s`

  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>
            <NextLink href='/sessions/consultations' variant='prose' className='text-xs'>
              ← Consultations
            </NextLink>
          </span>
          <Heading level={1} className='font-serif text-3xl font-light leading-snug'>
            {consultation.prompt}
          </Heading>
          {consultation.reviewerProfile && (
            <Text as='p' muted className='text-sm'>
              {PROFILE_LABELS[consultation.reviewerProfile] ?? consultation.reviewerProfile}
            </Text>
          )}
        </div>

        <Separator className='opacity-20' />

        <div className='grid gap-10 lg:grid-cols-[1fr_220px]'>
          <div className='min-w-0 space-y-4'>
            <ResponseBody response={consultation.response} />
          </div>

          <aside className='space-y-1'>
            <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>Metadata</p>
            <Separator className='opacity-20' />
            <MetaRow label='Date' value={dateFormatted} />
            <MetaRow label='Duration' value={durationFormatted} />
            <MetaRow label='Cost' value={costFormatted} />
            <MetaRow label='Tokens in' value={consultation.tokensInput.toLocaleString()} />
            <MetaRow label='Tokens out' value={consultation.tokensOutput.toLocaleString()} />
            <MetaRow label='Total tokens' value={totalTokens.toLocaleString()} />
          </aside>
        </div>
      </div>
    </div>
  )
}
