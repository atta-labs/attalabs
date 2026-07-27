#!/usr/bin/env bun

/**
 * verify-test-plan — runtime Test Plan checkbox-state gate (D-049). Thin
 * CLI/I/O shim: reads `PR_BODY`/`BRANCH` from env and prints the pure
 * evaluator's messages. All decision logic lives in `evaluateTestPlanGate`
 * (@atta/aeg-core) — see that module's docstring for the full behavior
 * spec, including the aeg-governance-hardening task 25 (#365) fix for the
 * PR #377 live-fire gap (heading-form Test Plan sections were never matched
 * by the original inline-only regex, so a task PR with an unticked
 * `**[principal]**` box advisory-PASSED).
 */

import { evaluateTestPlanGate } from '../src/index'

const body = process.env.PR_BODY ?? ''
const branch = process.env.BRANCH ?? ''

const result = evaluateTestPlanGate(body, branch)
for (const message of result.messages) {
  console.log(message.length > 0 ? `[verify-test-plan] ${message}` : '')
}
process.exit(result.verdict === 'pass' ? 0 : 1)
