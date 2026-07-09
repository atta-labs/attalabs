'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Shared factory for a composite's injection-contract context. Every shared
 * composite (`SmartPromptInput`, `DocCollector`, ...) resolves NO library
 * itself — the consuming app injects its library's primitives via a
 * `components` prop, threaded through a private context so internal
 * subtrees can resolve them without prop drilling. See
 * `.claude/skills/ui-library-system/SKILL.md`'s "Cross-product composite
 * components → Governance" section.
 *
 * Each composite still owns its own `components` shape (its own `T`) and its
 * own exported Provider/hook names — this factory only removes the
 * boilerplate of wiring `createContext`/`Provider`/`useContext` by hand for
 * each one.
 */
export function createComponentsContext<T extends object>() {
  const Context = createContext<T>({} as T)

  function Provider({ components, children }: { components: T | undefined; children: ReactNode }) {
    return <Context.Provider value={components ?? ({} as T)}>{children}</Context.Provider>
  }

  function useComponentsContext(): T {
    return useContext(Context)
  }

  return { Provider, useComponentsContext }
}
