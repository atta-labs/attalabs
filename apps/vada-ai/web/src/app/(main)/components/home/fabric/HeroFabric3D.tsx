'use client'

import { type RefObject, useEffect, useRef } from 'react'
import type { FaceStyle } from '@/components/agents'
import { AGENT_LIST } from '@/components/agents/visuals'
import { buildAgentFaceCanvases } from './agent-face-canvases'

/* Class strings for the letters the scene splits into <i> tags — authored here so Tailwind's
   @source scan (.ts/.tsx only) generates them. Vinaya's `VinayaHeroEmblem.tsx` LETTER_CLASS. */
const LABEL_CLASS = {
  word: 'inline-block whitespace-nowrap',
  letter: 'inline-block not-italic',
  name: 'absolute top-0 left-0 whitespace-nowrap font-mono text-xs uppercase tracking-widest opacity-0'
}

/* The Synthesizer is the hub: every reviewer's answer goes to it and it writes the conclusion — how
   Vāda's Outside Read team runs. It does not hand out the question: that reaches each reviewer directly. The rest sit on the arc, left to right. */
const HUB = 'Synthesizer'
const tokenOf = (role: string) => `--agent-${role.replaceAll('_', '-')}`
const hub = AGENT_LIST.find((a) => a.name === HUB) ?? { name: HUB, role: 'synthesizer' }

/* What each reviewer is doing while it works, as the hub's live panel shows it — the tool it
   reached for, or the kind of reasoning it is doing. */
const TOOLS: Record<string, string> = {
  Strategist: 'scenarios',
  Critic: 'web_fetch',
  "Devil's Advocate": 'reframing',
  Researcher: 'web_search'
}
/* The hero's own name for one role, display only (the agent itself, and every other page, keep
   its name): every label is then one professional role. The Devil's Advocate's prompt audits the
   question's framing, so here it is the Reframer. */
const HERO_NAMES: Record<string, string> = { "Devil's Advocate": 'Reframer' }
const heroName = (name: string) => HERO_NAMES[name] ?? name

/* The hero runs Vāda's Outside Read team: four reviewers answering the question in parallel, each
   on its own, and the Synthesizer writing the result from their answers (`vada-fusion-native.yaml`:
   a Devil's Advocate, a Researcher, a Critic and a Strategist). So the Operator sits this one out. */
const PANEL_ROLES = new Set(['strategist', 'critic', 'devils_advocate', 'researcher'])

const reviewers = AGENT_LIST.flatMap((a, faceIndex) =>
  a.name === hub.name || !PANEL_ROLES.has(a.role)
    ? []
    : [{ name: heroName(a.name), token: tokenOf(a.role), faceIndex, tool: TOOLS[a.name] ?? 'thinking' }]
)
/* The hub's three beats: the question, the live deliberation, the verdict — with the Reframer's
   dissent kept on record rather than erased. */
const SCRIPT = {
  hub: { name: hub.name, token: tokenOf(hub.role) },
  reviewers,
  hubText: {
    questionLabel: 'QUESTION',
    question: 'Should we ship it?',
    liveLabel: 'LIVE DELIBERATION',
    reconciling: 'reconciling',
    dissents: 'dissents',
    verdictLabel: 'VERDICT',
    decision: 'Ship it',
    tally: `${reviewers.length - 1} of ${reviewers.length} recommend shipping`,
    dissenter: heroName("Devil's Advocate"),
    dissentLabel: `${heroName("Devil's Advocate")} · dissent recorded`
  }
}

/* How far down (rem) the scene's centre sits in the hero viewport — Vinaya's FRAME_SHIFT_REM. */
export const FRAME_SHIFT_REM = 7

interface HeroScene {
  setFaces: (canvases: HTMLCanvasElement[]) => void
  setRing: (revealed: number) => void
  dispose: () => void
}

// Mounts the hero scene (Vinaya's fabric, floaters, scroll camera tip and headline scrub, plus
// Vāda's driver and agent ring) on the given canvas. `three` is loaded by dynamic import so it
// stays out of the SSR graph. Returns nothing; `revealed` brings the cores up, and scroll drives
// the rest of the deliberation inside the scene.
export function useHeroScene({
  canvasRef,
  rootRef,
  trackRef,
  labelsRef,
  faceStyle,
  revealed
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  rootRef: RefObject<HTMLDivElement | null>
  trackRef: RefObject<HTMLElement | null>
  labelsRef: RefObject<HTMLDivElement | null>
  faceStyle: FaceStyle
  revealed: number
}) {
  const sceneRef = useRef<HeroScene | null>(null)
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed

  useEffect(() => {
    let cancelled = false
    import('./fabric-scene').then(({ mountHeroScene }) => {
      const canvas = canvasRef.current
      const root = rootRef.current
      const track = trackRef.current
      const labels = labelsRef.current
      if (cancelled || !canvas || !root || !track || !labels) return
      const scene: HeroScene = mountHeroScene({
        canvas,
        root,
        track,
        labelClass: LABEL_CLASS,
        labels,
        script: SCRIPT,
        frameShiftRem: FRAME_SHIFT_REM
      })
      sceneRef.current = scene
      scene.setRing(revealedRef.current)
    })
    return () => {
      cancelled = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [canvasRef, rootRef, trackRef, labelsRef])

  useEffect(() => {
    let cancelled = false
    buildAgentFaceCanvases(faceStyle).then((canvases) => {
      if (cancelled) return
      const apply = () => (sceneRef.current ? sceneRef.current.setFaces(canvases) : requestAnimationFrame(apply))
      apply()
    })
    return () => {
      cancelled = true
    }
  }, [faceStyle])

  useEffect(() => {
    sceneRef.current?.setRing(revealed)
  }, [revealed])
}
