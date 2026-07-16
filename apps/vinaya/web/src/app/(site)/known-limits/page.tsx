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
    title: 'No real CLI commands exist yet',
    detail:
      'apps/vinaya/cli exists (vinaya-cli-v1 task 1, #381, merged) but is a help/version router only. The real commands — init, check, doctor, upgrade, eject, waiver, pr/issue writes — remain unbuilt: 5 of 7 vinaya-cli-v1 issues (#383–#387) are still open. Nothing is published — the npm registry has no `vinaya` or `@vinaya/cli` package.',
    source:
      'Verified 2026-07-16: apps/vinaya/cli/src/index.ts (help/version only, no other cases); gh issue view 381,382 → CLOSED, 383–387 → OPEN; npm view vinaya and npm view @vinaya/cli both 404.'
  },
  {
    title: 'Vinaya Studio is local-only, not deployed',
    detail:
      '/studio is live in this app (vinaya-studio-v1 task 1, #388/#493) — a dashboard rendering derived governance state. It is local-only for v1.0: no deployed or hosted instance, and no committed date for one beyond "deferred."',
    source:
      'Verified 2026-07-16: apps/vinaya/web/src/app/studio/** live (layout.tsx, page.tsx, backlog/docs/iterations/projects). Cited against D-101 (Studio deployment roadmap) — Status: PENDING, not yet ratified — Phase 1 (v1.0) local-only, Phase 3 (deployed) deferred.'
  },
  {
    title: 'No Windows support',
    detail: 'v1.0 targets macOS and Linux only. Windows support is deferred, with no committed ship date.',
    source:
      'Verified 2026-07-16 against D-104 (v1.0 scope) — Status: PENDING, not yet ratified — "TypeScript, Node ≥ 20, macOS + Linux; Windows deferred and documented."'
  },
  {
    title: 'No editor extension',
    detail:
      'The only way to use Vinaya is the CLI (once it exists). There is no VS Code, JetBrains, or other editor plugin planned for v1.0.',
    source:
      'Verified 2026-07-16: no editor-extension code exists anywhere in this repo. Cited against D-086 (Vinaya surfaces) — Status: PENDING, not yet ratified — "No editor extension."'
  },
  {
    title: 'No GitHub App / org-wide install',
    detail:
      "Vinaya acts through your own git and gh credentials — it does not install as a GitHub App, and there's no one-click, org-wide rollout.",
    source:
      'Verified 2026-07-16: no GitHub App manifest or integration exists in this repo. Cited against D-086 (Vinaya surfaces) — Status: PENDING, not yet ratified — GitHub App for deployed Studio/org installs is deferred.'
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
