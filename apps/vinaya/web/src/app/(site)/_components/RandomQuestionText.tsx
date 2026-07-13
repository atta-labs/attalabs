'use client'

import { useEffect, useState } from 'react'
import { TextReveal } from '@atta/ui'

const QUESTIONS = [
  'Ever spent 3 hours debugging a 2,000-line PR that an AI agent generated in 3 seconds?',
  `Ever realized your codebase's tech debt is now growing at the speed of an LLM?`,
  `Ever had an agent refactor a file it clearly didn't have the context to understand?`,
  'Ever had a PR where the description said one thing, but the AI quietly slipped in 10 other changes?',
  `How do your junior devs learn to build when their only job is clicking 'approve' on AI-generated code?`,
  `Ever asked a developer to explain a complex bug fix and heard, 'I don't know, the AI wrote it'?`,
  'Ever worried your team is copy-pasting their way into an unmaintainable codebase?',
  `Ever had an AI review another AI's code while the humans just cross their fingers and merge?`,
  'Ever had a project start with zero human planning, just a prompt and a dream?',
  "How do you maintain a single source of truth when AI agents are generating documentation that's out of date by tomorrow?"
]

const DISPLAY_COUNT = 3
// Beat between one bullet finishing its own cascade and the next one starting — without
// it, bullet N+1 starts the instant bullet N's last word lands, which reads as one
// continuous animation instead of a deliberate "one, then the next" sequence.
const GAP_BETWEEN_BULLETS_MS = 300

/** Mirrors TextReveal's own animation math (delayChildren = 0.04, staggerChildren = 0.1
 * per word, 0.8s per-word duration) so each bullet's mount is scheduled for exactly when
 * the PREVIOUS bullet's cascade actually finishes — not a fixed guess that's too short
 * for long questions and leaves dead air after short ones. */
function estimateRevealMs(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const seconds = 0.04 + Math.max(0, wordCount - 1) * 0.1 + 0.8
  return seconds * 1000
}

/** Picks DISPLAY_COUNT distinct random questions from the full pool — the pool itself
 * is never trimmed, so a refresh surfaces a different set without losing any question. */
function pickRandom(count: number): string[] {
  const pool = [...QUESTIONS]
  const picked: string[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool[index]!)
    pool.splice(index, 1)
  }
  return picked
}

interface RandomQuestionTextProps {
  /** Called once the last bullet's own cascade has had time to finish. */
  onAllRevealed?: () => void
}

/** Reveals a few random questions strictly one after another — each one's cascade
 * finishes before the next one starts — and every bullet stays on screen once shown
 * (never rotates away). Starts empty on the server and only randomizes after mount, so
 * hydration never mismatches. */
export function RandomQuestionText({ onAllRevealed }: RandomQuestionTextProps) {
  const [questions, setQuestions] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const picked = pickRandom(DISPLAY_COUNT)
    setQuestions(picked)

    const timers: ReturnType<typeof setTimeout>[] = []
    let elapsed = 0
    picked.forEach((question, i) => {
      timers.push(setTimeout(() => setVisibleCount((count) => Math.max(count, i + 1)), elapsed))
      elapsed += estimateRevealMs(question) + GAP_BETWEEN_BULLETS_MS
    })
    if (onAllRevealed) timers.push(setTimeout(onAllRevealed, elapsed))

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    // Natural height — HeroSection is now top-anchored (justify-start, not
    // justify-center), so growth here only pushes the button below it down; it can
    // never shift the H1/subheadline above. A fixed worst-case height previously tried
    // to solve that, but sized wrong it just let the last bullet overflow and overlap
    // the button beneath it.
    <div className='mx-auto flex w-full max-w-[700px] flex-col items-start gap-2'>
      {questions.slice(0, visibleCount).map((question) => (
        <div key={question} className='flex items-start gap-2'>
          <span className='mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground' />
          <TextReveal text={question} align='start' wordClassName='font-sans text-lg font-bold text-primary' />
        </div>
      ))}
    </div>
  )
}
