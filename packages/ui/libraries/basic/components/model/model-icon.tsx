'use client'

import { ModelIcon as LobeModelIcon } from '@lobehub/icons'
import type { ComponentProps } from 'react'

export type ModelIconProps = ComponentProps<typeof LobeModelIcon>

export function ModelIcon({ size = 14, type = 'avatar', ...rest }: ModelIconProps) {
  return <LobeModelIcon size={size} type={type} {...rest} />
}
