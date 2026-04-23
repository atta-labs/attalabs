import { Heading, Text } from '@atta/ui/shared'
import { Button } from '@atta/ui'
import { Separator } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'

export default function BrokeredPage() {
  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-2xl space-y-12'>
        {/* Header */}
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>Brokered Deliberation</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            On-demand reviewers, in your chat client.
          </Heading>
          <Text as='p' muted className='text-lg leading-relaxed'>
            Brokered Deliberation lets you call Vāda reviewers from your existing chat client via MCP. Get a critic,
            strategist, or devil&apos;s advocate&apos;s perspective without leaving Claude Desktop, Cursor, or any
            MCP-compatible client.
          </Text>
        </div>

        <Separator className='opacity-20' />

        {/* Difference from Autonomous */}
        <div className='space-y-3'>
          <span className='font-mono text-xs text-muted-foreground'>How it differs</span>
          <Text as='p' className='leading-relaxed'>
            Unlike Autonomous Deliberation — where agents debate each other and you observe — Brokered puts you in
            control. You summon individual reviewers on demand, mid-conversation, without leaving your client.
          </Text>
          <NextLink href='/autonomous' variant='prose' className='text-sm'>
            Autonomous Deliberation →
          </NextLink>
        </div>

        <Separator className='opacity-20' />

        {/* CTAs */}
        <div className='flex flex-col gap-4 sm:flex-row'>
          <NextLink href='/brokered/mcp' variant='unstyled'>
            <Button size='lg' className='w-full sm:w-auto'>
              Set up MCP
            </Button>
          </NextLink>
          <NextLink href='/brokered/consultations' variant='unstyled'>
            <Button size='lg' variant='outline' className='w-full sm:w-auto'>
              View consultations
            </Button>
          </NextLink>
        </div>
      </div>
    </div>
  )
}
