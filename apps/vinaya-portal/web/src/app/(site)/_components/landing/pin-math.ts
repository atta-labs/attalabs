export const PIN_MIN_WIDTH = 1000
export const PIN_MIN_HEIGHT = 620

export const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/** Pinned behaviour is on only for a roomy viewport. */
export const pinFits = (width: number, height: number) => width >= PIN_MIN_WIDTH && height >= PIN_MIN_HEIGHT

/** 0 when the section's top hits the viewport top, 1 when its bottom hits the viewport bottom. */
export const pinProgress = (top: number, height: number, viewport: number) =>
  clamp01(-top / Math.max(1, height - viewport))

/** Starts when the top crosses `start` of the viewport height; completes after `span` viewport heights. */
export const enterProgress = (top: number, viewport: number, start: number, span: number) =>
  clamp01((viewport * start - top) / (viewport * span))
