import { Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roadmap · Vinaya'
}

// Pure static product page — five hand-authored roadmap items. Deliberately
// NOT derived from forge state (`listIterations()` / Milestones): that spawns
// `gh` subprocesses which 500 in prod on Vercel, the same reason `studio/*`
// pages `notFound()` there. This page must render statically everywhere, so the
// content lives here as data, not as a forge query.
const ROADMAP: { title: string; body: string }[] = [
  {
    title: 'Loop Engineering',
    body: 'An optional external driver that runs the dispatch → verify → merge cycle for you. It sits on top of the harness, reads Vinaya’s task state, and advances work on its own — while you keep the go/no-go calls. Ships in rings: self-correction is live today, the full task loop comes next.'
  },
  {
    title: 'Studio on the web',
    body: 'Vinaya Studio runs deployed, not just on your machine. Anyone can connect over the web — product folks, reviewers, non-coders — and watch the harness state live. The whole team sees what’s building, without cloning a repo or touching a terminal.'
  },
  {
    title: 'Linear & Jira support',
    body: 'A service layer that holds the issue state machine in Linear or Jira, not just GitHub. Same labels, same flow — Vinaya reads and edits issues wherever your team already tracks them. Bring the harness to your board instead of moving your board to the harness.'
  },
  {
    title: 'Configurable forge',
    body: 'Today Vinaya’s security gates — rationale checks, doc-coupling, scope guards — are always on. This adds a vinaya.settings.json where you switch each check on or off, at any level: whole repo, a project, or a single task. Loosen the gates on a throwaway repo, keep them strict on production.'
  },
  {
    title: 'Override roles',
    body: 'Vinaya ships fixed agent roles — Developer, Reviewer, and the rest — each with baked-in skills. This lets you pass your own: swap in a custom role, add domain skills, or override how an existing role behaves. The harness stays the same; the agents inside it become yours to shape.'
  }
]

export default function RoadmapPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Roadmap
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Where the harness is heading. Each item ships when it earns its place — no dates, just direction.
        </Text>
      </section>

      <section className='flex flex-col gap-6'>
        {ROADMAP.map((item) => (
          <Card key={item.title} className='border-border bg-card'>
            <CardContent className='space-y-3 pt-6'>
              <Heading level={2} className='font-serif text-xl text-foreground'>
                {item.title}
              </Heading>
              <Text as='p' className='font-sans text-sm text-muted-foreground'>
                {item.body}
              </Text>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
