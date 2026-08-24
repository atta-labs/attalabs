'use client'

import { Badge } from '@atta/ui/components'
import {
  CircleCheck,
  CircleDot,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Milestone,
  Tag,
  type LucideIcon
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { LetterReveal } from '../LetterReveal'
import { HarnessCanvas } from './HarnessCanvas'
import { LandingSection } from './LandingSection'
import { SectionOverline, SectionTitle } from './SectionHeading'

// One flat, single-height row, inside the box — no per-badge alignment to a specific
// branch, no stacked levels. Order is the only thing that carries meaning (the sequence
// the composite mockup drew as a plain left-to-right queue); syncConceptLayout below
// measures each badge's real rendered width and packs them left-to-right with a fixed
// gap, so nothing ever overlaps regardless of label length.
const HARNESS_CONCEPTS: Array<{
  label: string
  Icon: LucideIcon
  initialX: number
  initialY: number
  rotation: number
}> = [
  { label: 'Milestone', Icon: Milestone, initialX: 0.67, initialY: 0.47, rotation: -3 },
  { label: 'Issues + labels', Icon: Tag, initialX: 0.18, initialY: 0.52, rotation: 2 },
  { label: 'Branch', Icon: GitBranch, initialX: 0.82, initialY: 0.48, rotation: -2 },
  { label: 'Pull request', Icon: GitPullRequest, initialX: 0.43, initialY: 0.53, rotation: 3 },
  { label: 'Review', Icon: MessageSquare, initialX: 0.29, initialY: 0.49, rotation: -1 },
  { label: 'CI', Icon: CircleDot, initialX: 0.9, initialY: 0.51, rotation: 2 },
  { label: 'Merged', Icon: CircleCheck, initialX: 0.54, initialY: 0.46, rotation: -3 }
]

const CONCEPT_GAP_PX = 14

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function LifecycleHarnessSection() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const conceptRefs = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const target = scrollParent(wrap)
    let animationFrame = 0
    let conceptAnimations: Animation[] = []
    let conceptWidth = 0
    let conceptHeight = 0

    const syncConceptLayout = (width: number, height: number, foreground: string, muted: string, success: string) => {
      if (Math.abs(conceptWidth - width) < 1 && Math.abs(conceptHeight - height) < 1 && conceptAnimations.length) return
      conceptWidth = width
      conceptHeight = height
      conceptAnimations.forEach((animation) => {
        animation.cancel()
      })
      // Mirrors HarnessCanvas's own frame cap: the box can be much taller than wide (a
      // portrait phone's h-[70vh] against a narrow column), but the frame drawn inside it
      // stays landscape and centered — badge placement has to track that same capped
      // frame, not the raw box height, or the row lands off the actual drawn hump.
      const frameHeight = Math.min(height, width / 1.3)
      const frameTop = (height - frameHeight) / 2
      const middle = frameTop + frameHeight / 2
      const scale = frameHeight / 520
      // Deliberately asymmetric: nearly all the badge's clearance goes to the branch-curve
      // side, not split evenly with the rail above — the branch curves are the specific
      // thing the row must stay clear of with real breathing room (mirrors paint()'s own,
      // now-static rail/arc math in HarnessCanvas — the branches stay open, not flattened).
      const closedHalf = frameHeight / 2 - 14
      const closedRail = closedHalf * 0.85
      const closedArc = (closedRail / 1.55) * 0.4
      const humpPeakY = middle - closedArc
      const branchGap = 32 * scale
      // The box interior at full close (mirrors paint()'s own `left`/`right` at
      // easedClose = 1) — the box is inset from the canvas edges, asymmetrically (left
      // bolt sits further in than the right one), so centering against raw canvas width
      // put the row outside the bolts instead of inside them.
      const boxLeft = 0.09 * width
      const boxRight = 0.955 * width
      const boxCenterX = (boxLeft + boxRight) / 2
      const boxInnerWidth = (boxRight - boxLeft) * 0.94
      // Split into two rows at every width, not just narrow ones: even indices above the
      // wave, odd indices below it, mirrored the same distance from center. Each row packs
      // and shrink-to-fits only its own badges, so a row of 3-4 gets far more width per
      // badge than cramming all 7 across the same span would.
      const humpTroughY = middle + (middle - humpPeakY)
      const indexGroups = [
        HARNESS_CONCEPTS.map((_, i) => i).filter((i) => i % 2 === 0),
        HARNESS_CONCEPTS.map((_, i) => i).filter((i) => i % 2 === 1)
      ]
      const finalXs: number[] = new Array(HARNESS_CONCEPTS.length).fill(width / 2)
      const finalYs: number[] = new Array(HARNESS_CONCEPTS.length).fill(humpPeakY - branchGap)
      const fits: number[] = new Array(HARNESS_CONCEPTS.length).fill(1)
      const belowRow: boolean[] = new Array(HARNESS_CONCEPTS.length).fill(false)
      indexGroups.forEach((indices, rowIndex) => {
        // Pack left-to-right using each badge's REAL rendered size (not a guessed
        // fraction) so labels of very different lengths never overlap — measured with the
        // badges still at their scattered position, since size doesn't depend on it.
        const rawWidths = indices.map((i) => conceptRefs.current[i]?.getBoundingClientRect()?.width ?? 0)
        const rawTotal = rawWidths.reduce((sum, w) => sum + w, 0) + CONCEPT_GAP_PX * Math.max(0, rawWidths.length - 1)
        // Shrink this row uniformly (never grow past 1) so it always fits inside the box,
        // at any viewport width — the fixed pixel sizes below would otherwise overflow
        // past the left/right bolts on narrower screens instead of staying centered.
        const rowFit = rawTotal > 0 ? Math.min(1, boxInnerWidth / rawTotal) : 1
        const widths = rawWidths.map((w) => w * rowFit)
        const gap = CONCEPT_GAP_PX * rowFit
        const totalWidth = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1)
        const isBelow = rowIndex === 1
        const rowY = isBelow ? humpTroughY + branchGap : humpPeakY - branchGap
        let cursor = boxCenterX - totalWidth / 2
        indices.forEach((conceptIndex, k) => {
          const w = widths[k] ?? 0
          finalXs[conceptIndex] = cursor + w / 2
          finalYs[conceptIndex] = rowY
          fits[conceptIndex] = rowFit
          belowRow[conceptIndex] = isBelow
          cursor += w + gap
        })
      })
      conceptAnimations = HARNESS_CONCEPTS.flatMap((concept, index) => {
        const element = conceptRefs.current[index]
        if (!element) return []
        const initialX = width * concept.initialX
        const initialY = height * concept.initialY
        const finalX = finalXs[index] ?? width / 2
        const finalY = finalYs[index] ?? humpPeakY - branchGap
        const fit = fits[index] ?? 1
        // Above the wave the badge hangs from its bottom edge (translateY(-100%) anchors
        // that edge at finalY); below the wave it hangs from its top edge instead, so it
        // reads as sitting under the line rather than overlapping it.
        const anchor = belowRow[index] ? '0%' : '-100%'
        const animation = element.animate(
          [
            {
              transform: `translate3d(${initialX}px, ${initialY}px, 0) translateX(-50%) translateY(${anchor}) rotate(${concept.rotation}deg) scale(${0.96 * fit})`,
              opacity: 0.32,
              color: muted
            },
            {
              offset: 0.42,
              transform: `translate3d(${initialX + (finalX - initialX) * 0.35}px, ${initialY + (finalY - initialY) * 0.35}px, 0) translateX(-50%) translateY(${anchor}) rotate(${concept.rotation * 0.65}deg) scale(${0.98 * fit})`,
              opacity: 0.58,
              color: muted
            },
            {
              offset: 0.6,
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(${anchor}) rotate(0deg) scale(${fit})`,
              opacity: 1,
              color: foreground
            },
            {
              offset: 0.85,
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(${anchor}) rotate(0deg) scale(${fit})`,
              opacity: 1,
              color: success
            },
            {
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(${anchor}) rotate(0deg) scale(${fit})`,
              opacity: 1,
              color: success
            }
          ],
          { duration: 1000, fill: 'both', easing: 'ease-out' }
        )
        animation.pause()
        return [animation]
      })
    }

    // Mirrors HarnessCanvas's own progress formula so the concept badges stay in
    // lockstep with the harness closing — same box, same entry/exit thresholds.
    const evaluate = () => {
      animationFrame = 0
      const box = wrap.getBoundingClientRect()
      const width = box.width
      const height = box.height
      if (!width || !height) return
      const styles = window.getComputedStyle(wrap)
      const foreground = styles.getPropertyValue('--foreground').trim() || styles.color
      const success = styles.getPropertyValue('--success').trim() || styles.color
      const muted = styles.getPropertyValue('--muted-foreground').trim() || foreground
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const viewportHeight = window.innerHeight || 800
      const sectionCenter = box.top + height / 2
      const entryCenter = viewportHeight * 0.85
      const exitCenter = viewportHeight * 0.35
      const progress = reduced
        ? 1
        : Math.max(0, Math.min(1, (entryCenter - sectionCenter) / (entryCenter - exitCenter)))
      syncConceptLayout(width, height, foreground, muted, success)
      conceptAnimations.forEach((animation) => {
        animation.currentTime = progress * 1000
      })
    }

    const queue = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(evaluate)
    }
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const resizeObserver = new ResizeObserver(queue)
    resizeObserver.observe(wrap)
    const poll = window.setInterval(queue, 250)
    queue()
    return () => {
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      resizeObserver.disconnect()
      window.clearInterval(poll)
      window.cancelAnimationFrame(animationFrame)
      conceptAnimations.forEach((animation) => {
        animation.cancel()
      })
    }
  }, [])

  return (
    <LandingSection background='bg-background text-foreground'>
      <SectionOverline className='text-muted-foreground'>the software lifecycle you already run</SectionOverline>
      <SectionTitle className='mt-4'>
        <LetterReveal text='Your GitHub, perfectly structured' />
      </SectionTitle>
      <div className='mt-10 flex flex-wrap gap-8 border-t border-border pt-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground'>
        <span>01 plan a milestone</span>
        <span>02 solve its tasks</span>
        <span>03 archive a milestone</span>
      </div>
      {/* Back to h-[70vh] alone: the box itself is deliberately tall on mobile — that height
          is the scroll RUNWAY the entry/exit progress math needs (a short box completes its
          whole entry→exit viewport-fraction window in a few pixels of scroll, so the
          animation snaps to done almost instantly instead of playing out). Capping the box's
          own aspect ratio traded a proportion bug for a broken-feeling animation. The actual
          fix is inside HarnessCanvas/syncConceptLayout: the FRAME they draw is capped to a
          landscape aspect and centered in the box, while the box stays tall underneath it. */}
      <div ref={wrapRef} className='relative mt-10 h-[70vh]'>
        <HarnessCanvas className='absolute inset-0 size-full' />
        <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
          {HARNESS_CONCEPTS.map(({ Icon, label }, index) => (
            <span
              key={label}
              ref={(element) => {
                conceptRefs.current[index] = element
              }}
              className='absolute left-0 top-0 will-change-transform'
            >
              <Badge
                variant='outline'
                className='gap-1.5 border-current bg-background/90 px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-current'
              >
                <Icon className='size-3' />
                {label}
              </Badge>
            </span>
          ))}
        </div>
      </div>
    </LandingSection>
  )
}
