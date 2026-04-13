'use client'

import { useEffect, useState } from 'react'
import { cn } from '../../../../lib/utils'

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789αβγδ∑∏∫∂λμπφψω'

export interface AgentThinkingTextProps {
  text: string
  /** Interval per frame in ms. Default 40 */
  speed?: number
  /** Scramble frames per character before settling. Default 6 */
  scrambleFrames?: number
  className?: string
}

/**
 * Scramble/decrypt text animation. Characters cycle through random symbols
 * before settling on the real letter — the classic AI thinking effect.
 *
 * @example
 * <AIASphere id="analyst" state="speaking">
 *   <AgentThinkingText text="Analyzing risk factors..." />
 * </AIASphere>
 */
export function AgentThinkingText({ text, speed = 40, scrambleFrames = 6, className }: AgentThinkingTextProps) {
  const [displayed, setDisplayed] = useState(() => randomize(text))

  useEffect(() => {
    setDisplayed(randomize(text))
    let frame = 0
    const total = text.length * scrambleFrames

    const timer = setInterval(() => {
      frame++
      const settled = Math.floor(frame / scrambleFrames)
      setDisplayed(
        text
          .split('')
          .map((char, i) => {
            if (i < settled) return char
            if (char === ' ') return ' '
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? char
          })
          .join('')
      )
      if (frame >= total) clearInterval(timer)
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, scrambleFrames])

  return <span className={cn('font-mono', className)}>{displayed}</span>
}

function randomize(text: string): string {
  return text
    .split('')
    .map((c) => (c === ' ' ? ' ' : (SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? c)))
    .join('')
}
