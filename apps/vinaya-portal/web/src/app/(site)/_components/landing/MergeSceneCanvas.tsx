'use client'

import { useEffect, useRef } from 'react'

// Mounts the ported merge scene (`merge-scene/merge-scene.js`) behind a dynamic import so `three`
// stays out of the SSR module graph, and tears it down on unmount (App Router remounts, StrictMode
// double-invokes effects). The scene finds its runway through the enclosing <section> and the
// `[data-letter-reveal]` / `[data-sub-reveal]` elements inside it.
export function MergeSceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    import('./merge-scene/merge-scene').then(({ mountMerge }) => {
      if (cancelled || !canvasRef.current) return
      dispose = mountMerge(canvasRef.current)
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
