#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { archiveCommand, archiveTrancheCommand } from './commands/archive.js'
import { auditCommand } from './commands/audit.js'
import { checkCommand } from './commands/check.js'
import { demoBreakCommand } from './commands/demo.js'
import { doctorCommand } from './commands/doctor.js'
import { ejectCommand } from './commands/eject.js'
import { initCommand, initProductCommand } from './commands/init.js'
import { issueCreateCommand, issueEditCommand } from './commands/issue.js'
import { newCheckCommand } from './commands/new-check.js'
import { prCreateCommand, prEditCommand } from './commands/pr.js'
import { quickstartCommand } from './commands/quickstart.js'
import { runStudio } from './commands/studio.js'
import { upgradeCommand } from './commands/upgrade.js'
import { waiverCommand } from './commands/waiver.js'
import { printJson } from './lib/envelope.js'
import { printHelp } from './lib/output.js'

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'))
  return pkg.version
}

const [, , command, ...args] = process.argv

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
  process.exit(0)
}

try {
  switch (command) {
    case 'version': {
      const version = readVersion()
      if (args.includes('--json')) {
        printJson({ version })
      } else {
        process.stdout.write(`${version}\n`)
      }
      break
    }
    case 'studio': {
      const code = await runStudio(process.cwd(), args)
      process.exit(code)
      break
    }
    case 'init': {
      const [subcommand, ...rest] = args
      if (subcommand === 'product') {
        await initProductCommand(rest)
      } else {
        await initCommand(args)
      }
      break
    }
    case 'eject': {
      await ejectCommand(args)
      break
    }
    case 'doctor': {
      await doctorCommand(args)
      break
    }
    case 'upgrade': {
      await upgradeCommand(args)
      break
    }
    case 'check': {
      await checkCommand(args)
      break
    }
    case 'archive': {
      const [subcommand, ...rest] = args
      if (subcommand === 'tranche') {
        await archiveTrancheCommand(rest)
      } else {
        await archiveCommand(args)
      }
      break
    }
    case 'audit': {
      await auditCommand(args)
      break
    }
    case 'new': {
      const [subcommand, ...rest] = args
      if (subcommand === 'check') {
        newCheckCommand(rest)
      } else {
        console.error(`Unknown 'new' subcommand: ${subcommand ?? '(none)'}`)
        process.exit(2)
      }
      break
    }
    case 'pr': {
      const [subcommand, ...rest] = args
      if (subcommand === 'create') {
        prCreateCommand(rest)
      } else if (subcommand === 'edit') {
        prEditCommand(rest)
      } else {
        console.error(`Unknown 'pr' subcommand: ${subcommand ?? '(none)'} (expected 'create' or 'edit')`)
        process.exit(2)
      }
      break
    }
    case 'issue': {
      const [subcommand, ...rest] = args
      if (subcommand === 'create') {
        issueCreateCommand(rest)
      } else if (subcommand === 'edit') {
        issueEditCommand(rest)
      } else {
        console.error(`Unknown 'issue' subcommand: ${subcommand ?? '(none)'} (expected 'create' or 'edit')`)
        process.exit(2)
      }
      break
    }
    case 'demo': {
      const [subcommand, ...rest] = args
      if (subcommand === 'break') {
        await demoBreakCommand(rest)
      } else {
        console.error(`Unknown 'demo' subcommand: ${subcommand ?? '(none)'} (expected 'break')`)
        process.exit(2)
      }
      break
    }
    case 'waiver': {
      await waiverCommand(args)
      break
    }
    case 'quickstart': {
      await quickstartCommand(args)
      break
    }
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
