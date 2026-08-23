'use client'

import { Badge } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const conceptRefs = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const target = scrollParent(canvas)
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
      const middle = height / 2
      const scale = height / 520
      // Deliberately asymmetric: nearly all the badge's clearance goes to the branch-curve
      // side, not split evenly with the rail above — the branch curves are the specific
      // thing the row must stay clear of with real breathing room, at their fully-closed
      // geometry (mirrors paint()'s own math for the rail and the merge arcs).
      const closedHalf = middle - 14
      const closedRail = closedHalf * 0.388
      const closedArc = (closedRail / 1.55) * 0.3
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
      // Pack left-to-right using each badge's REAL rendered size (not a guessed
      // fraction) so labels of very different lengths never overlap — measured with the
      // badges still at their scattered position, since size doesn't depend on it.
      const rects = HARNESS_CONCEPTS.map((_, index) => conceptRefs.current[index]?.getBoundingClientRect())
      const rawWidths = rects.map((r) => r?.width ?? 0)
      const rawTotal = rawWidths.reduce((sum, w) => sum + w, 0) + CONCEPT_GAP_PX * (rawWidths.length - 1)
      // Shrink the whole row uniformly (never grow past 1) so it always fits inside the
      // box, at any viewport width — the fixed pixel sizes below would otherwise overflow
      // past the left/right bolts on narrower screens instead of staying centered.
      const fit = rawTotal > 0 ? Math.min(1, boxInnerWidth / rawTotal) : 1
      const widths = rawWidths.map((w) => w * fit)
      const gap = CONCEPT_GAP_PX * fit
      const totalWidth = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1)
      let cursor = boxCenterX - totalWidth / 2
      const finalXs = widths.map((w) => {
        const center = cursor + w / 2
        cursor += w + gap
        return center
      })
      conceptAnimations = HARNESS_CONCEPTS.flatMap((concept, index) => {
        const element = conceptRefs.current[index]
        if (!element) return []
        const initialX = width * concept.initialX
        const initialY = height * concept.initialY
        const finalX = finalXs[index] ?? width / 2
        const finalY = humpPeakY - branchGap
        const animation = element.animate(
          [
            {
              transform: `translate3d(${initialX}px, ${initialY}px, 0) translateX(-50%) translateY(-100%) rotate(${concept.rotation}deg) scale(${0.96 * fit})`,
              opacity: 0.32,
              color: muted
            },
            {
              offset: 0.42,
              transform: `translate3d(${initialX + (finalX - initialX) * 0.35}px, ${initialY + (finalY - initialY) * 0.35}px, 0) translateX(-50%) translateY(-100%) rotate(${concept.rotation * 0.65}deg) scale(${0.98 * fit})`,
              opacity: 0.58,
              color: muted
            },
            {
              offset: 0.6,
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(-100%) rotate(0deg) scale(${fit})`,
              opacity: 1,
              color: foreground
            },
            {
              offset: 0.85,
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(-100%) rotate(0deg) scale(${fit})`,
              opacity: 1,
              color: success
            },
            {
              transform: `translate3d(${finalX}px, ${finalY}px, 0) translateX(-50%) translateY(-100%) rotate(0deg) scale(${fit})`,
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

    const paint = () => {
      animationFrame = 0
      const box = canvas.getBoundingClientRect()
      const width = box.width
      const height = box.height
      if (!width || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      const context = canvas.getContext('2d')
      if (!context) return
      const styles = window.getComputedStyle(canvas)
      const foreground = styles.getPropertyValue('--foreground').trim() || styles.color
      const background = styles.getPropertyValue('--background').trim() || styles.backgroundColor
      const success = styles.getPropertyValue('--success').trim() || styles.color
      const muted = styles.getPropertyValue('--muted-foreground').trim() || foreground
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const viewportHeight = window.innerHeight || 800
      // Driven by the section's CENTER, not its top edge — completes while the section
      // still sits in the upper-middle of the viewport (not hugging the top edge), so
      // there's a long stretch of scroll left where the finished state stays on screen
      // before it scrolls away, instead of finishing just as it's about to leave.
      const sectionCenter = box.top + height / 2
      const entryCenter = viewportHeight * 0.85
      const exitCenter = viewportHeight * 0.35
      const progress = reduced
        ? 1
        : Math.max(0, Math.min(1, (entryCenter - sectionCenter) / (entryCenter - exitCenter)))
      const branchCount = width < 700 ? 4 : 6
      const middle = height / 2
      const scale = height / 520
      syncConceptLayout(width, height, foreground, muted, success)
      conceptAnimations.forEach((animation) => {
        animation.currentTime = progress * 1000
      })
      const closeProgress = Math.min(1, progress / 0.42)
      const mergeProgress = Math.max(0, (progress - 0.42) / 0.58)
      const overshoot = (value: number) => {
        const amount = 1.24
        return 1 + (amount + 1) * (value - 1) ** 3 + amount * (value - 1) ** 2
      }
      const easedClose = closeProgress <= 0 ? 0 : closeProgress >= 1 ? 1 : overshoot(closeProgress)
      const half = middle - 14
      const rail = half + (half * 0.388 - half) * easedClose
      // Flattens further than the rail itself closes — branches straighten out as they
      // organize, which also opens up clearance between the rail and the curve peaks
      // for the concept row to sit in without crossing either.
      const arc = (rail / 1.55) * (1 - 0.7 * easedClose)
      const left = (0.025 + (0.09 - 0.025) * easedClose) * width
      const right = (0.988 - (0.988 - 0.955) * easedClose) * width
      const mono = styles.getPropertyValue('--font-mono').trim() || styles.fontFamily

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.lineJoin = 'round'

      const top = middle - rail
      const bottom = middle + rail
      const fontSize = Math.max(13, 20 * scale)
      context.font = `600 ${fontSize}px ${mono}`
      if ('letterSpacing' in context) context.letterSpacing = '0.3em'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      const labels = [
        { text: 'VINAYA', y: top },
        { text: 'HARNESS', y: bottom }
      ]
      const labelGaps = labels.map((label) => Math.max(0, context.measureText(label.text).width) / 2 + 16 * scale)

      // The rail as a real beam on all four sides — two parallel edges with
      // perpendicular rungs between them (the hero emblem's ring band), instead of one
      // thick single stroke.
      const beamHalf = 5 * scale
      const hBeams = [
        { outer: top - beamHalf, inner: top + beamHalf, textY: top },
        { outer: bottom + beamHalf, inner: bottom - beamHalf, textY: bottom }
      ]
      const vBeams = [
        { outer: left - beamHalf, inner: left + beamHalf },
        { outer: right + beamHalf, inner: right - beamHalf }
      ]
      const vTop = hBeams[0]?.outer ?? top
      const vBottom = hBeams[1]?.outer ?? bottom

      context.strokeStyle = foreground
      context.lineWidth = 2.5
      context.beginPath()
      hBeams.forEach((beam, index) => {
        const center = (left + right) / 2
        const gap = labelGaps[index] ?? 0
        for (const y of [beam.outer, beam.inner]) {
          context.moveTo(left, y)
          context.lineTo(center - gap, y)
          context.moveTo(center + gap, y)
          context.lineTo(right, y)
        }
      })
      vBeams.forEach((beam) => {
        for (const x of [beam.outer, beam.inner]) {
          context.moveTo(x, vTop)
          context.lineTo(x, vBottom)
        }
      })
      context.stroke()

      context.globalAlpha = 0.5
      context.lineWidth = 1.75
      context.beginPath()
      const rungCount = 16
      for (let index = 1; index < rungCount; index++) {
        const x = left + (right - left) * (index / rungCount)
        for (const beam of hBeams) {
          context.moveTo(x, beam.outer)
          context.lineTo(x, beam.inner)
        }
      }
      const vRungCount = 5
      for (let index = 1; index < vRungCount; index++) {
        const y = vTop + (vBottom - vTop) * (index / vRungCount)
        for (const beam of vBeams) {
          context.moveTo(beam.outer, y)
          context.lineTo(beam.inner, y)
        }
      }
      context.stroke()
      context.globalAlpha = 1

      const bolt = (x: number, y: number) => {
        const radius = Math.max(9, 13 * scale)
        const hex = (r: number) => {
          context.beginPath()
          for (let index = 0; index < 6; index++) {
            const angle = (Math.PI / 3) * index - Math.PI / 6
            const pointX = Math.cos(angle) * r
            const pointY = Math.sin(angle) * r
            if (index === 0) context.moveTo(pointX, pointY)
            else context.lineTo(pointX, pointY)
          }
          context.closePath()
        }
        context.save()
        context.translate(x, y)
        context.rotate((1 - easedClose) * 0.6)
        hex(radius)
        context.fillStyle = background
        context.fill()
        context.strokeStyle = foreground
        context.lineWidth = 2.5
        context.stroke()
        context.globalAlpha = 0.7
        hex(radius * 0.55)
        context.lineWidth = 1.5
        context.stroke()
        context.globalAlpha = 1
        context.beginPath()
        context.moveTo(-radius * 0.5, radius * 0.5)
        context.lineTo(radius * 0.5, -radius * 0.5)
        context.stroke()
        context.restore()
      }
      for (const [x, y] of [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom]
      ] as const) {
        bolt(x, y)
      }

      context.fillStyle = foreground
      labels.forEach((label) => {
        context.fillText(label.text, (left + right) / 2, label.y)
      })
      if ('letterSpacing' in context) context.letterSpacing = '0px'

      context.lineWidth = 6
      context.beginPath()
      context.moveTo(left + 14 * scale, middle)
      context.lineTo(right - 14 * scale, middle)
      context.stroke()
      for (const x of [left + 14 * scale, right - 14 * scale]) {
        context.beginPath()
        context.arc(x, middle, 5, 0, Math.PI * 2)
        context.fillStyle = foreground
        context.fill()
      }

      const startFraction = 0.155
      const step = branchCount === 6 ? 0.088 : 0.13
      const span = (branchCount === 6 ? 0.15 : 0.2) * width
      const merges: number[] = []
      for (let index = 0; index < branchCount; index++) {
        const direction = index % 2 === 0 ? -1 : 1
        const startX = (startFraction + index * step) * width
        const endX = startX + span
        const y = middle + arc * direction
        const flatStart = startX + span * 0.3
        const flatEnd = endX - span * 0.3
        const radius = span * 0.16

        context.globalAlpha = 0.9
        context.strokeStyle = foreground
        context.lineWidth = 3.2
        context.beginPath()
        context.moveTo(startX, middle)
        context.bezierCurveTo(startX + radius, middle, flatStart - radius, y, flatStart, y)
        context.lineTo(flatEnd, y)
        context.bezierCurveTo(flatEnd + radius, y, endX - radius, middle, endX, middle)
        context.stroke()

        context.globalAlpha = 0.55
        context.fillStyle = foreground
        for (const fraction of [0.3, 0.66]) {
          context.beginPath()
          context.arc(flatStart + (flatEnd - flatStart) * fraction, y, 5.5, 0, Math.PI * 2)
          context.fill()
        }
        context.globalAlpha = 1
        merges.push(endX)
      }

      merges.forEach((x, index) => {
        const light = Math.max(0, Math.min(1, (mergeProgress - index * 0.1) / 0.24))
        const pop = light <= 0 ? 1 : light < 0.62 ? 0.45 + 0.65 * (light / 0.62) : 1.1 - 0.1 * ((light - 0.62) / 0.38)
        if (light > 0 && light < 1) {
          const grow = Math.min(1, light / 0.45)
          const fade = 1 - Math.max(0, (light - 0.45) / 0.55)
          context.strokeStyle = success
          context.lineWidth = 2
          context.globalAlpha = 0.5 * fade
          for (const direction of [-1, 1]) {
            const y = middle + rail * direction
            context.beginPath()
            context.moveTo(x, y)
            context.lineTo(x, y - rail * direction * grow)
            context.stroke()
          }
          context.globalAlpha = 1
        }
        if (light > 0.35) {
          const ring = Math.min(1, (light - 0.35) / 0.65)
          context.strokeStyle = success
          context.lineWidth = 2
          context.globalAlpha = 0.45 * (1 - ring)
          context.beginPath()
          context.arc(x, middle, 13 * scale * (1 + ring * 1.1), 0, Math.PI * 2)
          context.stroke()
          context.globalAlpha = 1
        }
        context.globalAlpha = 0.12
        context.beginPath()
        context.arc(x, middle, 13 * scale, 0, Math.PI * 2)
        context.fillStyle = foreground
        context.fill()
        context.globalAlpha = 1
        if (light > 0) {
          context.globalAlpha = light
          context.beginPath()
          context.arc(x, middle, 13 * scale * pop, 0, Math.PI * 2)
          context.fillStyle = success
          context.fill()
          context.globalAlpha = 1
        }
      })
    }

    const queuePaint = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(paint)
    }
    target.addEventListener('scroll', queuePaint, { passive: true })
    window.addEventListener('resize', queuePaint)
    const resizeObserver = new ResizeObserver(queuePaint)
    resizeObserver.observe(canvas)
    const poll = window.setInterval(queuePaint, 250)
    queuePaint()
    return () => {
      target.removeEventListener('scroll', queuePaint)
      window.removeEventListener('resize', queuePaint)
      resizeObserver.disconnect()
      window.clearInterval(poll)
      window.cancelAnimationFrame(animationFrame)
      conceptAnimations.forEach((animation) => {
        animation.cancel()
      })
    }
  }, [])

  return (
    <section className='border-b-2 border-border'>
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24'>
        <SectionOverline className='text-muted-foreground'>the software lifecycle you already run</SectionOverline>
        <SectionTitle className='mt-4'>Your GitHub, perfectly structured</SectionTitle>
        <div className='mt-10 flex flex-wrap gap-8 border-t border-border pt-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground'>
          <span>01 plan a milestone</span>
          <span>02 solve its tasks</span>
          <span>03 archive a milestone</span>
        </div>
        <Text className='mx-auto mt-10 max-w-2xl text-center font-serif text-3xl leading-tight tracking-tight sm:text-4xl'>
          A harness for your software engineering process.
        </Text>
        <div className='relative mt-8 h-[clamp(21rem,36vw,31.25rem)]'>
          <canvas
            ref={canvasRef}
            aria-label='A Vinaya harness closing around six branches as they merge into main'
            className='absolute inset-0 size-full text-foreground'
          />
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 hidden min-[700px]:block'>
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
      </div>
    </section>
  )
}
