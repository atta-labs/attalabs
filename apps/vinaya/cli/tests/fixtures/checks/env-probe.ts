#!/usr/bin/env bun
// Fixture: reports (via a `warning` CheckError, never failing) whether a
// named process.env var is visible to this check — proves what the runner
// actually forwards to a spawned check's environment, whichever declaration
// (or absence of one) its CheckSpec carries.
const name = process.argv[2] ?? 'VINAYA_TEST_PROBE_VAR'
const value = process.env[name]
process.stderr.write(
  `${JSON.stringify({
    schema: 1,
    check: 'fixture-env-probe',
    severity: 'warning',
    message: value === undefined ? `${name}=<unset>` : `${name}=${value}`,
    agent_recovery_prompt: 'n/a — fixture diagnostic only.'
  })}\n`
)
process.exit(0)
