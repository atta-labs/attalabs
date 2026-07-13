'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import type {
  ToastContextType,
  ToastData,
  ToastPosition,
  ToastProps,
  ToastProviderProps,
  ToastType
} from '@atta/ui/types'
import { Toast } from '../../../installed/toast/toast'

/**
 * Not part of the `@atta/ui/types` contract — a library-specific override for
 * which card renders each toast. `createToastProvider` stays internal so the
 * shared `ToastProviderProps` contract type is never widened for this.
 */
type ToastCardComponent = ComponentType<ToastProps>

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const getPositionClasses = (position: ToastPosition): string => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4'
    case 'top-right':
      return 'top-4 right-4'
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2'
    case 'bottom-left':
      return 'bottom-4 left-4'
    case 'bottom-right':
      return 'bottom-4 right-4'
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2'
  }
}

export function createToastProvider(CardComponent: ToastCardComponent = Toast) {
  return function ToastProvider({ children, defaultPosition = 'bottom-right' }: ToastProviderProps) {
    const [notifications, setNotifications] = useState<ToastData[]>([])
    const [isClient, setIsClient] = useState(false)
    const nextIdRef = useRef(1)

    useEffect(() => {
      setIsClient(true)
    }, [])

    const addToast = (
      type: ToastType,
      title: string,
      message?: ReactNode,
      duration?: number,
      positionOverride?: ToastPosition
    ): number => {
      const id = nextIdRef.current++
      setNotifications((prev) => [
        ...prev,
        { id, type, title, message, showIcon: true, duration, position: positionOverride ?? defaultPosition }
      ])
      return id
    }

    const removeToast = (id: number) => setNotifications((prev) => prev.filter((t) => t.id !== id))

    const contextValue: ToastContextType = {
      notifications,
      addToast,
      removeToast,
      successToast: (title, message?, duration = 3000, position?) =>
        addToast('success', title, message, duration, position),
      errorToast: (title, message?, duration = 5000, position?) =>
        addToast('error', title, message, duration, position),
      warningToast: (title, message?, duration = 4000, position?) =>
        addToast('warning', title, message, duration, position),
      infoToast: (title, message?, duration = 4000, position?) => addToast('info', title, message, duration, position),
      loadingToast: (title, message?, duration?, position?) => addToast('loading', title, message, duration, position)
    }

    const byPosition = notifications.reduce<Record<string, ToastData[]>>((acc, toast) => {
      const bucket = acc[toast.position] ?? []
      acc[toast.position] = bucket
      bucket.push(toast)
      return acc
    }, {})

    return (
      <ToastContext.Provider value={contextValue}>
        {children}
        {isClient &&
          Object.entries(byPosition).map(([position, toasts]) => (
            <div
              key={position}
              className={`fixed z-50 flex flex-col gap-2 ${getPositionClasses(position as ToastPosition)}`}
            >
              <AnimatePresence>
                {toasts.map((toast) => (
                  <CardComponent key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
                ))}
              </AnimatePresence>
            </div>
          ))}
      </ToastContext.Provider>
    )
  }
}

export const ToastProvider = createToastProvider()

export function useToastContext(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within a ToastProvider')
  return ctx
}
