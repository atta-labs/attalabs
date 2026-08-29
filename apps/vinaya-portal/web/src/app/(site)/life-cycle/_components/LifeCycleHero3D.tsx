'use client'

import { Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { useEffect, useRef } from 'react'
import s from './hero-motion.module.css'

// The scroll-driven 3D hero. Two rules hold throughout:
//
//   1. React owns the DOM; the three.js module owns the canvas and the label
//      layer. Nothing in the frame loop touches React state — a re-render here
//      would cost a frame, and there is nothing for React to re-render.
//   2. Every style is a Tailwind utility. The one exception is the `--hp`
//      scroll interpolations in hero-motion.module.css (see that file for why).
//
// There is no header here. `(site)/layout.tsx` already renders the real global
// TopBar above every route, and the sticky pane below starts underneath it — the
// design mock hand-rolled a topbar only so it could open standalone in a browser.

const ALTITUDES = [
  {
    no: '01',
    name: 'Milestone',
    body: 'A milestone names the outcome and the tranches that get there. It reads their status and nothing else.',
    stages: ['planned', 'active', 'complete']
  },
  {
    no: '02',
    name: 'Tranche',
    body: 'A tranche is an ordered set of tasks. It dispatches them one at a time and holds the line when one is blocked.',
    stages: ['dispatched', 'in flight', 'merged', 'blocked']
  },
  {
    no: '03',
    name: 'Task',
    body: 'A task is one pull request. Review and security run as branches; neither verify nor merge happens until review comes back green.',
    stages: ['brief', 'develop', 'review', 'security', 'verify', 'merge']
  }
] as const

type LabelTone = 'ink' | 'muted' | 'merged'
type LabelShape = 'tiny' | 'chip' | 'title'

// The scene creates its own label spans, so their classes are authored HERE and
// passed in: Tailwind v4's @source globs (packages/ui/styles/globals.css) cover
// `.ts`/`.tsx` only, so a utility string written inside the `.js` scene module
// generates no CSS at all and the label renders unstyled with nothing thrown.
//
// Composed per variant rather than base-plus-override on purpose — two competing
// text-size or text-colour utilities in one class attribute are resolved by
// stylesheet order, not by the order they happen to be written in.
const LBL_BASE = 'absolute left-0 top-0 whitespace-nowrap opacity-0 transition-opacity duration-150 ease-out'
const LBL_SHAPE: Record<LabelShape | 'default', string> = {
  default: 'font-mono text-[0.625rem] uppercase tracking-[0.14em]',
  tiny: 'font-mono text-[0.5rem] uppercase tracking-[0.1em]',
  chip: 'font-mono text-[0.6875rem] font-medium normal-case tracking-[0.02em]',
  title: 'font-sans text-[clamp(1.5rem,2.8vw,2.3rem)] font-normal normal-case tracking-[-0.025em]'
}
const LBL_TONE: Record<LabelTone, string> = {
  ink: 'text-foreground',
  muted: 'text-muted-foreground',
  merged: 'text-success'
}

function labelClass(tone: LabelTone, shape?: LabelShape) {
  return `${LBL_BASE} ${LBL_SHAPE[shape ?? 'default']} ${LBL_TONE[tone] ?? LBL_TONE.ink}`
}

export function LifeCycleHero3D() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLParagraphElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const labelLayer = labelsRef.current
    const hero = heroRef.current
    const heroInner = innerRef.current
    const word = wordRef.current
    const readout = readoutRef.current
    if (!(section && canvas && labelLayer && hero && heroInner && word && readout)) return

    let cancelled = false
    let scene: { dispose: () => void } | null = null

    // Imported here rather than at module scope so `three` stays out of the SSR
    // module graph and out of this route's initial chunk — it is not a small
    // dependency for a marketing page, and nothing above the fold needs it.
    import('../_lib/lifecycle-scene').then(({ mountLifecycleScene }) => {
      if (cancelled) return
      scene = mountLifecycleScene({
        canvas,
        labelLayer,
        hero,
        heroInner,
        word,
        readout,
        // Progress comes from this section's own rect, never the document: the
        // app shell scrolls a nested container, so `scrollY` is always 0 here.
        track: section,
        labelClass,
        // `[data-card]` / `[data-tick]` are looked up under this subtree, so a
        // second scene on the page could never claim this one's elements.
        root: section
      })
    })

    // Required, not defensive: App Router remounts on client navigation and
    // StrictMode double-invokes effects in dev. Without this you get two
    // renderers, two rAF loops and a duplicated label layer per visit.
    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [])

  return (
    // The scroll runway. `h-[calc(100dvh-4.5rem)]` on the pinned pane is the same
    // constant LifecycleSection/OwnershipSection pin against — the app shell's
    // content region is the viewport minus the TopBar, never the whole window.
    <section ref={sectionRef} className='relative h-[320dvh] bg-background text-foreground'>
      <div className='sticky top-0 h-[calc(100dvh-4.5rem)] overflow-hidden'>
        <canvas ref={canvasRef} aria-hidden className='absolute inset-0 z-0 block size-full' />

        {/* Hero copy: rises into a small persistent header, then hands the
            screen over to the in-scene title at the head of the branch. */}
        <div
          ref={heroRef}
          className='pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-start px-6 text-center [--hp:0]'
        >
          <div ref={innerRef} className={`${s.inner} flex flex-col items-center gap-0 will-change-transform`}>
            <Text
              as='p'
              className={`${s.overline} overflow-hidden font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground`}
            >
              three altitudes — three processes
            </Text>
            {/* A plain h1, not Heading: the title's font-size is interpolated off
                `--hp` every frame, and Heading always emits a `text-*` class of its
                own that would race the module rule for the same property. */}
            <h1 className={`${s.title} m-0 max-w-[56rem] font-normal leading-[1.05] tracking-[-0.025em]`}>
              Vinaya&rsquo;s life cycle
            </h1>
            <div
              className={`${s.words} flex justify-center gap-3.5 overflow-hidden font-mono text-lg uppercase tracking-[0.28em]`}
            >
              <span>Plan</span>
              <span className='text-muted-foreground'>·</span>
              <span>Execute</span>
              <span className='text-muted-foreground'>·</span>
              <span>Archive</span>
            </div>
            {/* Per-letter morph is driven by the scene, off the same eased scroll
                value as the camera — see the PR body for why LifeCycleWordFlow
                cannot carry this one. */}
            <p ref={wordRef} className={`${s.word} flex items-center justify-center font-mono text-muted-foreground`} />
          </div>
        </div>

        {/* Altitude captions: one card per tier, cross-faded by the scene. */}
        <div className='absolute bottom-10 left-9 z-[2] w-[min(21rem,34vw)] max-lg:inset-x-5 max-lg:bottom-7 max-lg:w-auto'>
          {ALTITUDES.map((a) => (
            <Card
              key={a.no}
              data-card={a.no}
              className='absolute bottom-0 left-0 w-full bg-background/78 backdrop-blur-sm transition-[opacity,transform] duration-200 ease-out'
            >
              <CardContent>
                <Text as='p' className='m-0 font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-primary'>
                  {a.no} · {a.name}
                </Text>
                <Heading level={2} size='lg' weight='medium' className='mb-[0.4rem] mt-2 tracking-[-0.01em]'>
                  {a.name}
                </Heading>
                <Text as='p' muted className='m-0 text-pretty text-[0.8125rem] leading-[1.55]'>
                  {a.body}
                </Text>
                <div className='mt-[0.7rem] flex flex-wrap gap-x-[0.55rem] gap-y-[0.3rem] font-mono text-[0.625rem] uppercase tracking-[0.1em]'>
                  {a.stages.map((st, i) => (
                    <span key={st}>
                      {st}
                      {i < a.stages.length - 1 && <span className='text-muted-foreground'> ·</span>}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Altitude rail. */}
        <div className='absolute bottom-10 right-9 z-[2] flex flex-col items-end gap-2 max-lg:hidden'>
          <Text
            as='p'
            className='mb-[0.35rem] font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground'
          >
            scroll to descend
          </Text>
          <div className='flex flex-col items-end gap-[0.35rem]'>
            {ALTITUDES.map((a) => (
              <i
                key={a.no}
                data-tick={a.no}
                className='block h-0.5 w-6 bg-border transition-all duration-200 ease-out data-[on=true]:w-10 data-[on=true]:bg-primary'
              />
            ))}
          </div>
          <span ref={readoutRef} className='font-mono text-[0.6875rem] tracking-[0.22em] text-muted-foreground' />
        </div>

        {/* Labels anchored to objects in the scene, positioned per frame. */}
        <div ref={labelsRef} aria-hidden className='pointer-events-none absolute inset-0 z-[2]' />
      </div>
    </section>
  )
}
