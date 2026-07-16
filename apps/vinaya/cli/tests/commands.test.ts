import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { COMMANDS } from '@atta/vinaya-sources'

const INDEX_PATH = fileURLToPath(new URL('../src/index.ts', import.meta.url))
const INDEX_SOURCE = readFileSync(INDEX_PATH, 'utf-8')

// 'help' is special-cased before the switch (see index.ts's pre-switch `if`), never a `case`.
const PRE_SWITCH_COMMANDS = ['help']

function switchCaseNames(): string[] {
  const captures = [...INDEX_SOURCE.matchAll(/case '([^']+)':/g)].map((match) => match[1])
  return captures.filter((name): name is string => name !== undefined)
}

describe('registry <-> switch agreement', () => {
  it('every shipped command has a case in the switch, or is pre-switch handled', () => {
    const cases = switchCaseNames()
    for (const command of COMMANDS.filter((c) => c.status === 'shipped')) {
      const handled = PRE_SWITCH_COMMANDS.includes(command.name) || cases.includes(command.name)
      expect(handled).toBe(true)
    }
  })

  it('no planned command has a case in the switch', () => {
    const cases = switchCaseNames()
    for (const command of COMMANDS.filter((c) => c.status === 'planned')) {
      expect(cases.includes(command.name)).toBe(false)
    }
  })
})
