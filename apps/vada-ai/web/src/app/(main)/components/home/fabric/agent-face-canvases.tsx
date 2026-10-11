import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FaceStyle } from '@/components/agents'
import { AGENT_FACES as EMBLEMATIC_FACES } from '@/components/agents/faces/agent-faces-full'
import { AGENT_FACES as REDUCTIVE_FACES } from '@/components/agents/faces/agent-faces-minimal'

// Ring order, clockwise from the top — matches each agent's `faceIndex` and its --agent-* token.
const AGENT_TOKENS = [
  '--agent-strategist',
  '--agent-critic',
  '--agent-devils-advocate',
  '--agent-synthesizer',
  '--agent-researcher',
  '--agent-operator'
]

const SIZE = 1024
// The face keeps to the flat middle of the sphere: with a wide margin it never reaches the
// patch's edges, where the curve squashes and stretches the drawing.
const INSET = 0.16
// The faces are filled outlines drawn for larger sizes; a thin stroke of the same colour thickens
// every line by about this many canvas pixels, so they don't look scratchy at sphere size.
const THICKEN_PX = 2.4

/* The 3D spheres wear the agents' real faces: each face SVG (pure path data on `currentColor`)
   is rendered to markup, its colour resolved from the agent's own token, and rasterised to a
   canvas the scene turns into a texture. */
export async function buildAgentFaceCanvases(faceStyle: FaceStyle): Promise<HTMLCanvasElement[]> {
  const faces: readonly ComponentType[] = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const rootStyle = getComputedStyle(document.documentElement)

  return Promise.all(
    AGENT_TOKENS.map(async (token, i) => {
      const Face = faces[i]
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      if (!Face) return canvas
      const color = rootStyle.getPropertyValue(token).trim() || rootStyle.getPropertyValue('--foreground').trim()
      const inner = SIZE * (1 - INSET * 2)
      const raw = renderToStaticMarkup(<Face />)
      // the stroke is set in the SVG's own units, so convert the pixel thickening through its viewBox
      // (the face is fitted into a square, so its longer side sets the scale)
      const vb = raw.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)/)
      const vbSide = vb ? Math.max(Number(vb[1]), Number(vb[2])) : inner
      const stroke = (THICKEN_PX * vbSide) / inner
      const markup = raw
        .replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" color="${color}"`)
        .replaceAll('stroke="none"', `stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"`)
        .replace(/width="100%"/, `width="${inner}"`)
        .replace(/height="100%"/, `height="${inner}"`)
      const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
      try {
        const img = new Image()
        img.src = url
        await img.decode()
        canvas.getContext('2d')?.drawImage(img, SIZE * INSET, SIZE * INSET, inner, inner)
      } finally {
        URL.revokeObjectURL(url)
      }
      return canvas
    })
  )
}
