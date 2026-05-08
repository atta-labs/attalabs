'use client'

import type * as React from 'react'
import { Card, CardContent } from '../../../basic/components/content/card'
import { Button } from '../../../basic/components/interactive/button'
import { cn } from '../../../../lib/utils'
import { Heading } from '../typography/heading'

export interface TeamCardProps {
  title: string
  description: React.ReactNode
  faces: React.ReactNode
  titleAside?: React.ReactNode
  /** Optional model badge rendered on its own row below the title. */
  model?: React.ReactNode
  ctaLabel?: string
  onCtaClick?: () => void
  /** Disables the CTA even when the card is selected. Use for gating on external conditions (e.g. form validity). */
  ctaDisabled?: boolean
  selected: boolean
  onSelect: () => void
  className?: string
}

export function TeamCard({
  title,
  description,
  faces,
  titleAside,
  model,
  ctaLabel,
  onCtaClick,
  ctaDisabled,
  selected,
  onSelect,
  className
}: TeamCardProps) {
  return (
    <Card
      role='radio'
      aria-checked={selected}
      tabIndex={0}
      data-selected={selected || undefined}
      onClick={onSelect}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group relative flex flex-col gap-4',
        'border-2 transition-all duration-200 ease-out',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        selected ? 'cursor-default border-primary' : 'cursor-pointer border-transparent hover:border-border/40',
        className
      )}
    >
      <CardContent className='flex flex-col gap-4 pt-6'>
        <div className='flex flex-col'>
          <div className='flex items-baseline justify-between gap-3'>
            <Heading
              level={3}
              size='lg'
              className={cn(
                'font-serif transition-colors duration-200',
                selected ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {title}
            </Heading>
            {titleAside && <div className='shrink-0'>{titleAside}</div>}
          </div>
          {model && <div>{model}</div>}
        </div>

        <div
          className={cn(
            'text-sm leading-snug transition-colors duration-200',
            selected ? 'text-muted-foreground' : 'text-foreground/40'
          )}
        >
          {description}
        </div>

        <div className={cn('flex-1 transition-all duration-200 ease-out', !selected && 'opacity-60 grayscale')}>
          {faces}
        </div>

        {ctaLabel && onCtaClick && (
          <Button
            variant='default'
            size='default'
            className='w-full'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              onCtaClick()
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => event.stopPropagation()}
            disabled={!selected || ctaDisabled}
          >
            {ctaLabel}
          </Button>
        )}
      </CardContent>

      {!selected && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-lg',
            'bg-background/40',
            'transition-opacity duration-200 ease-out',
            'group-hover:bg-background/30'
          )}
        />
      )}
    </Card>
  )
}
