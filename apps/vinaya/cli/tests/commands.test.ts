import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { COMMANDS } from '@atta/vinaya-sources'

const INDEX_PATH = fileURLToPath(new URL('../src/index.ts', import.meta.url))
const INDEX_SOURCE = readFileSync(INDEX_PATH, 'utf-8')

// 'help' is special-cased before the switch (see index.ts's pre-switch `if`), never a `case`.
const PRE_SWITCH_COMMANDS = ['help']

/**
 * The body of one `case '<label>':` — from its label to the next `case '` or
 * `default:`. Scoping to the block matters: a multi-word command's subcommand
 * branch must live in ITS case, not merely somewhere in the file.
 */
function caseBlock(label: string): string | null {
  const marker = `case '${label}':`
  const start = INDEX_SOURCE.indexOf(marker)
  if (start === -1) return null
  const after = INDEX_SOURCE.slice(start + marker.length)
  const next = after.search(/\n\s*(case '|default:)/)
  return next === -1 ? after : after.slice(0, next)
}

/**
 * Is `name` actually reachable from the router?
 *
 * A `case` label is always a single word, so a multi-word registry name can
 * never equal one — matching the full name against the case list (the old
 * shape) silently answered "no" for all seven multi-word commands, which is
 * how a shipped `new check` sat behind a Coming soon badge with the gate
 * green. So: match the FIRST word against the case labels, and for a
 * multi-word command additionally require its case to branch on the
 * subcommand (`index.ts`'s shape is `if (subcommand === 'check')`).
 */
function isDispatched(name: string): boolean {
  const [first, ...rest] = name.split(' ')
  if (first === undefined) return false
  const block = caseBlock(first)
  if (block === null) return false
  if (rest.length === 0) return true
  return block.includes(`subcommand === '${rest.join(' ')}'`)
}

describe('registry <-> switch agreement', () => {
  it('every shipped command has a case in the switch, or is pre-switch handled', () => {
    for (const command of COMMANDS.filter((c) => c.status === 'shipped')) {
      const handled = PRE_SWITCH_COMMANDS.includes(command.name) || isDispatched(command.name)
      expect(handled, `'${command.name}' is registered as shipped but the router does not dispatch it`).toBe(true)
    }
  })

  it('no planned command has a case in the switch', () => {
    for (const command of COMMANDS.filter((c) => c.status === 'planned')) {
      expect(
        isDispatched(command.name),
        `'${command.name}' is dispatched by the router but still registered as planned`
      ).toBe(false)
    }
  })
})
