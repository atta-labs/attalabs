import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { COMMANDS } from './commands'

// The reverse direction of `apps/vinaya/cli/tests/commands.test.ts` (which
// proves every COMMANDS row is dispatched). THIS test proves the opposite:
// every name the router actually dispatches has a COMMANDS row — the
// failure mode that test can't see is a NEW `case` landing in `index.ts`
// with no matching registry entry (silently undocumented, never
// `printHelp()`-visible, never on the web `/docs/cli` reference).
const INDEX_PATH = fileURLToPath(new URL('../../cli/src/index.ts', import.meta.url))
const INDEX_SOURCE = readFileSync(INDEX_PATH, 'utf-8')

/**
 * Every command name the router actually reaches: `help` (special-cased
 * pre-switch, see index.ts's own comment), each single-word `case` label,
 * and `"<label> <sub>"` for each `subcommand === '<sub>'` check inside that
 * case's block. A case WITH subcommand branches (`init`, e.g.) still also
 * dispatches its bare label when the `else` branch is a real command call
 * rather than an "Unknown subcommand" refusal (`new`/`pr`/`issue`/`demo`,
 * which have no bare form) — detected by the absence of that refusal's
 * `console.error('Unknown ...')` text in the block.
 */
function routedCommandNames(source: string): string[] {
  const names: string[] = ['help']
  const caseRegex = /case '([a-z]+)':([\s\S]*?)(?=\n\s*case '|\n\s*default:)/g
  for (const match of source.matchAll(caseRegex)) {
    const label = match[1] as string
    const block = match[2] as string
    const subcommands = [...block.matchAll(/subcommand === '([a-z-]+)'/g)].map((m) => m[1] as string)
    const hasBareForm = subcommands.length === 0 || !/console\.error\(`Unknown/.test(block)
    if (hasBareForm) names.push(label)
    for (const sub of subcommands) names.push(`${label} ${sub}`)
  }
  return names
}

describe('router -> COMMANDS coverage', () => {
  it('every command name the CLI router actually dispatches has a COMMANDS row', () => {
    const routed = routedCommandNames(INDEX_SOURCE)
    expect(routed.length).toBeGreaterThan(0)
    for (const name of routed) {
      const found = COMMANDS.some((c) => c.name === name)
      expect(found, `router dispatches "${name}" but no COMMANDS entry names it`).toBe(true)
    }
  })

  it('the parser extracts the known routed command set exactly — a regression guard on the parser itself', () => {
    const routed = new Set(routedCommandNames(INDEX_SOURCE))
    expect(routed).toEqual(
      new Set([
        'help',
        'version',
        'studio',
        'init',
        'init product',
        'eject',
        'doctor',
        'upgrade',
        'check',
        'archive',
        'archive tranche',
        'audit',
        'new check',
        'pr create',
        'pr edit',
        'issue create',
        'issue edit',
        'demo break',
        'waiver'
      ])
    )
  })
})
