// biome-ignore-all lint/suspicious/noExplicitAny: intentional loose contract — see DocCollectorComponents jsdoc
'use client'

import type { ComponentType } from 'react'
import { createComponentsContext } from '../lib/create-components-context'

/**
 * Components injected by the consuming app.
 *
 * DocCollector resolves NO library itself, mirroring SmartPromptInput's
 * injection contract (`.claude/skills/ui-library-system/SKILL.md`'s
 * "Cross-product composite components → Governance" section). The consuming
 * app injects its library's primitives via the `components` prop.
 *
 * Every entry is optional so the collector degrades gracefully during the
 * first-render window when a runtime library is still loading. When
 * undefined, the vendor falls back to a sane native element (textarea/button).
 *
 * The component types are intentionally loose (`ComponentType<any>`) — every
 * library's variant of the same primitive narrows props differently. The
 * contract is structural: pass a function component whose JSX rendering
 * accepts the props we hand it.
 */
export interface DocCollectorComponents {
  Textarea?: ComponentType<any>
  Button?: ComponentType<any>
  Input?: ComponentType<any>
}

const { Provider, useComponentsContext } = createComponentsContext<DocCollectorComponents>()

export const DocCollectorComponentsProvider = Provider
export const useDocCollectorComponents = useComponentsContext
