import { Button, Code } from '@atta/ui/components'
import { Footer } from '@atta/ui/footer'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EnergyFieldBg } from '../_components/EnergyFieldBg'
import { ScrollButton } from '../_components/ScrollButton'
import { HeroFabric } from '../_components/hero-canvas/HeroFabric'
import { StudioSection } from './_components/StudioSection'
import { StudioShot } from './_components/StudioShot'

export const metadata: Metadata = {
  title: 'The Studio · Vinaya',
  description:
    'Vinaya Studio is the live view of the harness — every project, every tranche, every task, status derived from GitHub on request. See what it looks like, view by view.'
}

// Real, committed screenshots of local Studio (public/studio/*.png) — one per surface, all
// captured the same width in the app's own default colour scheme. See StudioShot for the
// framing that makes a single-theme capture read correctly under either viewer scheme.
const SECTIONS = [
  {
    id: 'dashboard',
    eyebrow: 'THE DASHBOARD',
    heading: 'Everything in flight, on one screen.',
    body: 'Your projects, your active tranches, and one work surface holding every task that is ready to pick up, already moving, in review, or blocked — plus the backlog. Filter by status; every row links to its GitHub Issue and to the board it belongs to.',
    shot: {
      src: '/studio/dashboard.png',
      alt: 'Vinaya Studio dashboard showing Projects and Tranches preview cards and the Tasks card with its status filter chips',
      caption: '/studio'
    }
  },
  {
    id: 'projects',
    eyebrow: 'PROJECTS',
    heading: 'Your repo, as the harness sees it.',
    body: 'The project registry, read from your own repo. Each project carries where its code lives, where its specs live, and where its state is tracked. Pick one to see only its tranches.',
    shot: {
      src: '/studio/projects.png',
      alt: 'Vinaya Studio Projects page showing the project cards grid',
      caption: '/studio/projects'
    }
  },
  {
    id: 'tranches',
    eyebrow: 'TRANCHES',
    heading: 'Follow every batch of work, active and archived.',
    body: 'Active tranches come from open GitHub Milestones, archived ones from closed Milestones. Each card shows the projects it spans and how far it has got — done, active, still to do, and how many tasks are blocked.',
    shot: {
      src: '/studio/tranches.png',
      alt: 'Vinaya Studio Tranches page showing the Active and Archived tabs with several tranche progress cards',
      caption: '/studio/tranches'
    }
  },
  {
    id: 'board',
    eyebrow: 'THE TRANCHE BOARD',
    heading: 'The topology of a batch, not a to-do list.',
    body: 'Every task in the tranche with its derived status, the Issue behind it, the projects it touches, what it depends on, and what it conflicts with. The header says whether the tranche is active, ready to archive, or archived. A coherence check runs on demand and lists what no longer agrees.',
    shot: {
      src: '/studio/tranche-board.png',
      alt: 'Vinaya Studio tranche board Tasks tab showing the tasks table with status badges, Project(s), Deps, and Conflicts columns',
      caption: '/studio/projects/vinaya/tranches/vinaya-pages-v2'
    }
  },
  {
    id: 'task',
    eyebrow: 'A SINGLE TASK',
    heading: 'Every task carries its own record.',
    body: 'One page per task: its derived status, the Issue it was planned as, and the pull request that answers it — the reasoning that produced the work, kept next to the work.',
    shot: {
      src: '/studio/task.png',
      alt: "Vinaya Studio task page showing a task's status, its GitHub Issue, and its merged pull request",
      caption: '/studio/projects/vinaya/tranches/vinaya-pages-v2/tasks/1'
    }
  },
  {
    id: 'ledger',
    eyebrow: 'TOKEN LEDGER',
    heading: 'See what the work actually cost.',
    body: 'Tokens and dollars per task, totalled for the tranche — read from what each pull request reported, not estimated after the fact.',
    shot: {
      src: '/studio/token-ledger.png',
      alt: 'Vinaya Studio Token Ledger tab showing per-task token and cost rows and the tranche total',
      caption: '/studio/projects/vinaya/tranches/vinaya-pages-v2 — Token Ledger'
    }
  },
  {
    id: 'backlog',
    eyebrow: 'BACKLOG',
    heading: 'Nothing quietly falls out of the system.',
    body: 'Every open Issue that belongs to no tranche, filterable by project, tier and flags. And when GitHub cannot be reached, Studio says so — it never shows you an empty list that looks like good news.',
    shot: {
      src: '/studio/backlog.png',
      alt: 'Vinaya Studio Backlog page showing the Project, Tier, and Flags filter chips and the backlog table',
      caption: '/studio/backlog'
    }
  }
] as const

const CLOSING_LINKS = [
  { label: 'The CLI', href: '/cli' },
  { label: 'The rulebook', href: '/docs' },
  { label: 'Studio on the web', href: '/roadmap' }
] as const

export default function TheStudioPage() {
  return (
    <>
      <section className='relative flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-6 overflow-hidden px-6 py-8 text-center'>
        <HeroFabric />
        <EnergyFieldBg showGrid={false} />
        <div className='relative z-10 flex w-full flex-col items-center gap-6'>
          <div className='flex flex-col items-center gap-4'>
            <Text as='span' className='font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary'>
              VINAYA STUDIO
            </Text>
            <Heading
              level={1}
              className='max-w-[900px] text-balance font-sans text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl'
            >
              See your state machine at any time.
            </Heading>
            <Text className='max-w-[680px] text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
              Studio is the live view of the harness. Every project, every tranche, every task — status derived from
              GitHub the moment you ask it, never stored, never stale. Follow the state of all your work while it moves.
            </Text>
            <Text as='span' className='max-w-[560px] text-balance font-sans text-sm text-muted-foreground'>
              Local for v1.0. <Code>vinaya studio</Code> boots it against the repo you are standing in, using your own
              GitHub credentials.
            </Text>
          </div>
          <ScrollButton targetId='dashboard'>See the dashboard</ScrollButton>
        </div>
      </section>

      {SECTIONS.map((section) => (
        <StudioSection
          key={section.id}
          id={section.id}
          eyebrow={section.eyebrow}
          heading={section.heading}
          body={section.body}
          shot={
            <StudioShot
              src={section.shot.src}
              alt={section.shot.alt}
              caption={section.shot.caption}
              width={1600}
              height={1100}
            />
          }
        />
      ))}

      <section className='flex w-full flex-col items-center gap-8 px-6 py-20 text-center'>
        <div className='flex flex-col items-center gap-4'>
          <Heading
            level={2}
            className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl'
          >
            Run it on your own repo.
          </Heading>
          <Text className='max-w-[620px] text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
            Studio runs locally today, against the repo in front of you. Install the CLI and start it with{' '}
            <Code>vinaya studio</Code>.
          </Text>
        </div>
        <div className='flex flex-wrap items-center justify-center gap-4'>
          {CLOSING_LINKS.map((link) => (
            <Button key={link.href} asChild size='lg' variant='outline'>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </section>

      <Footer
        product='vinaya'
        tagline='Execution governance for software teams'
        links={[
          { label: 'The Harness', href: '/the-harness' },
          { label: 'Studio', href: '/the-studio' },
          { label: 'Start', href: '/start' },
          { label: 'CLI', href: '/cli' },
          { label: 'Docs', href: '/docs' }
        ]}
      />
    </>
  )
}
