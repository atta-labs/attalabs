'use client'

import * as React from 'react'

interface ControlledStateProps<T> {
  value?: T
  defaultValue?: T
  onChange?: (value: T, ...args: any[]) => void
}

export function useControlledState<T>({
  value,
  defaultValue,
  onChange
}: ControlledStateProps<T>): readonly [T, (next: T, ...args: any[]) => void] {
  const [state, setInternalState] = React.useState<T>(value !== undefined ? value : (defaultValue as T))

  React.useEffect(() => {
    if (value !== undefined) setInternalState(value)
  }, [value])

  const setState = React.useCallback(
    (next: T, ...args: any[]) => {
      setInternalState(next)
      onChange?.(next, ...args)
    },
    [onChange]
  )

  return [state, setState] as const
}
