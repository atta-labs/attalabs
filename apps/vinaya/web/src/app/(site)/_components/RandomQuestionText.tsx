'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TextReveal } from '@atta/ui'
import type { ReactNode } from 'react'

// Beat between one bullet finishing its own cascade and the next one starting — without
// it, bullet N+1 starts the instant bullet N's last word lands, which reads as one
// continuous animation instead of a deliberate "one, then the next" sequence.
const GAP_BETWEEN_BULLETS_MS = 300
const BULLET_GAP_PX = 8
// text-2xl's own line-height (32px), used for both the height estimate below and matches
// TextReveal's rendered line box exactly (both set by the same wordClassName font-size).
const LINE_HEIGHT_PX = 32
// ~38 characters fit per line at text-2xl bold inside the 700px-wide (minus the icon+gap
// indent) container — used only to pre-reserve height, not for actual wrapping. A first
// pass estimated by WORDS per line instead of characters and underestimated a real
// 46-character/6-word question by a full line, which put the button on top of the last
// line of text — worse than the excess-gap bug it was meant to fix. Character count
// tracks real wrapping much more closely than word count does (a handful of long words
// wraps just as early as many short ones), and this constant is deliberately on the
// conservative (lower) side — underestimating causes overlap, a broken layout;
// overestimating only costs a few px of extra gap.
const CHARS_PER_LINE = 38
// Fallback per-bullet budget used ONLY before any question has been picked yet (server
// render / first client paint) — generous since the real per-question estimate below
// isn't available until pickRandom() has run.
const FALLBACK_BULLET_HEIGHT_PX = 80

/** Mirrors TextReveal's own animation math (delayChildren = 0.04, staggerChildren = 0.1
 * per word, 0.8s per-word duration) so each bullet's mount is scheduled for exactly when
 * the PREVIOUS bullet's cascade actually finishes — not a fixed guess that's too short
 * for long questions and leaves dead air after short ones. */
function estimateRevealMs(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const seconds = 0.04 + Math.max(0, wordCount - 1) * 0.1 + 0.8
  return seconds * 1000
}

/** Rough wrapped-line count for a question, from its character count — used to reserve a
 * height close to the ACTUAL rendered content instead of a flat worst-case per bullet,
 * which is what left a much bigger gap before the button than the title-to-text gap
 * above. Still an estimate (real wrapping depends on font metrics), not pixel-perfect —
 * deliberately conservative (see CHARS_PER_LINE) since underestimating overlaps text. */
function estimateLineCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
}

/** Fisher-Yates shuffle of the full pool, then keep the first `count` — a random subset
 * in random order, not just a random order of a fixed prefix. */
function pickRandom<T>(items: T[], count: number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result.slice(0, count)
}

interface RandomQuestionTextProps {
  /** The full question pool to pick from — sourced from the page (a Server Component;
   * this component is 'use client' and can't read files itself). */
  questions: string[]
  /** How many bullets to reveal, sequentially, then leave on screen. Default 2. */
  displayCount?: number
  /** Rendered below the bullets, fading in once every bullet has finished revealing —
   * e.g. a "next section" CTA that shouldn't appear until the reader has actually seen
   * the last line. Owned here (not the page) so its fade timing shares the exact same
   * reveal schedule as the bullets themselves, with no state threading across the
   * Server/Client boundary. */
  action?: ReactNode
}

/** Reveals a random `displayCount`-sized subset of the pool, one bullet at a time, each
 * staying on screen once shown (never replaced or cycled) — a one-time fill, not a
 * rotation. Starts empty on the server and only picks after mount, so hydration never
 * mismatches. */
export function RandomQuestionText({ questions, displayCount = 2, action }: RandomQuestionTextProps) {
  const [picked, setPicked] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [allRevealed, setAllRevealed] = useState(false)

  useEffect(() => {
    const items = pickRandom(questions, displayCount)
    setPicked(items)

    const timers: ReturnType<typeof setTimeout>[] = []
    let elapsed = 0
    items.forEach((question, i) => {
      timers.push(setTimeout(() => setVisibleCount((count) => Math.max(count, i + 1)), elapsed))
      elapsed += estimateRevealMs(question) + GAP_BETWEEN_BULLETS_MS
    })
    timers.push(setTimeout(() => setAllRevealed(true), elapsed))

    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fixed height so the box never resizes as bullets reveal (a growing/natural height
  // under the section's own justify-center would shift the heading above every time a
  // bullet appears — see HeroSection's identical rationale for why this can't be
  // "just let it grow"). Before `picked` is set (server render / first paint) there's no
  // real content yet to measure, so it falls back to a flat worst-case-per-bullet budget;
  // once picked, it's the sum of each question's own estimated line count — much closer
  // to the real rendered height than the old flat budget was, which is what left a
  // visibly bigger gap before the button than the title-to-bullets gap above it.
  const reservedHeight =
    picked.length > 0
      ? picked.reduce((sum, q) => sum + estimateLineCount(q) * LINE_HEIGHT_PX, 0) +
        Math.max(0, picked.length - 1) * BULLET_GAP_PX
      : displayCount * FALLBACK_BULLET_HEIGHT_PX + Math.max(0, displayCount - 1) * BULLET_GAP_PX

  return (
    <div className='mx-auto flex w-full max-w-[700px] flex-col items-center gap-6'>
      {/* justify-start, NOT justify-center — with a fixed-height box, centering
          re-balances around the growing stack every time a new bullet mounts, which
          shifts every already-visible line UPWARD to keep the whole cluster centered.
          justify-start anchors the first line to the top permanently — new bullets only
          ever grow the stack DOWN into the reserved empty space below, never move
          anything already shown.

          minHeight, NOT height — the char-count estimate is a guess, and a hard `height`
          clips nothing (this div has no overflow:hidden) but the real, taller content
          still spills out past it, landing exactly where the action button sits below —
          that's what an underestimate looked like. minHeight is a floor: content is
          always at least reservedHeight tall (so early bullets don't collapse the box
          small and cause reflow), but if the real content needs more, the box simply
          grows past the estimate instead of overflowing into the button. Worst case on a
          bad estimate is a bit of extra gap, never overlap. */}
      <div className='flex w-full flex-col items-start justify-start gap-2' style={{ minHeight: reservedHeight }}>
        {picked.slice(0, visibleCount).map((question) => (
          <motion.div
            key={question}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className='flex items-start gap-2'
          >
            <span className='mt-3 h-2 w-2 shrink-0 rounded-full bg-muted-foreground' />
            <TextReveal text={question} align='start' wordClassName='font-sans text-2xl font-bold text-primary' />
          </motion.div>
        ))}
      </div>

      {action && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: allRevealed ? 1 : 0 }} transition={{ duration: 0.5 }}>
          {action}
        </motion.div>
      )}
    </div>
  )
}
