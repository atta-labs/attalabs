#!/usr/bin/env bun

import { initCommand } from './commands/init.js'
import { dispatchCommand } from './commands/dispatch.js'
import { listCommand } from './commands/list.js'
import { replyCommand } from './commands/reply.js'
import { logsCommand } from './commands/logs.js'
import { printHelp } from './lib/output.js'

const [, , command, ...args] = process.argv

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
  process.exit(0)
}

try {
  switch (command) {
    case 'init':
      await initCommand(args)
      break
    case 'dispatch':
      await dispatchCommand(args)
      break
    case 'list':
      await listCommand(args)
      break
    case 'reply':
      await replyCommand(args)
      break
    case 'logs':
      await logsCommand(args)
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(2)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  process.exit(1)
}
