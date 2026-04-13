'use client'

import { motion } from 'framer-motion'
import type React from 'react'
import type { ToastProps, ToastType } from '@atta/ui/types'

interface IconProps {
  className?: string
}

const InfoIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
)
const SuccessIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
)
const WarningIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    />
  </svg>
)
const ErrorIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
)
const CloseIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
  </svg>
)
const LoadingSpinner: React.FC<IconProps> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
    />
  </svg>
)

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
    icon: <InfoIcon className='h-5 w-5' />,
    progressColor: 'bg-primary'
  },
  success: {
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    iconColor: 'text-success',
    icon: <SuccessIcon className='h-5 w-5' />,
    progressColor: 'bg-success'
  },
  warning: {
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    iconColor: 'text-warning',
    icon: <WarningIcon className='h-5 w-5' />,
    progressColor: 'bg-warning'
  },
  error: {
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    iconColor: 'text-destructive',
    icon: <ErrorIcon className='h-5 w-5' />,
    progressColor: 'bg-destructive'
  },
  loading: {
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    iconColor: 'text-muted-foreground',
    icon: <LoadingSpinner className='h-5 w-5' />,
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
          <CloseIcon className='h-4 w-4' />
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
