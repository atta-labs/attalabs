import { Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface KnownLimit {
  title: string
  detail: string
  source: string
}

const KNOWN_LIMITS: KnownLimit[] = [
  {
    title: 'No CLI commands exist yet',
    detail:
      'vinaya-cli-v1 is entirely undispatched — all seven tasks (init, check, doctor, upgrade, eject, waiver, pr/issue writes) are open with no code merged. There is no apps/vinaya/cli in this repo today.',
    source: 'Verified: milestone vinaya-cli-v1, issues #381–#387, all open, 0 closed (checked 2026-07-08).'
  },
  {
    title: 'Vinaya Studio is local-only for v1.0',
    detail:
      'Studio renders check output on your own machine. There is no deployed or hosted Studio instance, and no committed date for one — a hosted, read-only instance is a future phase with no timeline beyond "deferred."',
    source: 'Verified against D-101 (Studio deployment roadmap) — Phase 1 is local-only; Phase 3 is undated.'
  },
  {
    title: 'No Windows support',
    detail: 'v1.0 targets macOS and Linux only. Windows support is deferred, with no committed ship date.',
    source: 'Verified against D-104 (v1.0 scope) — Node ≥ 20, macOS + Linux; Windows explicitly deferred.'
  },
  {
    title: 'No editor extension',
    detail:
      'The only way to use Vinaya is the CLI (once it exists). There is no VS Code, JetBrains, or other editor plugin planned for v1.0.',
    source: 'Verified against D-086 (Vinaya surfaces) — no editor extension in scope.'
  },
  {
    title: 'No GitHub App / org-wide install',
    detail:
      "Vinaya acts through your own git and gh credentials — it does not install as a GitHub App, and there's no one-click, org-wide rollout.",
    source: 'Verified against D-086 (Vinaya surfaces) — GitHub App install is deferred.'
  }
]

export default function KnownLimitsPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Known Limits
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          An honest list of what Vinaya genuinely doesn&rsquo;t do yet. Every claim below is checked against this
          repo&rsquo;s current state, not assumed from a roadmap.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        {KNOWN_LIMITS.map((limit) => (
          <Card key={limit.title} className='border-border bg-card'>
            <CardContent className='flex flex-col gap-2 p-6'>
              <Heading level={3} className='font-serif text-lg text-card-foreground'>
                {limit.title}
              </Heading>
              <Text size='sm' className='font-sans text-card-foreground'>
                {limit.detail}
              </Text>
              <Text size='xs' className='font-mono text-muted-foreground'>
                {limit.source}
              </Text>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className='border-t border-border pt-10'>
        <Link href='/' className='inline-flex items-center gap-1 text-sm text-foreground hover:text-accent'>
          <ArrowLeft className='h-3.5 w-3.5' />
          Back to Vinaya
        </Link>
      </section>
    </main>
  )
}
