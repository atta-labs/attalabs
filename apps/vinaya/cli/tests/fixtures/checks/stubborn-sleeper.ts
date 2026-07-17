#!/usr/bin/env bun
// Fixture: traps/ignores SIGTERM, so only a SIGKILL escalation can actually
// terminate it. Proves the runner's timeout kill doesn't just fire-and-forget
// a single SIGTERM against a check that refuses to die.
process.on('SIGTERM', () => {})
const ms = Number(process.argv[2] ?? '0')
await new Promise((resolve) => setTimeout(resolve, ms))
process.exit(0)
