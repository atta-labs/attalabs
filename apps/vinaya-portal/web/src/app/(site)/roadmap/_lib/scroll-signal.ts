// The one "has the reader started scrolling" signal the roadmap's polish layers share —
// the idle rest weight, the SCROLL cue, the electricity gate and the particle layer all
// read it, so they hand over to each other in step. It is deliberately OUTSIDE
// `deployment-progress.ts`: that file's maths is pinned pure (geometry in, state out) and
// this is only a cosmetic weight read off the scroll offset, never fed back into it.

// Scroll distance (px) over which rest fades out and energy fades in. Past it the page
// counts as "scrolling".
export const SCROLL_START_PX = 70

// 0 at the very top, 1 once the reader has scrolled `SCROLL_START_PX`. Pure.
export function scrollWeight(scrolledPx: number): number {
  if (!(scrolledPx > 0)) return 0
  return scrolledPx >= SCROLL_START_PX ? 1 : scrolledPx / SCROLL_START_PX
}

// The page scrolls inside the shell's `h-dvh overflow-y-auto` container, not `window`, so
// walk up from `el` for the first scrollable ancestor. `null` means "use the window".
export function findScrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return null
}
