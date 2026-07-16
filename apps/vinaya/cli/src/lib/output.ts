import { COMMANDS } from './commands.js'

const NAME_COLUMN_WIDTH = 28
const PLANNED_MARKER = '[planned — not yet implemented] '

function row(indent: string, name: string, description: string): string {
  const padded = name.length >= NAME_COLUMN_WIDTH ? `${name} ` : name.padEnd(NAME_COLUMN_WIDTH)
  return `${indent}${padded}${description}`
}

export function printHelp(): void {
  const lines = ['vinaya — Vinaya CLI', '', 'USAGE', '  vinaya <command> [options]', '', 'COMMANDS']

  for (const command of COMMANDS) {
    const marker = command.status === 'planned' ? PLANNED_MARKER : ''
    lines.push(row('  ', command.name, `${marker}${command.description}`))
    for (const flag of command.flags ?? []) {
      lines.push(row('    ', flag.flag, `${marker}${flag.description}`))
    }
  }

  lines.push('', "Run 'vinaya version' to check what's installed.")
  process.stdout.write(`${lines.join('\n')}\n`)
}
