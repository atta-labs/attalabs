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

// Four fixed steps covering the whole ownership arc: `quickstart` (in),
// `upgrade` (staying current), `doctrine` (handing your agent the operating
// model), `eject` (out). Each links onward to `/docs/cli` for the full command
// reference — the CLI page owns command detail, this page owns the path. No
// forge dependency, same reasoning as `/roadmap` and `/start`.
const STEPS: {
  number: number
  title: string
  body: StepBodyItem[]
  render: (publishedVersion: PublishedVersion) => ReactNode
  cliHref?: string
}[] = [
  {
    number: 1,
    title: 'Run quickstart',
    body: [
      {
        kind: 'prose',
        text: 'Pick your package manager. Each command installs Vinaya and launches `quickstart` in the same breath — the guided wizard that walks the whole install with a Y/n prompt between every step. Nothing lands on your machine ahead of time, and nothing touches your repo until you confirm the diff it prints.'
      },
      {
        kind: 'prose',
        text: 'The wizard runs `init`, offers to bind doc-owners pairs and register tracked projects (`init product`), commits the install, proves the gates actually work with `demo break`, runs `doctor`, and pushes. Declining a prompt skips only that step. `init` itself writes exactly five things:'
      },
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
    render: (publishedVersion) => (
      <>
        <PackageManagerTabs
          commands={{
            npm: 'npx @attalabs/vinaya quickstart',
            pnpm: 'pnpm dlx @attalabs/vinaya quickstart',
            yarn: 'yarn dlx @attalabs/vinaya quickstart',
            bun: 'bunx @attalabs/vinaya quickstart'
          }}
        />
        <Text size='sm' muted className='font-sans'>
          {versionStampText(publishedVersion)}
        </Text>
      </>
    ),
    cliHref: '/docs/cli#command-quickstart'
  },
  {
    number: 2,
    title: 'Upgrade when a release lands',
    body: [
      {
        kind: 'prose',
        text: 'New Vinaya versions arrive out of the blue — you never have to watch for them. Whenever one does, `vinaya upgrade` regenerates every vinaya-owned artifact (hooks, workflows, the managed block in your config) to the current contract version, under the same diff-and-confirm flow as `init`: it prints the full diff and waits for your yes.'
      },
      {
        kind: 'prose',
        text: 'Everything you own — your `checks`, your doc-owners bindings, your project registry — is left untouched. `--dry-run` prints the diff and changes nothing; `vinaya doctor` tells you at any time whether your installed artifacts have drifted from the contract.'
      }
    ],
    render: () => <CommandLine command='npx @attalabs/vinaya@latest upgrade' />,
    cliHref: '/docs/cli#command-upgrade'
  },
  {
    number: 3,
    title: 'Hand your agent the doctrine',
    body: [
      {
        kind: 'prose',
        text: 'Vinaya ships the operating model as skills your agent reads, bundled inside the installed package. `vinaya doctrine` prints the absolute path of the front door on this machine — so `cat "$(vinaya doctrine)"` opens it anywhere, at any version, and the committed `VINAYA.md` pointer tells every cold agent that command exists.'
      },
      {
        kind: 'prose',
        text: 'Three skills live behind that front door:'
      },
      {
        kind: 'list',
        items: [
          '`aeg` — the operating model itself: truth domains, dispatch gates, the tranche topology',
          '`aeg-roles` — the accountable roles and which role doc an agent loads next',
          '`brief-authoring` — how task briefs for Developer agents are written'
        ]
      },
      {
        kind: 'prose',
        text: "Point whatever agentic coding tool you use — Claude Code, Codex, Antigravity, or another — at the front door and it works inside the model. Vinaya doesn't care which tool; it cares that `vinaya check --all` passes before anything merges."
      }
    ],
    render: () => <CommandLine command='cat "$(vinaya doctrine)"' />,
    cliHref: '/docs/cli#command-doctrine'
  },
  {
    number: 4,
    title: 'Eject any time',
    body: [
      {
        kind: 'prose',
        text: 'Vinaya is easy to unplug. `vinaya eject` removes every artifact the install wrote — reversing the `managed` ownership block exactly — and restores the repo to stock, under the same diff-and-confirm flow: full removal diff first, nothing removed until you say yes. `--dry-run` shows the diff without touching anything.'
      },
      {
        kind: 'prose',
        text: 'Your own content survives: custom check scripts, doc-owners bindings, and the project registry are your declared data, not scaffolding, and `eject` leaves them alone.'
      }
    ],
    render: () => <CommandLine command='vinaya eject' />,
    cliHref: '/docs/cli#command-eject'
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
          One command in, one command out — install, stay current, hand your agent the doctrine, unplug any time.
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
        href='/life-cycle'
        variant='unstyled'
        className='inline-flex w-fit items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
      >
        <span>Continue to the Lifecycle</span>
        <ArrowRight className='size-3.5' />
      </NextLink>
    </article>
  )
}
