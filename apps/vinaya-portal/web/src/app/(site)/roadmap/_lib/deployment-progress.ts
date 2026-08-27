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
