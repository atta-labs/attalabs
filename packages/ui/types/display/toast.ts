/** @category display */
import type * as React from 'react'

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'

export interface ToastProps {
  type: ToastType
  title: string
  message?: React.ReactNode
  showIcon?: boolean
  duration?: number
  onClose: () => void
  position?: ToastPosition
}

export interface ToastData {
  id: number
  type: ToastType
  title: string
  message?: React.ReactNode
  showIcon: boolean
  duration?: number
  position: ToastPosition
}

export interface ToastProviderProps {
  children: React.ReactNode
  defaultPosition?: ToastPosition
}

export interface ToastContextType {
  notifications: ToastData[]
  addToast: (
    type: ToastType,
    title: string,
    message?: React.ReactNode,
    duration?: number,
    position?: ToastPosition
  ) => number
  removeToast: (id: number) => void
  successToast: (title: string, message?: React.ReactNode, duration?: number, position?: ToastPosition) => number
  errorToast: (title: string, message?: React.ReactNode, duration?: number, position?: ToastPosition) => number
  warningToast: (title: string, message?: React.ReactNode, duration?: number, position?: ToastPosition) => number
  infoToast: (title: string, message?: React.ReactNode, duration?: number, position?: ToastPosition) => number
  loadingToast: (title: string, message?: React.ReactNode, duration?: number, position?: ToastPosition) => number
}
