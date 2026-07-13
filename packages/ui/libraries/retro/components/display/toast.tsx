'use client'

import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type React from 'react'
import type { ToastProps, ToastType } from '@atta/ui/types'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../installed/alert'
import { cn } from '../../../../lib/utils'

const toastConfig: Record<ToastType, { className: string; icon: React.ReactNode; progressClassName: string }> = {
  info: {
    className: 'border-primary/30 bg-primary/10 text-primary *:data-[slot=alert-description]:text-primary/80',
    icon: <Info className='size-5' />,
    progressClassName: 'bg-primary'
  },
  success: {
    className: 'border-success/30 bg-success/10 text-success *:data-[slot=alert-description]:text-success/80',
    icon: <CheckCircle2 className='size-5' />,
    progressClassName: 'bg-success'
  },
  warning: {
    className: 'border-warning/30 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/80',
    icon: <AlertTriangle className='size-5' />,
    progressClassName: 'bg-warning'
  },
  error: {
    className:
      'border-destructive/30 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/80',
    icon: <XCircle className='size-5' />,
    progressClassName: 'bg-destructive'
  },
  loading: {
    className: 'border-muted bg-muted/50 text-muted-foreground *:data-[slot=alert-description]:text-muted-foreground',
    icon: <Loader2 className='size-5 animate-spin' />,
    progressClassName: 'bg-muted-foreground'
  }
}

export function Toast({ type, title, message, showIcon = true, duration, onClose }: ToastProps) {
  const config = toastConfig[type]

  return (
    <Alert className={cn('w-full max-w-sm', config.className)}>
      {showIcon && config.icon}
      <AlertTitle>{title}</AlertTitle>
      {message && <AlertDescription>{message}</AlertDescription>}
      <AlertAction>
        <button
          type='button'
          onClick={onClose}
          aria-label='Dismiss'
          className='text-current transition-opacity hover:opacity-70'
        >
          <X className='size-4' />
        </button>
      </AlertAction>
      {duration && (
        <div className='absolute inset-x-0 bottom-0 h-0.5 w-full overflow-hidden rounded-b bg-border'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            onAnimationComplete={onClose}
            className={cn('h-full', config.progressClassName)}
          />
        </div>
      )}
    </Alert>
  )
}
