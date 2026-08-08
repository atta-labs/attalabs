#!/usr/bin/env bun
// Fixture: a tiny wrapper CLI around `runChecks`, used to test the runner's
// own SIGINT/SIGTERM forwarding from OUTSIDE the test process itself (so
// sending the signal doesn't kill the test runner too). Starts a check that
// sleeps far longer than this script will be allowed to live, then just
// awaits it — the only way it ever exits is via the signal-forwarding path
// under test, or the 60s ceiling neither test should ever reach.
import { join } from 'node:path'
import { runChecks } from '../../../src/checks/runner'

const SLEEPER = join(import.meta.dir, 'sleeper.ts')

await runChecks([{ name: 'hang', run: SLEEPER, args: ['60000'], scope: 'full' }], {
  parallel: 1,
  diffOnly: false,
  changedFiles: null,
  defaultTimeoutMs: 60_000
})
