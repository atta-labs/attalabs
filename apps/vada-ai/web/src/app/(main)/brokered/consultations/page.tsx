import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { listBrokeredConsultations } from '@/db/mcp-queries'

const PROFILE_LABELS: Record<string, string> = {
  critic: 'Critic',
  strategist: 'Strategist',
  devils_advocate: "Devil's Advocate",
  mentor: 'Mentor',
  optimist: 'Optimist'
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function BrokeredConsultationsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const consultations = await listBrokeredConsultations(clerkId)

  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-2xl space-y-10'>
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>Brokered Deliberation</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Consultations
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            Sessions initiated via the Vāda MCP server from your chat client.
          </Text>
        </div>

        <Separator className='opacity-20' />

        {consultations.length === 0 ? (
          <div className='space-y-4 py-8 text-center'>
            <Text as='p' muted>
              No consultations yet.
            </Text>
            <NextLink href='/brokered/mcp' variant='prose' className='text-sm'>
              Set up the MCP server →
            </NextLink>
          </div>
        ) : (
          <div className='space-y-3'>
            {consultations.map((c) => (
              <NextLink key={c.id} href={`/brokered/consultations/${c.id}`} variant='unstyled'>
                <div className='group rounded-lg border border-border p-4 transition-colors hover:bg-muted/30'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1 space-y-1'>
                      <p className='truncate text-sm font-medium'>{c.prompt}</p>
                      <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                        {c.reviewerProfile && (
                          <span className='font-mono'>{PROFILE_LABELS[c.reviewerProfile] ?? c.reviewerProfile}</span>
                        )}
                        <span>{formatDate(c.createdAt)}</span>
                        <span>{formatDuration(c.durationMs)}</span>
                        {c.costUsd && <span>${Number(c.costUsd).toFixed(4)}</span>}
                      </div>
                    </div>
                    <span className='shrink-0 text-xs text-muted-foreground transition-colors group-hover:text-foreground'>
                      →
                    </span>
                  </div>
                </div>
              </NextLink>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
