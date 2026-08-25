'use client'

import { Badge, Card, CardContent, CardHeader, CodeBlock } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { Check, Circle, GitPullRequest, List, Milestone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LetterReveal } from '../LetterReveal'
import { SectionOverline, SectionTitle } from './SectionHeading'

function DocCardHeader({
  icon: Icon,
  title,
  subtitle,
  badge
}: {
  icon: typeof Milestone
  title: string
  subtitle?: string
  badge: string
}) {
  return (
    <CardHeader className='flex-row items-center gap-2.5 border-b border-border px-4 py-3'>
      <Icon className='size-4 shrink-0 text-muted-foreground' />
      <span className='font-mono text-sm'>
        {title} {subtitle && <span className='text-muted-foreground'>{subtitle}</span>}
      </span>
      <Badge variant='outline' className='ml-auto shrink-0 font-mono text-[0.625rem] text-muted-foreground'>
        {badge}
      </Badge>
    </CardHeader>
  )
}

const MILESTONE_TASKS = [
  { id: '#471', label: 'cart line-items', done: true },
  { id: '#472', label: 'tax rules', done: true },
  { id: '#473', label: 'payment retry', done: false }
] as const

function MilestoneDoc() {
  return (
    <Card className='mx-auto w-full max-w-sm shadow-none'>
      <DocCardHeader icon={Milestone} title='Checkout rework' badge='3 tasks' />
      <CardContent className='px-4 py-4'>
        <Text className='text-[0.8125rem] leading-relaxed text-muted-foreground'>
          Scoped before a line of code — issues you can read and argue with while changing them is still cheap.
        </Text>
        <div className='mt-3.5 flex gap-4 font-mono text-[0.6875rem] text-muted-foreground'>
          <span>
            opened <span className='font-semibold text-foreground'>Aug 2</span>
          </span>
          <span>
            due <span className='font-semibold text-foreground'>Aug 16</span>
          </span>
        </div>
        <div className='mt-3.5 flex flex-col gap-1.5'>
          {MILESTONE_TASKS.map((task) => (
            <div key={task.id} className='flex items-center gap-2 font-mono text-xs'>
              {task.done ? (
                <Check className='size-3.5 shrink-0 text-success' />
              ) : (
                <Circle className='size-3.5 shrink-0 text-muted-foreground' />
              )}
              {task.id} <span className='text-muted-foreground'>{task.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const PR_FILES = [
  { name: 'payment/retry.ts', add: 3, rem: 1 },
  { name: 'payment/retry.test.ts', add: 2, rem: 0 },
  { name: 'webhook/handler.ts', add: 1, rem: 2 },
  { name: 'webhook/handler.test.ts', add: 1, rem: 0 },
  { name: 'CHANGELOG.md', add: 1, rem: 0 }
] as const

function DiffBar({ add, rem }: { add: number; rem: number }) {
  return (
    <span className='ml-auto flex shrink-0 gap-0.5'>
      {Array.from({ length: add }, (_, i) => (
        <span key={`add-${i}`} className='h-2.5 w-1 rounded-sm bg-success' />
      ))}
      {Array.from({ length: rem }, (_, i) => (
        <span key={`rem-${i}`} className='h-2.5 w-1 rounded-sm bg-destructive' />
      ))}
    </span>
  )
}

function PullRequestDoc() {
  return (
    <Card className='mx-auto w-full max-w-sm shadow-none'>
      <DocCardHeader icon={GitPullRequest} title='#473' subtitle='payment retry' badge='merged' />
      <CardContent className='px-4 py-4'>
        <Text className='font-mono text-xs text-muted-foreground'>
          5 files changed <span className='font-semibold text-success'>+203</span>{' '}
          <span className='font-semibold text-destructive'>−67</span>
        </Text>
        <div className='mt-3 flex flex-col'>
          {PR_FILES.map((file) => (
            <div
              key={file.name}
              className='flex items-center gap-2.5 border-b border-border py-1.5 font-mono text-[0.6875rem] last:border-b-0'
            >
              <span>{file.name}</span>
              <DiffBar add={file.add} rem={file.rem} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CiDoc() {
  return (
    <Card className='mx-auto w-full max-w-sm shadow-none'>
      <DocCardHeader icon={List} title='.github/workflows/' badge='4 files · vinaya-owned' />
      <CardContent className='px-4 py-4'>
        <Text className='font-mono text-xs text-muted-foreground'>vinaya-checks.yml</Text>
        <CodeBlock className='mt-2.5 bg-transparent p-0 text-[0.6875rem] leading-loose text-muted-foreground'>
          <span className='text-foreground'>checks:</span>
          {'\n  - brief-shape\n  - review-gate\n  - '}
          <span className='text-success'>acme/licence-header</span>
          {'   '}
          <span className='opacity-60'># yours</span>
        </CodeBlock>
        <Text className='mt-3 font-mono text-[0.625rem] leading-relaxed text-muted-foreground'>
          runs alongside <span className='text-foreground'>review.yml · review-verdict.yml · archivist.yml</span> —
          generated once, yours to edit after
        </Text>
      </CardContent>
    </Card>
  )
}

type StageIndex = 0 | 1 | 2

const STAGES = [
  { label: 'Decide first', dim: 'Plan on milestones', Doc: MilestoneDoc },
  { label: 'Review again', dim: 'Small PRs', Doc: PullRequestDoc },
  { label: 'Your CI', dim: 'Your checks', Doc: CiDoc }
] as const

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function OwnershipSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const railFillRef = useRef<HTMLDivElement>(null)
  // phase mirrors the current scroll position, live in both directions —
  // the list and the card track shrink back down scrolling up, same as
  // they grow scrolling down.
  const [phase, setPhase] = useState<StageIndex>(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPhase(2)
      return
    }

    const target = scrollParent(section)
    let animationFrame = 0

    const evaluate = () => {
      animationFrame = 0
      const rect = section.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 800
      // innerWidth reads 0 for a frame before first paint — treat that as
      // "not measured yet" rather than "narrow."
      if (window.innerWidth === 0) return
      if (window.innerWidth < 700) {
        // No pinned runway below 700px — the stack is just plain scroll, so
        // the whole list is legible without the scrub machinery.
        setPhase(2)
        return
      }
      // The section is styled min-[700px]:h-[300dvh] — a real, laid-out
      // measurement is always at least ~2x the viewport. Anything shorter
      // means the 300dvh class hasn't taken effect yet (a pre-layout read).
      if (rect.height < viewportHeight * 2) return
      const travel = Math.max(1, rect.height - (viewportHeight - 64))
      const progress = Math.max(0, Math.min(1, (64 - rect.top) / travel))
      if (railFillRef.current) railFillRef.current.style.width = `${progress * 100}%`
      setPhase(Math.min(2, Math.floor(progress * 3)) as StageIndex)
    }
    // Scroll/resize listeners alone can miss the first crossing when the
    // scroll happens on a nested container this effect attaches to after
    // that scroll already settled — the poll is what actually catches it.
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(evaluate)
    }
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const poll = window.setInterval(queue, 250)
    const resizeObserver = new ResizeObserver(queue)
    resizeObserver.observe(section)
    // Deferred, not called directly: a synchronous first read can land
    // before the browser has applied the 300dvh layout at all, and the
    // height guard above would just discard it anyway.
    queue()
    return () => {
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(poll)
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id='own-your-code'
      className='bg-secondary/70 text-secondary-foreground min-[700px]:h-[300dvh]'
    >
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24 min-[700px]:sticky min-[700px]:top-0 min-[700px]:flex min-[700px]:h-[calc(100dvh-4.5rem)] min-[700px]:items-center min-[700px]:overflow-hidden'>
        <div className='grid w-full gap-12 text-center md:grid-cols-2 md:items-center md:gap-16 md:text-left'>
          <div>
            <SectionOverline className='text-secondary-foreground/65'>what you get back</SectionOverline>
            <SectionTitle className='mt-5'>
              <LetterReveal text='Own your code again' />
            </SectionTitle>
            <div className='mt-6 flex flex-col gap-1.5'>
              {STAGES.slice(0, phase + 1).map((stage) => (
                <Text key={stage.label} className='font-serif text-2xl leading-none tracking-tight sm:text-3xl'>
                  <LetterReveal text={stage.label} />{' '}
                  <span className='text-secondary-foreground/65'>
                    <LetterReveal text={stage.dim} delayStepMs={12} />
                  </span>
                </Text>
              ))}
            </div>
          </div>

          <div className='min-w-0'>
            {/* Below 700px this is a plain stacked list — one card per stage,
                no overlap. At 700px+ every card occupies the same grid cell
                and only the current stage's card is at full scale/opacity;
                its neighbors sit scaled down and faded, peeking at the edge
                instead of ever showing two cards at full strength. */}
            <div className='mt-8 flex flex-col gap-6 min-[700px]:grid min-[700px]:overflow-hidden'>
              {STAGES.map(({ label, dim, Doc }, index) => {
                const offset = index - phase
                const position =
                  offset === 0
                    ? 'min-[700px]:z-20 min-[700px]:translate-x-0 min-[700px]:scale-100 min-[700px]:opacity-100'
                    : offset < 0
                      ? 'min-[700px]:z-10 min-[700px]:-translate-x-16 min-[700px]:scale-90 min-[700px]:opacity-30'
                      : 'min-[700px]:z-10 min-[700px]:translate-x-16 min-[700px]:scale-90 min-[700px]:opacity-30'
                return (
                  <div
                    key={label}
                    className={`min-[700px]:col-start-1 min-[700px]:row-start-1 min-[700px]:transition-all min-[700px]:duration-500 min-[700px]:ease-out ${position} ${offset === 0 ? '' : 'min-[700px]:pointer-events-none'}`}
                  >
                    <Text
                      className={`mx-auto mb-3 max-w-sm text-center font-serif text-xl leading-snug tracking-tight transition-opacity duration-300 sm:text-2xl ${offset === 0 ? 'min-[700px]:opacity-100' : 'min-[700px]:opacity-0'}`}
                    >
                      {label} <span className='text-secondary-foreground/65'>{dim}</span>
                    </Text>
                    <Doc />
                  </div>
                )
              })}
            </div>

            <div className='mt-6 h-1 overflow-hidden rounded-full bg-secondary-foreground/15'>
              <div ref={railFillRef} className='h-full rounded-full bg-secondary-foreground/65' />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
