import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BoardMark, GatesMark, LoopMark, RolesMark, StudioWebMark } from './_components/RoadmapMarks'

export const metadata: Metadata = {
  title: 'Roadmap · Vinaya'
}

// Hand-authored product page — five roadmap items. Deliberately NOT derived
// from forge state (`listIterations()` / Milestones): that spawns `gh`
// subprocesses which 500 in prod on Vercel, the same reason `studio/*` pages
// `notFound()` there. The content lives here as data, not as a forge query, so
// this route has NO forge dependency and cannot fail that way.
//
// That is a data-source property, not a rendering mode: like every route in
// this app it still builds as `ƒ (Dynamic)`, because the root layout fetches
// CMS config. "No forge dependency" — never "statically prerendered".
// Each item carries its own concept mark (`_components/RoadmapMarks.tsx` — a
// diagram of the feature, not a stock glyph): the cards are long-form prose, and
// a mark per card gives the eye an anchor to scan by instead of five
// identical text blocks. Decorative only (`aria-hidden` lives on the svg) — the
// CardTitle carries the meaning.
const ROADMAP: { title: string; body: string; Mark: (p: { className?: string }) => ReactNode }[] = [
  {
    title: 'Loop Engineering',
    Mark: LoopMark,
    body: 'An optional external driver that runs the dispatch → verify → merge cycle for you. It sits on top of the harness, reads Vinaya’s task state, and advances work on its own — while you keep the go/no-go calls. Ships in rings: self-correction is live today, the full task loop comes next.'
  },
  {
    title: 'Studio on the web',
    Mark: StudioWebMark,
    body: 'Vinaya Studio runs deployed, not just on your machine. Anyone can connect over the web — product folks, reviewers, non-coders — and watch the harness state live. The whole team sees what’s building, without cloning a repo or touching a terminal.'
  },
  {
    title: 'Linear & Jira support',
    Mark: BoardMark,
    body: 'A service layer that holds the issue state machine in Linear or Jira, not just GitHub. Same labels, same flow — Vinaya reads and edits issues wherever your team already tracks them. Bring the harness to your board instead of moving your board to the harness.'
  },
  {
    title: 'Configurable forge',
    Mark: GatesMark,
    body: 'Today Vinaya’s security gates — rationale checks, doc-coupling, scope guards — are always on. This adds a vinaya.settings.json where you switch each check on or off, at any level: whole repo, a project, or a single task. Loosen the gates on a throwaway repo, keep them strict on production.'
  },
  {
    title: 'Configurable roles',
    Mark: RolesMark,
    body: 'Vinaya ships fixed agent roles — Developer, Reviewer, and the rest — each with baked-in skills. This lets you pass your own: swap in a custom role, add domain skills, or override how an existing role behaves. The harness stays the same; the agents inside it become yours to shape.'
  }
]

export default function RoadmapPage() {
  return (
    <main className='mx-auto flex max-w-5xl flex-col gap-10 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Roadmap
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Where the harness is heading. Each item ships when it earns its place — no dates, just direction.
        </Text>
      </section>

      <section className='grid gap-6 sm:grid-cols-2'>
        {ROADMAP.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <Flex align='center' gap={4}>
                <Flex
                  align='center'
                  justify='center'
                  className='size-16 shrink-0 rounded-md border border-border bg-accent text-accent-foreground'
                >
                  <item.Mark className='size-12' />
                </Flex>
                <CardTitle className='font-serif text-xl font-normal text-foreground'>{item.title}</CardTitle>
              </Flex>
            </CardHeader>
            <CardContent>
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
