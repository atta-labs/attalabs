#!/usr/bin/env bun
/**
 * {{CHECK_NAME}} — a custom vinaya check, scaffolded by `vinaya new check`.
 *
 * Contract: emit one JSON line on stderr per finding via `emitCheckError`,
 * then exit 0 (pass) or 1 (findings). The RUNNER enforces the timeout —
 * never sleep past it inside this file. This file is standalone (no import
 * from the vinaya CLI's own source tree) because it lives in YOUR repo, not
 * inside `@atta/vinaya-cli`.
 */

type CheckError = {
  schema: 1
  check: string
  severity: 'error' | 'warning'
  message: string
  agent_recovery_prompt: string
  file?: string
  line?: number
}

function emitCheckError(error: CheckError): void {
  process.stderr.write(`${JSON.stringify(error)}\n`)
}

function main(): void {
  // Replace this with your real check logic — read whatever input this
  // check needs, then call `emitCheckError` once per finding.
  emitCheckError({
    schema: 1,
    check: '{{CHECK_NAME}}',
    severity: 'error',
    message: 'Example finding from the scaffolded template — replace with a real check.',
    agent_recovery_prompt: 'Edit this file to implement your check logic, then remove this example finding.'
  })
  process.exit(1)
}

main()
