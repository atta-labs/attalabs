import { Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight, MonitorSmartphone } from 'lucide-react'

/**
 * Production stand-in for the Studio dashboard (D-101 Phase 1: local-only for
 * v1.0). Says plainly why the dashboard isn't here rather than rendering an
 * empty/broken shell — an unexplained gap is the D-087 lie-by-omission this
 * gate exists to close.
 */
export function StudioLocalOnlyLanding() {
  return (
    <div className='space-y-6'>
      <Heading level={1} className='font-serif text-3xl tracking-tight text-foreground'>
        Vinaya Studio
      </Heading>
      <Card className='border-border bg-card'>
        <CardContent className='space-y-4 pt-6'>
          <div className='flex items-start gap-3'>
            <MonitorSmartphone className='size-5 shrink-0 translate-y-0.5 text-muted-foreground' aria-hidden />
            <Text as='p' className='font-sans text-sm text-foreground'>
              Studio is local-only for Vinaya v1.0. The dashboard reads live GitHub state using your own checkout's
              credentials, which don't exist on this deploy — so there's nothing honest to show here.
            </Text>
          </div>
          <Text as='p' className='font-sans text-sm text-muted-foreground'>
            Run it locally to see Projects, Iterations, and Backlog.
          </Text>
          <NextLink
            href='/studio/docs'
            variant='unstyled'
            className='inline-flex items-center gap-1.5 font-sans text-sm text-accent hover:underline'
          >
            The methodology docs are public — browse them at /studio/docs
            <ArrowRight className='size-4' aria-hidden />
          </NextLink>
        </CardContent>
      </Card>
    </div>
  )
}
