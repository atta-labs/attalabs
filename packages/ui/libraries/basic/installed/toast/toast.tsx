'use client'

import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type React from 'react'
import type { ToastProps, ToastType } from '@atta/ui/types'

const getAnimationOffset = (position: ToastProps['position']) => {
  if (!position) return { y: 100 }
  if (position.endsWith('left')) return { x: -100 }
  if (position.endsWith('right')) return { x: 100 }
  if (position.startsWith('top-center')) return { y: -100 }
  return { y: 100 }
}

const notificationConfig: Record<
  ToastType,
  {
    bgColor: string
    borderColor: string
    iconColor: string
    icon: React.ReactNode
    progressColor: string
  }
> = {
  info: {
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    iconColor: 'text-primary',
    icon: <Info className='h-5 w-5' />,
    progressColor: 'bg-primary'
  },
  success: {
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    iconColor: 'text-success',
    icon: <CheckCircle2 className='h-5 w-5' />,
    progressColor: 'bg-success'
  },
  warning: {
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    iconColor: 'text-warning',
    icon: <AlertTriangle className='h-5 w-5' />,
    progressColor: 'bg-warning'
  },
  error: {
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    iconColor: 'text-destructive',
    icon: <XCircle className='h-5 w-5' />,
    progressColor: 'bg-destructive'
  },
  loading: {
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    iconColor: 'text-muted-foreground',
    icon: <Loader2 className='h-5 w-5 animate-spin' />,
    progressColor: 'bg-muted-foreground'
  }
}

export function Toast({
  type,
  title,
  message,
  showIcon = true,
  duration,
  onClose,
  position = 'bottom-right'
}: ToastProps) {
  const config = notificationConfig[type]
  const offset = getAnimationOffset(position)

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={{ duration: 0.25 }}
      className={`relative w-full max-w-sm overflow-hidden rounded-xl border backdrop-blur-xl ${config.bgColor} ${config.borderColor} bg-card/80 drop-shadow-xl`}
    >
      <div className='relative z-10 flex items-start gap-3 p-4'>
        {showIcon && <span className={`mt-0.5 shrink-0 ${config.iconColor}`}>{config.icon}</span>}
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium text-foreground'>{title}</p>
          {message && <p className='mt-0.5 text-xs text-muted-foreground'>{message}</p>}
        </div>
        <button
          type='button'
          onClick={onClose}
          className='shrink-0 text-muted-foreground transition-colors hover:text-foreground'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {duration && (
        <div className='h-0.5 w-full bg-border'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            onAnimationComplete={onClose}
            className={`h-full ${config.progressColor}`}
          />
        </div>
      )}
    </motion.div>
  )
}
