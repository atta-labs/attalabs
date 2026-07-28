import { Card, CardContent, Code } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AgentPromptBlock } from './_components/AgentPromptBlock'
import { CommandLine } from './_components/CommandLine'
import { GateRefusalDemo } from './_components/GateRefusalDemo'
import { PackageManagerTabs } from './_components/PackageManagerTabs'

export const metadata: Metadata = {
  title: 'Quick Start · Vinaya'
}

// The step prose below is authored with backtick-delimited spans (the
// convention every other doc on this site writes in) but this page renders
// no markdown — plain `Text` would print the backticks as literal characters
// instead of styling them. This splits on `` ` `` and wraps the odd segments
// in `Code`, the same chip `DocPage`'s markdown pipeline produces for inline
// code, without pulling in `react-markdown` for five paragraphs of prose.
function renderProse(paragraph: string): ReactNode[] {
  return paragraph.split('`').map((segment, index) =>
    index % 2 === 1 ? (
      <Code key={index} className='mx-0.5'>
        {segment}
      </Code>
    ) : (
      segment
    )
  )
}

// Hand-authored product page — five fixed steps, deliberately NOT derived
// from forge state, matching `roadmap/page.tsx`'s reasoning exactly: a forge
// query spawns a `gh` subprocess, which 500s in prod on Vercel. This route
// has no forge dependency and cannot fail that way.
//
// Step order is fixed at five, no more and no fewer (Issue #682): install,
// govern, watch a gate fire, point an agent at it, watch it run.
const STEPS: { number: number; title: string; body: string[]; render: () => ReactNode }[] = [
  {
    number: 1,
    title: 'Install',
    body: [
      'Pick your package manager. Each command installs Vinaya and runs `init` in the same breath — nothing lands on your machine ahead of time, and nothing touches your repo until you confirm the diff in the next step.'
    ],
    render: () => (
      <PackageManagerTabs
        commands={{
          npm: 'npx vinaya init',
          pnpm: 'pnpm dlx vinaya init',
          yarn: 'yarn dlx vinaya init',
          bun: 'bunx vinaya init'
        }}
      />
    )
  },
  {
    number: 2,
    title: 'Govern your repo',
    body: [
      "`vinaya init` is the product's signature moment. It reads your repo, prints the complete diff of every file it intends to add or change — the CI workflow, the git-hook blocks, `vinaya.config.json`, the labels — and waits. Nothing is written until you say yes.",
      'Not ready to commit? `vinaya init --dry-run` prints that same diff and installs nothing at all.'
    ],
    render: () => <CommandLine command='vinaya init' />
  },
  {
    number: 3,
    title: 'Watch a gate fire',
    body: [
      "`vinaya check --all` runs every registered gate — the same gates that sit in front of every pull request. On a clean tree it's fast and quiet. Break a rule it cares about and it doesn't warn: it refuses, names the exact rule, and stops you before a human ever sees the mistake.",
      "Below is a real refusal, shown twice: once the way you'd read it in a terminal, and once the way a coding agent reads it — the `agent_recovery_prompt` field is what turns a wall of red text into a fixable instruction."
    ],
    render: () => <GateRefusalDemo />
  },
  {
    number: 4,
    title: 'Point your agent at it',
    body: [
      "Copy this straight into your coding agent. It's written as instructions to the agent, not to you — paste it into a fresh session pointed at your repo, and it becomes the agent's own plan for how to work under Vinaya.",
      'The prompt asks your agent to read `VINAYA.md` and `vinaya.config.json` — the two files `init` actually wrote into your repo root. `VINAYA.md` points at the full doctrine, which ships as versioned reference content inside the `vinaya` package itself; `vinaya.config.json` is the ruleset every gate enforces.',
      'From there the loop repeats: plan a tranche, brief the task, work it in a worktree, open a pull request — and `vinaya check --all` has to pass before that PR is real.'
    ],
    render: () => <AgentPromptBlock />
  },
  {
    number: 5,
    title: 'Watch it run',
    body: [
      '`vinaya studio` opens a live view of everything above — tasks moving through the loop, gates passing or refusing, an agent at work — with no status file anywhere to go stale. What you see is derived from the forge in real time, the same way every check above was.'
    ],
    render: () => <CommandLine command='vinaya studio' />
  }
]

export default function QuickStartPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Quick Start
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Five steps from nothing to a governed repo with an agent working inside it.
        </Text>
      </section>

      <section className='flex flex-col gap-8'>
        {STEPS.map((step) => (
          <div key={step.number} className='flex flex-col gap-3'>
            <Flex align='center' gap={4}>
              <Flex
                align='center'
                justify='center'
                className='size-10 shrink-0 rounded-md border border-border bg-accent font-serif text-lg text-accent-foreground'
              >
                {step.number}
              </Flex>
              <Heading level={2} className='font-serif text-xl font-normal text-foreground'>
                {step.title}
              </Heading>
            </Flex>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                {step.body.map((paragraph) => (
                  <Text key={paragraph} as='p' className='font-sans text-sm text-muted-foreground'>
                    {renderProse(paragraph)}
                  </Text>
                ))}
                {step.render()}
              </CardContent>
            </Card>
          </div>
        ))}
      </section>
    </main>
  )
}
