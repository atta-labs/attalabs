/**
 * The checks-side resolver — a pure function, no I/O, no `@atta/aeg-core`
 * import (mirrors `contract.ts`'s own "pure contract" discipline).
 *
 * Feeds `vinaya check --plan` / `--plan --json` ONLY. `vinaya check`'s real
 * execution (`check.ts:76`) stays on today's flat concat, untouched — this
 * resolver is not wired into execution until a later release. See the
 * Configuration architecture chapter, `apps/vinaya/specs/vinaya-spec.md`.
 */
import type { CheckEntry } from '../lib/config'
import type { CheckSpec } from './contract'

export type ResolutionState = 'default' | 'overridden' | 'additive'

export type ResolvedCheck = {
  name: string
  state: ResolutionState
  source: 'core' | 'config'
  spec: CheckSpec
}

export type ResolverFailure = {
  key: string
  reason: string
}

export type ResolveResult = {
  resolved: ResolvedCheck[]
  failures: ResolverFailure[]
}

const NAMESPACE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/
const RESERVED_PREFIX = 'vinaya'

/**
 * Exactly one `/`, both segments non-empty and matching `[a-z0-9][a-z0-9-]*`,
 * with `vinaya` reserved as an exact segment match (`vinaya/x` rejected,
 * `vinayatools/x` fine — a startsWith check would wrongly reject the latter).
 */
export function isValidNamespacedKey(key: string): boolean {
  const parts = key.split('/')
  if (parts.length !== 2) return false
  const [prefix, rest] = parts
  if (!prefix || !rest) return false
  if (!NAMESPACE_SEGMENT.test(prefix) || !NAMESPACE_SEGMENT.test(rest)) return false
  if (prefix === RESERVED_PREFIX) return false
  return true
}

/**
 * `resolved = core_registry ⊕ overridden-by-exact-key-match ⊕
 * additive-by-namespace-grammar`. Uniqueness among `core`'s own names is
 * guaranteed by `registry.ts` (15 distinct names) — not re-checked here.
 *
 * Render order is core order, then config's own key-iteration order for
 * additive entries — stable for deterministic table/JSON rendering. This is
 * distinct from "order-independent" classification (spec chapter, Resolution
 * algorithm section): which state a key resolves to never depends on
 * config-file key order, but render order legitimately follows file order.
 */
export function resolveChecks(core: CheckSpec[], configChecks: Record<string, CheckEntry> | undefined): ResolveResult {
  const resolved: ResolvedCheck[] = core.map((spec) => ({ name: spec.name, state: 'default', source: 'core', spec }))
  const failures: ResolverFailure[] = []

  if (!configChecks) return { resolved, failures }

  const indexByName = new Map(resolved.map((entry, index) => [entry.name, index]))

  for (const [key, entry] of Object.entries(configChecks)) {
    const coreIndex = indexByName.get(key)
    if (coreIndex !== undefined) {
      resolved[coreIndex] = {
        name: key,
        state: 'overridden',
        source: 'config',
        spec: { name: key, ...entry }
      }
      continue
    }
    if (isValidNamespacedKey(key)) {
      resolved.push({ name: key, state: 'additive', source: 'config', spec: { name: key, ...entry } })
      continue
    }
    failures.push({ key, reason: 'bare key has no "/" and matches no core check id' })
  }

  return { resolved, failures }
}

/**
 * Shared message builders for the two classification-warning classes —
 * `vinaya check`'s own (non-`--plan`) output and `vinaya doctor`'s permanent
 * diagnostics reuse the exact same strings so the two surfaces cannot drift
 * apart, the same discipline `env-lint.ts` already keeps for the env
 * diagnostic.
 */
export function overriddenNextMinorWarning(name: string): string {
  return `check "${name}" shares its name with a core check — it will replace the core check starting next minor (currently it runs alongside it under the flat registry).`
}

export function bareKeyNextMinorWarning(key: string): string {
  return `check "${key}" has no namespace and matches no core check — it will be rejected starting next minor. Rename it to "<yourname>/x".`
}
