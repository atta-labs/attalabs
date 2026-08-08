import { Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Flex, Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { ArrowRight, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { getPublishedVersion, type PublishedVersion } from '@/lib/published-version'
import { CommandLine } from '../_components/CommandLine'
import { PackageManagerTabs } from '../_components/PackageManagerTabs'
import { renderProse } from '../_components/prose'

export const metadata: Metadata = {
  title: 'Quick Start · Vinaya'
}

// A step body is a mix of framing prose and, where a step enumerates a set
// (what it writes, what it refuses), a bullet list — a reader scanning for
// "what lands in my repo" gets an answer they can scan, not a sentence they
// have to parse.
type StepBodyItem = { kind: 'prose'; text: string } | { kind: 'list'; items: string[] }

function versionStampText(publishedVersion: PublishedVersion): string {
  return 'version' in publishedVersion
    ? `documented against @attalabs/vinaya@${publishedVersion.version}`
    : 'documented from source — the published package version could not be verified'
}

// Four fixed steps: install / `init` / `init product` / start working. Each of
// the first three names the real files it touches and links onward to `/cli`
// for the full command reference — the CLI page owns command detail, this
// page owns the path. No forge dependency, same reasoning as `/roadmap` and
// `/start`.
const STEPS: {
  number: number
  title: string
  body: StepBodyItem[]
  render: (publishedVersion: PublishedVersion) => ReactNode
  cliHref?: string
}[] = [
  {
    number: 1,
    title: 'Install',
    body: [
      {
        kind: 'prose',
        text: 'Pick your package manager. Each command installs Vinaya and runs `init` in the same breath — nothing lands on your machine ahead of time, and nothing touches your repo until you confirm the diff in the next step.'
      }
    ],
    render: (publishedVersion) => (
      <>
        <PackageManagerTabs
          commands={{
            npm: 'npx @attalabs/vinaya init',
            pnpm: 'pnpm dlx @attalabs/vinaya init',
            yarn: 'yarn dlx @attalabs/vinaya init',
            bun: 'bunx @attalabs/vinaya init'
          }}
        />
        <Text size='sm' muted className='font-sans'>
          {versionStampText(publishedVersion)}
        </Text>
      </>
    )
  },
  {
    number: 2,
    title: 'init',
    body: [
      {
        kind: 'prose',
        text: '`vinaya init` reads your repo, prints the complete diff of every file it intends to add or change, and waits — nothing is written until you say yes. `--dry-run` prints that same diff and installs nothing at all.'
      },
      { kind: 'prose', text: 'It writes exactly five things:' },
      {
        kind: 'list',
        items: [
          '`vinaya.config.json` — a starter ruleset, with `checks` empty',
          "Git hook stubs — `.husky/` if it's present, else raw `.git/hooks`",
          'Two GitHub Actions workflows',
          'A root `VINAYA.md` doctrine pointer',
          'A handful of labels — created only if they do not already exist'
        ]
      },
      {
        kind: 'prose',
        text: 'A file `init` did not create is never overwritten; a pre-existing hook keeps its own lines and gets an appended block instead.'
      }
    ],
    render: () => <CommandLine command='vinaya init' />,
    cliHref: '/cli#command-init'
  },
  {
    number: 3,
    title: 'init product',
    body: [
      {
        kind: 'prose',
        text: 'Working in a monorepo with more than one governed area? `vinaya init product <name>` extends an already-initialized repo with one more — it creates a single `project:<name>` label, create-if-absent, under the same diff-and-confirm contract as `init` itself. It refuses if `init` has not run yet.'
      }
    ],
    render: () => <CommandLine command='vinaya init product <name>' />,
    cliHref: '/cli#command-init-product'
  },
  {
    number: 4,
    title: 'Start working',
    body: [
      {
        kind: 'prose',
        text: "Connect whatever agentic coding tool you already use — Claude Code, Codex, Antigravity, or another — to this repo, and build your first feature. Vinaya doesn't care which tool; it cares that `vinaya check --all` passes before anything merges."
      },
      { kind: 'prose', text: 'What that actually looks like, stage by stage, is the rest of this section.' }
    ],
    render: () => null
  }
]

export default async function StartQuickPage() {
  const publishedVersion = await getPublishedVersion()

  return (
    <article className='flex flex-col gap-10'>
      <header className='flex flex-col gap-3'>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          Quick Start
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          Four steps from nothing to a governed repo with an agent working inside it.
        </Text>
      </header>

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
                {step.cliHref ? (
                  <NextLink
                    href={step.cliHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    variant='unstyled'
                    className='group inline-flex items-center gap-1.5 hover:text-primary'
                  >
                    <span>{step.title}</span>
                    <ExternalLink className='size-4 text-muted-foreground transition-colors group-hover:text-primary' />
                  </NextLink>
                ) : (
                  step.title
                )}
              </Heading>
            </Flex>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                {step.body.map((item, index) =>
                  item.kind === 'list' ? (
                    <ul key={index} className='list-disc space-y-1 pl-5 font-sans text-base text-foreground'>
                      {item.items.map((listItem) => (
                        <li key={listItem} className='leading-relaxed'>
                          {renderProse(listItem)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text key={item.text} as='p' className='font-sans text-base leading-relaxed text-foreground'>
                      {renderProse(item.text)}
                    </Text>
                  )
                )}
                {step.render(publishedVersion)}
              </CardContent>
            </Card>
          </div>
        ))}
      </section>

      <NextLink
        href='/start/plan'
        variant='unstyled'
        className='inline-flex w-fit items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
      >
        <span>Continue to Ship with Vinaya</span>
        <ArrowRight className='size-3.5' />
      </NextLink>
    </article>
  )
}
