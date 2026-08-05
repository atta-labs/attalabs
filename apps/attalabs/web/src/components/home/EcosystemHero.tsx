'use client'

// AttaLabs' home — four full-height sections, one per mark, scrolled through in order:
// Vāda → Herald → Vinaya → Atta Engine (products first, infrastructure last — the Engine has
// no product page, so it closes the sequence).
//
// EVERY mark is the product's own real, shared canvas component — not a redrawn
// approximation:
//   Vāda    — a team of three AIAgents (the same AIASphere Vāda's own home uses), each with
//             a different real Vāda agent face: lead centred, two flanking behind.
//   Herald  — AIASphere carrying Herald's real brand logo from Sanity.
//   Vinaya  — HarnessRing, the harness ported from Vinaya's own hero.
//   Engine  — plan nodes converging through a funnel into one execution node, with a
//               slow gear ring behind it as texture (EngineMark).
// No particle streams between marks and no shockwave pulses — each mark just arrives.
//
// Every PRIMARY mark is exactly MARK_SIZE across so the four sections carry identical visual
// weight. Flanking marks are deliberately smaller and set behind, so the trios read as one
// composition rather than four more equal elements.
//
// Two columns: the mark and its name on the left, the stack on the right. All four sections
// share ONE fixed fabric layer behind them, so the texture is continuous across boundaries
// and the cursor lights it wherever the pointer goes. A separate vertical timeline runs
// through the mark column, linking the four animations down the page.
//
// Each section reveals once, on first scroll-into-view, and never re-triggers.

import {
  AIAgent,
  AIASphere,
  EngineMark,
  HarnessRing,
  HeraldLogoMark,
  HeroFabric,
  VadaFace,
  VadaFaceAdvocate,
  VadaFaceCritic
} from '@atta/ui/canvas'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Logo, Text } from '@atta/ui/shared'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'

/** Every primary mark renders at this diameter, so all four sections weigh the same. */
const MARK_SIZE = 240
/**
 * Vāda's lead agent, Herald's sphere, Vinaya's harness and the Engine's gear are all exactly
 * MARK_SIZE across — no mark is a step smaller than another, including the lead of the trio.
 */
const VADA_LEAD = MARK_SIZE
/** Flanking marks in Vāda's agent trio — smaller, and set behind the lead. */
const FLANK_LARGE = Math.round(VADA_LEAD * 0.6)
/**
 * Horizontal offset for a flanking mark, measured centre-to-centre. Derived from the two
 * radii plus a small negative overlap so the flank tucks *behind* the lead's edge rather
 * than colliding with its face — an offset smaller than `leadRadius + flankRadius` would
 * push the two illustrations on top of each other.
 */
const flankOffset = (flankSize: number, overlap = 0.34) =>
  Math.round(VADA_LEAD / 2 + flankSize / 2 - flankSize * overlap)

/**
 * The Vāda trio at rest: one quiet colour for all three, so the sleeping team reads as a
 * single silhouette. `muted-foreground` is the doctrine's "quiet ink" against `background`,
 * so it holds in both colour schemes.
 */
const VADA_TRIO_RESTING = 'var(--muted-foreground)'

/**
 * …and awake: each agent takes back its own identity hue the moment the timeline's head
 * reaches the trio. Colour arriving IS the reaction — the team is anonymous until the thread
 * touches it, then resolves into three distinct roles.
 */
const VADA_AGENT_COLORS = {
  strategist: 'var(--agent-strategist)',
  critic: 'var(--agent-critic)',
  advocate: 'var(--agent-devils-advocate)'
} as const

/**
 * Per-section stacks. Every name below was checked against the real dependency graph before
 * being listed — Langfuse, Mastra, PostHog, Sentry and OpenTelemetry are deliberately absent
 * because this repo does not use them. On a portfolio a wrong claim costs more than a short list.
 */
const VADA_STACK: SectionStack = {
  groups: [
    { label: 'Agents', items: ['LangGraph', 'Vercel AI SDK', 'MCP server'] },
    { label: 'Models', items: ['Anthropic', 'OpenAI', 'Google', 'Groq', 'OpenRouter', 'Ollama'] },
    { label: 'Data', items: ['Neon Postgres', 'Drizzle ORM'] },
    { label: 'Platform', items: ['Next.js', 'React 19', 'TypeScript', 'Clerk', 'Zod'] }
  ],
  note: 'BYOK keys sealed with AES-256-GCM envelope encryption — never stored in the clear.'
}

const HERALD_STACK: SectionStack = {
  groups: [
    { label: 'Agents', items: ['Atta Engine', 'LangGraph', 'MCP server'] },
    { label: 'Models', items: ['Anthropic Claude', 'Vercel AI SDK'] },
    { label: 'Data', items: ['Neon Postgres', 'Drizzle ORM', 'Upstash Redis'] },
    { label: 'Ingest', items: ['GitHub API', 'unpdf', 'Vercel Blob'] },
    { label: 'Platform', items: ['Next.js', 'React 19', 'TypeScript', 'Clerk'] }
  ],
  note: 'Every claim in a report traces back to a detectable signal — gaps are stated, not smoothed.'
}

const VINAYA_STACK: SectionStack = {
  groups: [
    { label: 'Forge', items: ['GitHub GraphQL', 'Octokit'] },
    { label: 'Platform', items: ['Next.js App Router', 'React 19', 'TypeScript'] },
    { label: 'Content', items: ['Sanity CMS', 'Clerk'] },
    { label: 'Visualisation', items: ['d3-shape'] }
  ],
  note: 'Task status is derived from the forge on read, never stored — so it cannot drift.'
}

const ENGINE_STACK: SectionStack = {
  groups: [
    { label: 'Runtime', items: ['LangGraph', 'LangChain Core'] },
    { label: 'Compiler', items: ['js-yaml', 'Zod', 'Handlebars'] },
    { label: 'Vendors', items: ['Anthropic', 'OpenAI', 'Google'] },
    { label: 'Build', items: ['Turborepo', 'Bun', 'TypeScript strict'] }
  ],
  note: 'A cognitive router picks the model vendor per step of a plan, not per application.'
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** One-shot reveal: fires when the element is ~35% visible, then stops observing. */
function useRevealOnce(ref: React.RefObject<HTMLElement | null>) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || revealed) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, revealed])
  return revealed
}

/**
 * Tracks whether a section is on screen, continuously — unlike `useRevealOnce`, which fires
 * once and stops observing.
 *
 * This page stacks four full-height sections, each carrying a canvas mark that owns its own
 * rAF loop. Left ungated they all run for the whole visit, including the three the reader
 * cannot see. `packages/ui/canvas/CLAUDE.md` prescribes exactly this remedy: an
 * IntersectionObserver driving `paused`, which cancels the loop while preserving particle
 * state so resuming does not restart the animation.
 */
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setInView(e.isIntersecting)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView
}

/**
 * Ramps 0→1 over `dur` once `active` turns true. Wall-clock driven via setInterval rather
 * than rAF so a backgrounded tab resumes at the right point instead of stranding mid-ramp.
 */
function useRamp(active: boolean, dur: number, delay = 0, skip = false) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (skip) {
      setV(1)
      return
    }
    if (!active) return
    let cancelled = false
    let id: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      const t0 = performance.now()
      id = setInterval(() => {
        if (cancelled) return
        const p = Math.min(1, (performance.now() - t0) / dur)
        setV(p)
        if (p >= 1 && id) clearInterval(id)
      }, 16)
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(start)
      if (id) clearInterval(id)
    }
  }, [active, dur, delay, skip])
  return v
}

/**
 * Ramps toward 1 while `on`, back toward 0 when it goes false — unlike `useRamp`, which fires
 * once and stays. This is what lets a mark's motion actually reverse: the harness ungrips and
 * its electricity dies out on the way back up, rather than freezing mid-gesture.
 *
 * Wall-clock driven for the same reason as `useRamp` — a backgrounded tab resumes at the
 * right point instead of stranding partway.
 */
function useToggleRamp(on: boolean, dur: number, skip = false) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (skip) {
      setV(on ? 1 : 0)
      return
    }
    let cancelled = false
    const target = on ? 1 : 0
    const t0 = performance.now()
    let from = 0
    setV((current) => {
      from = current
      return current
    })
    const id = setInterval(() => {
      if (cancelled) return
      const p = Math.min(1, (performance.now() - t0) / dur)
      setV(from + (target - from) * p)
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [on, dur, skip])
  return v
}

/**
 * The single fixed layer behind every section — Vinaya's REAL fabric renderer
 * (`createFabricRenderer`, via HeroFabric), not a static grid. Using the real renderer is
 * what brings the cursor effect with it: it brightens the actual mesh lines within ~150px of
 * the pointer, so the texture itself lights up rather than a glow being painted over it.
 *
 * `gravity=0` keeps the mesh flat — the curvature fold belongs to a product hero closing on a
 * ring, not to page chrome. The vertical timeline is deliberately NOT part of this layer; it
 * lives in the mark column so it can thread through the marks.
 */
function BackgroundField() {
  return (
    <div aria-hidden className='pointer-events-none fixed inset-0 z-0'>
      <HeroFabric gravity={0} config={{ gravityMultiplier: 0 }} />
    </div>
  )
}

/**
 * Fixed-height stage so every section's mark occupies the same vertical band — a trio's
 * flanking pieces overhang sideways without pushing the copy down relative to its neighbours.
 */
function MarkStage({ children, stageRef }: { children: ReactNode; stageRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    // Scaled down on narrow viewports. Vāda's trio spans 1.792 × MARK_SIZE (430px) — wider
    // than a 375px phone once the gutters are taken off — so at full size both flanking faces
    // were sliced by the column's `overflow-hidden`. Scaling keeps all four marks the same
    // size as each other, which a per-mark width clamp would not.
    //
    // The transform goes on the stage itself, NOT a wrapper: a transformed element becomes
    // the containing block for absolutely-positioned descendants, and the flanks are
    // absolute — a wrapper would reparent them onto a zero-size box. `getBoundingClientRect`
    // reports the scaled rect, so sphere registration and the timeline's touch test stay
    // correct without knowing the scale.
    <div
      ref={stageRef}
      className='relative flex scale-[0.62] items-center justify-center min-[400px]:scale-75 sm:scale-100'
      style={{ height: MARK_SIZE }}
    >
      {children}
    </div>
  )
}

/**
 * A section's stack rail. `groups` are scannable rows of recognisable tool names — this page
 * is a portfolio, so someone skimming it is looking FOR "LangGraph" or "Drizzle" as words,
 * which is why the names are the readable element and prose is kept out of them. `note` is
 * the one architectural claim per product that a package list cannot convey on its own.
 */
/**
 * Where a product's name comes from. Sourced from the repo's own docs and branding
 * documents, not invented: Vāda and Vinaya from their product CLAUDE.md files, Herald's
 * "announcement" from its Sanity `branding-herald.paliMeaning`. Herald is deliberately
 * labelled Old French rather than Pāli — it is the one name in the set that isn't.
 */
export interface NameOrigin {
  /** Language / root the name comes from. */
  origin: string
  /** What the word means. */
  gloss: string
}

export interface StackGroup {
  label: string
  items: string[]
}

export interface SectionStack {
  groups: StackGroup[]
  note: string
}

/**
 * Sits on the right on wide screens and falls below the copy on narrow ones, where an
 * absolutely-positioned rail would collide with the mark.
 */
function StackRail({ stack, shown, reduced }: { stack: SectionStack; shown: boolean; reduced: boolean }) {
  const step = (i: number) => (reduced ? undefined : `opacity 0.5s ease-out ${160 + i * 70}ms`)

  return (
    <div className='w-full max-w-sm'>
      <Text
        as='span'
        className='mb-5 block font-mono text-sm uppercase tracking-[0.28em] text-muted-foreground'
        style={{ opacity: shown ? 0.7 : 0, transition: reduced ? undefined : 'opacity 0.8s ease-out' }}
      >
        Built on
      </Text>

      <dl className='flex flex-col gap-3'>
        {stack.groups.map((group, i) => (
          <div
            key={group.label}
            className='flex flex-col gap-1'
            style={{ opacity: shown ? 1 : 0, transition: step(i) }}
          >
            <dt className='font-mono text-xs uppercase tracking-[0.2em] text-primary/80'>{group.label}</dt>
            <dd className='font-mono text-sm text-foreground'>{group.items.join('  ·  ')}</dd>
          </div>
        ))}
      </dl>

      <div
        className='mt-4 border-primary/40 border-l pl-3'
        style={{ opacity: shown ? 1 : 0, transition: step(stack.groups.length) }}
      >
        <Text as='span' className='font-mono text-xs leading-snug text-muted-foreground'>
          {stack.note}
        </Text>
      </div>
    </div>
  )
}

/**
 * The element the thread spans. Sections read it so they can work out where the head is
 * without each one re-deriving the page's scroll geometry from scratch.
 */
const TimelineScope = createContext<React.RefObject<HTMLDivElement | null> | null>(null)

/** The head's viewport-space y, or null if the thread has not been measured yet. */
function headViewportY(scope: HTMLDivElement | null): number | null {
  if (!scope) return null
  const r = scope.getBoundingClientRect()
  const travel = r.height - window.innerHeight
  const progress = travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0
  return r.top + progress * r.height
}

/**
 * Hysteresis band around the mark's centre, in px. Without it a head parked exactly on the
 * threshold would flip the mark on and off on every sub-pixel scroll jitter.
 */
const TOUCH_HYSTERESIS = 24

/**
 * True once the timeline's head has passed DOWN through `markRef`, and stays true — it is a
 * latch, not a proximity band. Scrolling back up past the mark's centre releases it, so the
 * next descent lights it again.
 *
 * A band was the obvious first reading of "alive while touched", but it means a mark dies the
 * moment the head moves past it: scroll to the bottom of the page and every mark above is
 * dark again. Latching is what makes the descent read as switching the page on, one mark at
 * a time, with everything behind you left running.
 *
 * The boolean is React state, unlike the head's own position: it changes a handful of times
 * per page rather than every frame, so a re-render on each flip costs nothing. The scroll
 * handler itself is still rAF-throttled and only calls `setState` when the answer changes.
 */
function useTimelineTouch(markRef: React.RefObject<HTMLElement | null>, { eager = false } = {}) {
  const scope = useContext(TimelineScope)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const mark = markRef.current
      const y = headViewportY(scope?.current ?? null)
      if (!mark || y === null) return
      const box = mark.getBoundingClientRect()
      const centre = box.top + box.height / 2
      setTouched((was) => {
        // `eager` is for the FIRST mark only. The head starts at the very top of the thread,
        // which is ~190px of scrolling above that mark's centre — so waiting for a genuine
        // pass would leave the opening section dead through the first flick of the wheel.
        // Any scroll at all counts as reaching it; returning to a hard 0 still releases it
        // through the normal rule below, so it re-triggers on the way back down.
        if (eager && window.scrollY > 0) return true
        if (!was && y >= centre) return true
        if (was && y < centre - TOUCH_HYSTERESIS) return false
        return was
      })
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(check)
    }

    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [markRef, scope, eager])

  return touched
}

/**
 * The one vertical thread linking all four marks — a scroll position indicator. The head sits
 * at the top of the line when the page is at the top and reaches the bottom when the page is
 * fully scrolled, and the stretch of line it has already passed stays lit behind it, so the
 * thread fills in as you descend.
 *
 * It spans every section rather than being drawn per-section, which is what lets one head
 * travel the whole page — four separate spans would each restart it at their own boundary.
 * Horizontally it sits at the mark column's centre: 75% of the page on the two-column layout
 * (the right half's midpoint), 50% when the columns stack and the mark is full-width.
 *
 * Both the head's position and the lit height are written straight to the DOM from the scroll
 * handler. Routing them through React state would re-render the whole page on every scroll
 * frame — the same reason the canvas never wires its rAF loop to state.
 */
function Timeline({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const litRef = useRef<HTMLSpanElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const lit = litRef.current
    const head = headRef.current
    if (!root || !lit || !head) return

    let raf = 0
    const place = () => {
      raf = 0
      const r = root.getBoundingClientRect()
      // Scroll progress across this block: 0 when its top meets the viewport top, 1 when its
      // bottom meets the viewport bottom. `-r.top` is how far the block has travelled up.
      const travel = r.height - window.innerHeight
      const progress = travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0
      const y = progress * r.height
      head.style.transform = `translateY(${y}px)`
      lit.style.height = `${y}px`
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(place)
    }

    place()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className='pointer-events-none absolute inset-y-0 left-1/2 z-0 w-px -translate-x-1/2 lg:left-3/4'
    >
      {/* The unlit thread, full height — what the head has not reached yet. */}
      <span className='absolute inset-0 bg-primary opacity-[0.15]' />

      {/* The lit stretch, growing downward from the top as the page scrolls. Brightest at the
          head and easing back up the line, so the fill reads as light travelling down the
          thread rather than as a progress bar drawn over it. */}
      <span
        ref={litRef}
        className='absolute top-0 left-0 w-px bg-[linear-gradient(to_bottom,transparent,var(--primary))] opacity-70'
      />

      {/* Head — the dot and its bloom share one wrapper so a single transform moves both. */}
      <div ref={headRef} className='absolute top-0 left-1/2 -translate-x-1/2 will-change-transform'>
        <span className='-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-4 rounded-full bg-primary opacity-30 blur-md' />
        <span className='-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[5px] rounded-full bg-primary' />
        {/* A slow pulse on the head — suppressed under reduced motion. The head's travel down
            the thread is kept either way: it is driven by the scroll rather than by a timer,
            so suppressing it would only make the indicator wrong, not calmer. */}
        {!reduced && (
          <span className='-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[5px] animate-ping rounded-full bg-primary opacity-40' />
        )}
      </div>
    </div>
  )
}

function SectionShell({
  name,
  href,
  tagline,
  origin,
  stack,
  copyShown,
  reduced,
  sectionRef,
  markRef,
  children
}: {
  name: string
  href?: string
  tagline: string
  origin: NameOrigin
  stack: SectionStack
  copyShown: boolean
  reduced: boolean
  sectionRef: React.RefObject<HTMLElement | null>
  markRef?: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className='relative z-10 grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2'
    >
      {/* Left: the stack, over a fully opaque panel so the tech reads cleanly against the
          fabric behind it. No divider border here — the timeline in the mark column is the
          page's only vertical line, and it is a timeline, not a column separator. */}
      {/* Stacked (below lg) it drops BELOW the mark: the product's name, tagline and
          etymology live in the mark column, so leading with the stack would open every
          section on a tech list before saying which product it belongs to. */}
      <div className='order-2 flex h-full items-center justify-center bg-background px-6 py-24 lg:order-1 lg:px-12'>
        <StackRail stack={stack} shown={copyShown} reduced={reduced} />
      </div>

      {/* Right: the mark and its name. The timeline that threads them is NOT drawn here — it
          is one element spanning all four sections (see Timeline), so the travelling head can
          run the whole page instead of restarting at every section boundary. */}
      <div className='relative order-1 flex h-full flex-col items-center justify-center gap-12 overflow-hidden px-6 py-24 lg:order-2 lg:px-12'>
        <div className='relative z-10'>
          <MarkStage stageRef={markRef}>{children}</MarkStage>
        </div>

        <div
          className='relative z-10 flex max-w-md flex-col items-center gap-4 text-center'
          style={{
            opacity: copyShown ? 1 : 0,
            transform: copyShown || reduced ? 'none' : 'translateY(24px)',
            transition: reduced
              ? undefined
              : 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Tick rule above the name — underline styling stays reserved for links. */}
          <span aria-hidden className='block h-px w-10 bg-primary opacity-60' />
          {href ? (
            // Every product lives on its own subdomain, so leaving the hub is a context
            // switch, not navigation within it — opens in a new tab. `noopener` is what
            // stops the opened page reaching back through `window.opener`.
            <NextLink
              href={href}
              variant='prose'
              target='_blank'
              rel='noopener noreferrer'
              className='font-mono text-4xl font-bold uppercase tracking-[0.2em]'
            >
              {name}
            </NextLink>
          ) : (
            <Heading level={2} className='font-mono text-4xl font-bold uppercase tracking-[0.2em] text-foreground'>
              {name}
            </Heading>
          )}
          <Text className='font-mono text-base leading-relaxed text-muted-foreground'>{tagline}</Text>

          <div className='mt-2 flex flex-col items-center gap-1'>
            <span aria-hidden className='block h-px w-6 bg-primary opacity-30' />
            <Text as='span' className='font-mono text-[0.7rem] uppercase tracking-[0.22em] text-primary/70'>
              {origin.origin}
            </Text>
            <Text as='span' className='font-mono text-sm text-muted-foreground italic'>
              {origin.gloss}
            </Text>
          </div>
        </div>
      </div>
    </section>
  )
}

function VadaSection() {
  const ref = useRef<HTMLElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const active = useRevealOnce(ref)
  // The trio is anonymous and quiet until the timeline's head passes down through it. On touch
  // the three take back their identity hues and the rain starts falling, and they STAY that
  // way for the rest of the descent — colour and rain ARE the reaction, so nothing scales.
  // `eager`: Vāda opens the page, so it wakes on the first pixel of scroll rather than
  // waiting for the head to travel down to it.
  const alive = useTimelineTouch(markRef, { eager: true })
  const inView = useInView(ref)
  const agentState = alive ? 'speaking' : 'complete'
  const hue = (identity: string) => (alive ? identity : VADA_TRIO_RESTING)
  // The flanking pair arrives just behind the lead, so the team assembles rather than
  // popping in as one block.
  const lead = useRamp(active, 1000, 0, reduced)
  const flank = useRamp(active, 1000, 260, reduced)

  return (
    <SectionShell
      sectionRef={ref}
      markRef={markRef}
      name='Vāda'
      href='https://vada.attalabs.dev'
      tagline='Multi-agent deliberation for high-stakes decisions.'
      origin={{ origin: 'From the Pāli', gloss: 'vāda — deliberation, discourse' }}
      stack={VADA_STACK}
      copyShown={lead > 0.2 || reduced}
      reduced={reduced}
    >
      {/* Flanking agents sit behind (lower z) and are pulled inward so they read as one team
          silhouette rather than three separate marks in a row. They render at full opacity —
          the depth comes from scale and stacking, not from fading them out. */}
      <div
        className='absolute z-0'
        style={{
          width: FLANK_LARGE,
          height: FLANK_LARGE,
          transform: `translateX(-${flankOffset(FLANK_LARGE)}px)`,
          opacity: flank
        }}
      >
        <AIAgent
          id='attalabs-vada-critic'
          state={agentState}
          color={hue(VADA_AGENT_COLORS.critic)}
          face={<VadaFaceCritic />}
          faceOpacity={0.55}
          size={FLANK_LARGE}
          particleCount={45}
          showMatrix={alive && !reduced}
          paused={!inView}
          matrixOpacity={0.7}
          solidBg
          bgOpacity={1}
          noLabel
        />
      </div>
      <div
        className='absolute z-0'
        style={{
          width: FLANK_LARGE,
          height: FLANK_LARGE,
          transform: `translateX(${flankOffset(FLANK_LARGE)}px)`,
          opacity: flank
        }}
      >
        <AIAgent
          id='attalabs-vada-advocate'
          state={agentState}
          color={hue(VADA_AGENT_COLORS.advocate)}
          face={<VadaFaceAdvocate />}
          faceOpacity={0.55}
          size={FLANK_LARGE}
          particleCount={45}
          showMatrix={alive && !reduced}
          paused={!inView}
          matrixOpacity={0.7}
          solidBg
          bgOpacity={1}
          noLabel
        />
      </div>

      <div className='relative z-10' style={{ width: VADA_LEAD, height: VADA_LEAD, opacity: lead }}>
        <AIAgent
          id='attalabs-vada'
          state={agentState}
          color={hue(VADA_AGENT_COLORS.strategist)}
          face={<VadaFace />}
          faceOpacity={0.6}
          size={VADA_LEAD}
          particleCount={90}
          showMatrix={alive && !reduced}
          paused={!inView}
          matrixOpacity={0.85}
          solidBg
          bgOpacity={1}
          noLabel
        />
      </div>
    </SectionShell>
  )
}

function HeraldSection() {
  const ref = useRef<HTMLElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const active = useRevealOnce(ref)
  const reveal = useRamp(active, 1000, 0, reduced)
  const alive = useTimelineTouch(markRef)
  const inView = useInView(ref)

  return (
    <SectionShell
      sectionRef={ref}
      markRef={markRef}
      name='Herald'
      href='https://herald.attalabs.dev'
      tagline='Forensic audit and signal detection for public profiles.'
      origin={{ origin: 'From the Old French', gloss: 'heraut — one who announces' }}
      stack={HERALD_STACK}
      copyShown={reveal > 0.2 || reduced}
      reduced={reduced}
    >
      <div className='relative' style={{ width: MARK_SIZE, height: MARK_SIZE, opacity: reveal }}>
        {/* `--foreground` is the ONE token contracted to read against `--background` in both
            colour schemes — it is the page's ink, so it flips with the scheme by definition.
            `--primary` is a brand/action colour with no such guarantee, which is why the
            particles and matrix here were washing out in one scheme or the other depending
            on which way it was tuned. Same reasoning as the seam rings in Vinaya's
            `/how-it-works` (ui-theme-tokens: prefer a `foreground` tint over scheme-relative
            tokens when something must stay visible in both). Vāda's agents don't need this —
            their `--agent-*` colours are fixed HSL, already visible on either scheme. */}
        <AIASphere
          id='attalabs-herald'
          state={alive ? 'speaking' : 'complete'}
          color='var(--foreground)'
          size={MARK_SIZE}
          particleCount={90}
          showMatrix={alive && !reduced}
          paused={!inView}
          matrixOpacity={0.85}
          solidBg
          bgOpacity={1}
        >
          <div className='flex h-full w-full items-center justify-center p-[22%] text-primary'>
            <HeraldLogoMark className='h-full w-full' />
          </div>
        </AIASphere>
      </div>
    </SectionShell>
  )
}

function VinayaSection() {
  const ref = useRef<HTMLElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const active = useRevealOnce(ref)
  const alive = useTimelineTouch(markRef)
  // The harness builds itself ONCE on reveal — screws rise, bands deploy — and that structure
  // stays put. What the timeline head drives is the live half: the gripper columns close on
  // `main` and the electricity runs while the head is below, and both reverse when you scroll
  // back up past it. So the harness un-grips and goes dark rather than sitting statically
  // deployed, and the next descent grabs again.
  const ringProgress = useRamp(active, 1700, 0, reduced)
  // 900ms is Vinaya's own hero draw-in for the electricity (`at(3900, () => ramp(900,
  // setSpark))`) — the arcs draw across the gaps at the same rate there and here.
  const spark = useToggleRamp(alive && !reduced, 900, reduced)
  const clamp = useToggleRamp(alive, 600, reduced)

  return (
    <SectionShell
      sectionRef={ref}
      markRef={markRef}
      name='Vinaya'
      href='https://vinaya.attalabs.dev'
      tagline='Agentic engineering harness — governs how every task ships.'
      origin={{ origin: 'From the Pāli', gloss: 'vinaya — discipline, the rules of conduct' }}
      stack={VINAYA_STACK}
      copyShown={ringProgress > 0.5 || reduced}
      reduced={reduced}
    >
      <div className='relative' style={{ width: MARK_SIZE, height: MARK_SIZE }}>
        {/* The `main` hub is sized off MARK_SIZE at a ratio that keeps its label legible —
            the columns clamp onto it, so it is the thing the whole harness closes around. */}
        <HarnessRing
          size={MARK_SIZE}
          hubRadius={Math.round(MARK_SIZE * 0.18)}
          ringProgress={ringProgress}
          clamp={clamp}
          spark={spark}
        />
      </div>
    </SectionShell>
  )
}

function EngineSection() {
  const ref = useRef<HTMLElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const active = useRevealOnce(ref)
  const reveal = useRamp(active, 1000, 0, reduced)
  // The gear turns and the plan particles travel only while the head is below this mark.
  // Scroll back up and the mechanism parks exactly where it stood; scroll down again and it
  // resumes from there rather than rewinding to the start.
  const alive = useTimelineTouch(markRef)

  return (
    <SectionShell
      sectionRef={ref}
      markRef={markRef}
      name='Atta Engine'
      tagline='YAML plans compiled to LangGraph execution.'
      origin={{ origin: 'From the Pāli', gloss: 'attā — the self that persists' }}
      stack={ENGINE_STACK}
      copyShown={reveal > 0.2 || reduced}
      reduced={reduced}
    >
      {/* One mark, not a gear trio: plan nodes converging through a funnel into a single
          execution node. The gear survives only as a slow ring behind that node — texture, so
          the mark still reads as "engine" without being a gear-as-icon. */}
      <div className='relative' style={{ width: MARK_SIZE, height: MARK_SIZE }}>
        <EngineMark revealProgress={reveal} running={alive && !reduced} />
      </div>
    </SectionShell>
  )
}

export function EcosystemHero({ logoUrl }: { logoUrl?: string | null }) {
  const reduced = usePrefersReducedMotion()
  const scopeRef = useRef<HTMLDivElement>(null)

  // The timeline thread is this page's scroll indicator, so the native scrollbar beside it is
  // duplicate chrome. Scoped to this page and reversed on unmount — the rule is a class on
  // <html>, not a blanket stylesheet override, so any other route keeps its scrollbar.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hide-native-scrollbar')
    return () => root.classList.remove('hide-native-scrollbar')
  }, [])

  return (
    <div className='relative w-full overflow-x-hidden bg-background'>
      <BackgroundField />
      {/* Fixed topbar spanning ONLY the right (stack) half, matching the column split — it
          sits over the opaque panel, so it reads as that column's chrome rather than floating
          across the artwork. The toggle is the shared @atta/ui one the product topbars mount,
          so the cookie write and the data-theme flip stay in a single implementation. */}
      <header className='fixed inset-x-0 top-0 z-50 lg:right-1/2'>
        <div className='flex items-center justify-between gap-4 bg-background/20 px-6 py-3 backdrop-blur-md lg:px-12'>
          <Logo dark={logoUrl ?? undefined} alt='AttaLabs' size='h-10' text={['Atta', 'Labs']} />
          <ColorSchemeToggle />
        </div>
      </header>
      {/* The four sections and the thread that runs through them share one positioning
          context, so the thread spans exactly their combined height. */}
      <div ref={scopeRef} className='relative'>
        <TimelineScope.Provider value={scopeRef}>
          <Timeline reduced={reduced} />
          <VadaSection />
          <HeraldSection />
          <VinayaSection />
          <EngineSection />
        </TimelineScope.Provider>
      </div>
    </div>
  )
}
