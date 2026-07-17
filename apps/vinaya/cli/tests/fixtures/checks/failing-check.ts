#!/usr/bin/env bun
// Fixture: emits one well-formed CheckError JSON line on stderr, exits 1.
process.stderr.write(
  `${JSON.stringify({
    schema: 1,
    check: 'fixture-failing',
    severity: 'error',
    message: 'The fixture finding.',
    agent_recovery_prompt: 'Fix the fixture finding by re-reading this fixture file.'
  })}\n`
)
process.exit(1)
