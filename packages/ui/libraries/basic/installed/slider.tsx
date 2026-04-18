'use client'

import * as SliderPrimitive from '@radix-ui/react-slider'
import type * as React from 'react'
import { cn } from '../../../lib/utils'

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot='slider'
      className={cn(
        'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot='slider-track'
        className='relative h-1 w-full grow overflow-hidden rounded-full bg-muted data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1'
      >
        <SliderPrimitive.Range
          data-slot='slider-range'
          className='absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot='slider-thumb'
        className='block h-3.5 w-3.5 rounded-full border border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
      />
    </SliderPrimitive.Root>
  )
}
