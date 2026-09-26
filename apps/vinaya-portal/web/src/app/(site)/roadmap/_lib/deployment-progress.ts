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
