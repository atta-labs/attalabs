'use client'

import { useEffect, useRef } from 'react'

// The Vinaya harness mark itself — the same <canvas> painting LifecycleHarnessSection
// draws (box, bolts, VINAYA/HARNESS labels, branches merging into main), extracted so
// other sections can drop in the real thing instead of a stand-in shape. No concept
// badges here — those are specific to the lifecycle section's own copy.
function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function HarnessCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const target = scrollParent(canvas)
    let animationFrame = 0

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
      // The box itself can be much taller than wide (a portrait phone's h-[70vh] against a
      // narrow column) — that height is scroll runway for the progress math above, not a
      // shape the FRAME should fill. Cap the frame to a landscape aspect and center it in
      // the box, so a tall box gets a normal-looking frame plus blank space above/below,
      // instead of the frame itself stretching into a tall empty rectangle.
      const FRAME_MAX_ASPECT = 1.3 // width:height the drawn frame will never exceed
      const frameHeight = Math.min(height, width / FRAME_MAX_ASPECT)
      const frameTop = (height - frameHeight) / 2
      const middle = frameTop + frameHeight / 2
      const scale = frameHeight / 520
      const closeProgress = Math.min(1, progress / 0.42)
      const mergeProgress = Math.max(0, (progress - 0.42) / 0.58)
      const overshoot = (value: number) => {
        const amount = 1.24
        return 1 + (amount + 1) * (value - 1) ** 3 + amount * (value - 1) ** 2
      }
      const easedClose = closeProgress <= 0 ? 0 : closeProgress >= 1 ? 1 : overshoot(closeProgress)
      const half = frameHeight / 2 - 14
      // The harness frame itself (rail position, left/right edges) is fixed — only the
      // branches inside it (arc, below) and the concept badges animate. It used to
      // interpolate from an "open" box down to this closed geometry as you scrolled,
      // which read as the whole harness contracting; LifecycleHarnessSection already
      // targets this exact closed geometry for badge placement, so anchoring the frame
      // here permanently is the fix, not a new constant.
      const rail = half * 0.85
      // Branch curve height is fixed too, same reasoning as the frame above — the
      // branches stay open the whole time, they don't flatten out as you scroll. 0.4
      // (not the full 1.0) is deliberate: at full height the peaks crowd the top rail
      // with no clearance left for the concept badge row between them.
      const arc = (rail / 1.55) * 0.4
      const left = 0.09 * width
      const right = 0.955 * width
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
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-label='The Vinaya harness closing around branches as they merge into main'
      className={`text-foreground ${className}`}
    />
  )
}
