'use client'

import type { ReactNode } from 'react'
import type { ToastPosition } from '@atta/ui/types'
import type { ToastCardComponent } from '../libraries/basic/components/display/toast/toast-provider'
import { ToastProvider } from '../libraries/basic/components/display/toast/toast-provider'
import { useComponents } from './library-provider'

/**
 * Mounts the ONE shared toast context/provider immediately (zero regression —
 * `useToastContext()` always has a provider from first render), then swaps in
 * the active library's own `Toast` card once `useComponents()` resolves it.
 * `CardComponent={undefined}` during the load window falls back to
 * `ToastProvider`'s own default (basic's card) via its prop default, matching
 * pre-existing behavior exactly until the real library loads.
 */
export function ActiveToastProvider({
  children,
  defaultPosition
}: {
  children: ReactNode
  defaultPosition?: ToastPosition
}) {
  const { Toast } = useComponents()
  return (
    <ToastProvider defaultPosition={defaultPosition} CardComponent={Toast as ToastCardComponent | undefined}>
      {children}
    </ToastProvider>
  )
}
