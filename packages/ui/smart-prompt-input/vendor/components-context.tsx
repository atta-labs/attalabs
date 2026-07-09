// biome-ignore-all lint/suspicious/noExplicitAny: intentional loose contract — see SmartPromptComponents jsdoc
'use client'

import type { ComponentType } from 'react'
import { createComponentsContext } from '../../lib/create-components-context'

/**
 * Components injected by the consuming app.
 *
 * SmartPromptInput resolves NO library itself. Both consumers (Vāda build-time,
 * Herald runtime via `useComponents()`) inject their library's primitives via
 * the `components` prop. The vendored chrome resolves these via this context.
 *
 * Every entry is optional so the input degrades gracefully during the
 * first-render window when a runtime library is still loading — same pattern
 * Herald's `JDInput` uses for `Button`/`Badge`. When undefined, the vendor
 * falls back to a sane native element (textarea / button / inline div).
 *
 * The component types are intentionally loose (`ComponentType<any>`) — every
 * library's variant of the same primitive narrows props differently (Radix
 * forwardRef + literal `align: 'start'|'center'|'end'` vs our looser strings).
 * The contract is structural: pass us a function component whose JSX rendering
 * accepts the props we hand it. No deeper guarantee is possible across all
 * four shipped libraries without per-library type wrapping.
 */
export interface SmartPromptComponents {
  Textarea?: ComponentType<any>
  Button?: ComponentType<any>
  DropdownMenu?: ComponentType<any>
  DropdownMenuTrigger?: ComponentType<any>
  DropdownMenuContent?: ComponentType<any>
  DropdownMenuItem?: ComponentType<any>
}

const { Provider, useComponentsContext } = createComponentsContext<SmartPromptComponents>()

export const SmartPromptComponentsProvider = Provider
export const useSmartPromptComponents = useComponentsContext
