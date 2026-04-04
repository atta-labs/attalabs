import { createElement, useEffect, useState } from 'react'

interface LibraryPreviewProps {
  libraryId?: string
}

/**
 * Custom preview media for library documents.
 * Renders a style-specific border treatment:
 * - basic: rounded border with soft shadow
 * - retro/brutal: double nested borders (white outer, black inner)
 * - animate: rotating gradient border animation
 */
export function LibraryPreview({ libraryId }: LibraryPreviewProps) {
  const [phase, setPhase] = useState(0)
  const isAnimate = libraryId === 'animate'
  const isRetro = libraryId === 'retro' || libraryId === 'brutal'

  useEffect(() => {
    if (!isAnimate) return
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 100)
    }, 30)
    return () => clearInterval(interval)
  }, [isAnimate])

  const inner = createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      borderRadius: isRetro ? '0' : '4px'
    }
  })

  if (isRetro) {
    return createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          border: '2px solid #fff',
          boxSizing: 'border-box' as const
        }
      },
      createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            border: '3px solid #000',
            boxSizing: 'border-box' as const
          }
        },
        inner
      )
    )
  }

  if (isAnimate) {
    const angle = (phase * 3.6) % 360
    return createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          padding: '2px',
          borderRadius: '6px',
          background: `linear-gradient(${angle}deg, #6366f1, #a855f7, #6366f1, #a855f7)`,
          boxSizing: 'border-box' as const
        }
      },
      inner
    )
  }

  // Default (basic)
  return createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        padding: '2px',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.15)',
        boxSizing: 'border-box' as const
      }
    },
    inner
  )
}
