/** @category chrome */
import type * as React from 'react'

/**
 * Which piece of app chrome the frame is dressing. The frame owns only the
 * per-library EDGE treatment (float vs flush); the consumer supplies the shared
 * inner layout via `className` and the content via `children`.
 */
export type ChromeFrameVariant = 'topbar' | 'rail' | 'panel'

/**
 * Library-resolved chrome frame contract. Every library exports a `ChromeFrame`;
 * the flush libraries (basic/animate/brutal) render the chrome edge-to-edge
 * (a `border-b` bar or a `border-r` rail), while retro wraps it in its own Card
 * with a small margin so its offset shadow reads — the "floating" look. This is
 * how retro's spacing stays retro's and never leaks onto other products, with no
 * `library === '…'` branch in shared code.
 *
 * `className` is applied to the SURFACE element (the flush div, or retro's inner
 * Card) — i.e. the element that carries the shared inner layout — so a consumer
 * tunes the content box, not the float margin.
 */
export type ChromeFrameProps = React.ComponentPropsWithoutRef<'div'> & {
  variant: ChromeFrameVariant
}
