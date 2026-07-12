'use client'

import type * as React from 'react'
import {
  Select,
  SelectContent as SelectContentBase,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '../../installed/select'

// retroui's installed Select defaults SelectContent to Radix `position="item-aligned"`,
// which anchors the dropdown over its trigger — the panel covers the selected value
// (observed on Herald settings Work Mode). basic defaults to `popper` (below the
// trigger). This wrapper flips retro's default to `popper` to match; the destructure
// default lets explicit callers still pass `position="item-aligned"` to opt back in.
// installed/select.tsx stays verbatim (D-065) — the default lives here.
function SelectContent({ position = 'popper', ...props }: React.ComponentProps<typeof SelectContentBase>) {
  return <SelectContentBase position={position} {...props} />
}
SelectContent.displayName = 'SelectContent'

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
}
