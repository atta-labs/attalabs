// Pure math extracted from `DeploymentTrack.tsx`'s scroll effect — the two formulas that
// actually drive the whole scroll-linked animation (how far the beam has deployed, and how
// far through its own junction/spur/panel stages each card is), kept in `_lib/` rather than
// inline so they're testable without a DOM/canvas, same precedent as `derive-status.ts`.

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// `H` = the track's total scrollable height, `line` = the viewport-relative y the beam
// tip tracks toward (`CONFIG.beamLine`% down the viewport), `trackTop` = the track's own
// top edge, viewport-relative (`track.getBoundingClientRect().top`). Clamped to `[0, H]`
// so the beam neither retracts past its origin nor overshoots the track's own length.
export function computeDeployedPx(H: number, line: number, trackTop: number): number {
  return Math.max(0, Math.min(H, line - trackTop))
}

// One card's own progress (0→1) from the beam first reaching it (`deployed === cardMid`)
// to fully clearing `spurReach` past it. Extracted out of the per-frame DOM loop (rather
// than left inline there) so the "state is a pure function of current scroll position,
// recomputed fresh every frame" contract is a named, tested function instead of an
// implicit property of the loop body — nothing here reads viewport width or a prior
// frame's value, so the same `(deployed, cardMid, spurReach)` triple always yields the
// same `q`, on either side of the 840px layout split, whether reached by scrolling down
// or back up.
export function computeCardProgress(deployed: number, cardMid: number, spurReach: number): number {
  return clamp01((deployed - cardMid) / spurReach)
}

// `q` is one card's own progress (0→1) from the beam first reaching it to fully clearing
// `CONFIG.spurReach` past it. The three CSS custom properties this drives are staged
// windows over that same `q`, each renormalized to its own 0→1 range and clamped, so
// scrolling back through a card rewinds every stage exactly, never jumping: junction
// seats over 0→0.26, spur extends over 0.26→0.60, panel arrives over 0.58→1 — the spur
// and panel windows overlap slightly (0.58→0.60), so the panel starts fading in just
// before the spur finishes extending, rather than waiting for a hard handoff.
export function computeCardStageProgress(q: number): { b: number; a: number; c: number } {
  return {
    b: clamp01(q / 0.26),
    a: clamp01((q - 0.26) / 0.34),
    c: clamp01((q - 0.58) / 0.42)
  }
}

// 22px of beam travel between two frames reads as full speed — the designer handoff's own
// sensitivity constant for the head's velocity input (cosmetic crackle/glow only).
const VELOCITY_FULL_SPEED_PX = 22

export type CardOffset = { top: number; height: number }

// Everything the scroll effect measures fresh from the DOM this frame — no history, no
// carried state. `line` is the already-resolved viewport-relative y the beam tip tracks
// toward (`(window.innerHeight * CONFIG.beamLine) / 100`), matching `computeDeployedPx`'s
// own `line` parameter.
export type TrackFrameGeometry = {
  reduced: boolean
  trackHeight: number
  trackTop: number
  line: number
  spurReach: number
  cardOffsets: CardOffset[]
}

// The only state the real effect carries from one frame to the next: the previous frame's
// deployed position (to measure how far the beam just moved) and the running velocity
// target itself. Both feed the cosmetic velocity output below — neither may feed `deployed`
// or a card's stage.
export type TrackFrameHistory = {
  lastDeployed: number | null
  velTarget: number
}

export type TrackFrameResult = {
  deployed: number
  cardStages: Array<{ b: number; a: number; c: number }>
  velTarget: number
  installDoneAt: number
}

// The full per-frame computation `DeploymentTrack.tsx`'s scroll effect calls — split out so
// the "state is a pure function of current scroll position, nothing carried across frames
// feeds it" contract is a property THIS function can be tested against directly, rather than
// trusted by reading the call site. `deployed` and every card's stage come from `geometry`
// alone; `history` — the one thing the real effect keeps in a ref across frames — feeds
// ONLY the returned `velTarget` (cosmetic crackle/glow intensity elsewhere), never a card's
// `--b`/`--a`/`--c` or the beam's own position. Holding `geometry` fixed and varying
// `history` must never move `deployed` or `cardStages` — a test that violates this by
// blending history into position is exactly the regression this split guards against.
export function computeTrackFrame(geometry: TrackFrameGeometry, history: TrackFrameHistory): TrackFrameResult {
  const { reduced, trackHeight, trackTop, line, spurReach, cardOffsets } = geometry
  const deployed = reduced ? trackHeight : computeDeployedPx(trackHeight, line, trackTop)

  let velTarget = history.velTarget
  if (history.lastDeployed !== null) {
    const delta = Math.abs(deployed - history.lastDeployed)
    velTarget = Math.max(velTarget, Math.min(1, delta / VELOCITY_FULL_SPEED_PX))
  }

  const cardStages = cardOffsets.map(({ top, height }) => {
    const mid = top + height / 2
    const q = reduced ? 1 : computeCardProgress(deployed, mid, spurReach)
    return computeCardStageProgress(q)
  })

  const last = cardOffsets[cardOffsets.length - 1]
  const installDoneAt = last ? last.top + last.height / 2 + spurReach : Number.POSITIVE_INFINITY

  return { deployed, cardStages, velTarget, installDoneAt }
}
