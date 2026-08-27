'use client'

import { Badge, Card, CardContent } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { ArrowRight, ClipboardCheck, FlaskConical, GitBranch, type LucideIcon, Sparkles, Users } from 'lucide-react'
import { siClaude, siGithub, siGoogle, siJira, siLinear, siOpenai } from 'simple-icons'
import { useEffect, useRef, useState } from 'react'
import { LetterReveal } from '../LetterReveal'
import { LandingSection } from './LandingSection'
import { SectionTitle } from './SectionHeading'

// Brand marks — simple-icons path strings rendered monochrome (currentColor): theme-correct
// in light + dark, no icon-library runtime in the bundle. Antigravity uses Google's mark
// (same convention as WorkflowSection.tsx). Grok has no simple-icon, so it falls back to a
// themed lucide glyph below.
const BRAND_PATH: Record<string, string> = {
  Jira: siJira.path,
  Linear: siLinear.path,
  'GitHub Issues': siGithub.path,
  Codex: siOpenai.path,
  'Claude Code': siClaude.path,
  Antigravity: siGoogle.path
}

const METHOD_ICON: Record<string, LucideIcon> = {
  TDD: FlaskConical,
  BDD: ClipboardCheck,
  'Trunk-based development': GitBranch,
  'Pair programming': Users,
  Grok: Sparkles
}

function ChipIcon({ tool }: { tool: string }) {
  const path = BRAND_PATH[tool]
  if (path) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className='size-4 shrink-0'>
        <path d={path} />
      </svg>
    )
  }
  const Lucide = METHOD_ICON[tool]
  return Lucide ? <Lucide className='size-4 shrink-0' /> : null
}

// One selection travels down each column, offset so the three never move in lockstep — the
// section should read as three independent choices, not one synchronised sweep.
const COLUMNS = [
  { title: 'Project-tool agnostic', tools: ['Jira', 'Linear', 'GitHub Issues'], fallback: 'or your own system' },
  {
    title: 'Method agnostic',
    tools: ['TDD', 'BDD', 'Trunk-based development', 'Pair programming'],
    fallback: 'or your team’s practice'
  },
  {
    title: 'Agent-CLI agnostic',
    tools: ['Codex', 'Claude Code', 'Grok', 'Antigravity'],
    fallback: 'or another coding agent'
  }
] as const
const OFFSET = [0, 2, 1] as const
const STEP_MS = 1000

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function KeepYourStackSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [tick, setTick] = useState(-1)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const target = scrollParent(section)
    let poll: ReturnType<typeof setInterval> | null = null
    let step: ReturnType<typeof setInterval> | null = null
    let animationFrame = 0

    const evaluate = () => {
      animationFrame = 0
      const rect = section.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 800
      const visible = rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.1
      if (visible && !step) {
        step = setInterval(() => setTick((t) => t + 1), STEP_MS)
      } else if (!visible && step) {
        clearInterval(step)
        step = null
      }
    }
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(evaluate)
    }
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    poll = setInterval(queue, 250)
    const resizeObserver = new ResizeObserver(queue)
    resizeObserver.observe(section)
    evaluate()
    return () => {
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      if (poll) clearInterval(poll)
      if (step) clearInterval(step)
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <LandingSection ref={sectionRef} background='bg-card text-card-foreground' center>
      <SectionTitle className='mx-auto max-w-2xl'>
        <LetterReveal text='Keep your stack' />
      </SectionTitle>
      <Text className='mx-auto mt-8 max-w-xl text-balance font-serif text-xl leading-relaxed text-muted-foreground'>
        Vinaya is agnostic to your project tool, development method, and coding agent.
      </Text>

      <div className='mt-14 grid gap-6 text-left sm:grid-cols-3'>
        {COLUMNS.map((column, colIndex) => {
          const active = tick < 0 ? -1 : (tick + (OFFSET[colIndex] ?? 0)) % column.tools.length
          return (
            <Card key={column.title} className='h-full shadow-none'>
              <CardContent className='flex h-full flex-col gap-6 px-8 py-9'>
                <Text className='font-mono text-lg font-bold uppercase tracking-wider text-foreground'>
                  {column.title}
                </Text>
                <div className='flex flex-1 flex-col items-start gap-2.5'>
                  {column.tools.map((tool, rowIndex) => (
                    <Badge
                      key={tool}
                      variant={rowIndex === active ? 'default' : 'secondary'}
                      className='gap-2 px-3.5 py-1.5 font-mono text-sm transition-colors duration-500'
                    >
                      <ChipIcon tool={tool} />
                      {tool}
                    </Badge>
                  ))}
                </div>
                <Text className='font-sans text-sm text-muted-foreground'>{column.fallback}</Text>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className='mt-11 flex flex-wrap items-center justify-center gap-3.5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground'>
        <span>whatever you pick above</span>
        <ArrowRight className='size-4 shrink-0' />
        <span className='text-foreground'>the same gates, the same PR, the same verdict</span>
      </div>
    </LandingSection>
  )
}
