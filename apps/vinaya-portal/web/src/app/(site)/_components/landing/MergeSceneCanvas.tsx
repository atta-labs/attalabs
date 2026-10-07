'use client'

import { useEffect, useRef } from 'react'
import type { TerminalLine } from './Terminal'

/** What the scene reports about its event log: the lines that are on (the newest six). */
export type SceneLog = { lines: TerminalLine[] }

// Mounts the ported merge scene (`merge-scene/merge-scene.js`) behind a dynamic import so `three`
// stays out of the SSR module graph, and tears it down on unmount (App Router remounts, StrictMode
// double-invokes effects). The scene finds its runway through the enclosing <section> and the
// `[data-letter-reveal]` / `[data-sub-reveal]` elements inside it. `still` holds it at its end state
// (a flowing section has no runway to scrub); it is read every frame, so flipping it never remounts.
export function MergeSceneCanvas({ still, onLog }: { still: boolean; onLog: (log: SceneLog) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stillRef = useRef(still)
  stillRef.current = still
  const onLogRef = useRef(onLog)
  onLogRef.current = onLog

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    import('./merge-scene/merge-scene').then(({ mountMerge }) => {
      if (cancelled || !canvasRef.current) return
      dispose = mountMerge(
        canvasRef.current,
        () => stillRef.current,
        (log: SceneLog) => onLogRef.current(log)
      )
    })
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      role='img'
      aria-label='Branches fork off the feature and merge back green; zooming out, the feature itself comes off main and merges back into it'
      className='absolute inset-0 block size-full [mask-image:linear-gradient(to_bottom,transparent_0,var(--foreground)_22%)]'
    />
  )
}
