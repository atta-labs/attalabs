#!/usr/bin/env bun

/**
 * Core check: test-plan. Thin adapter over `@atta/aeg-core`'s
 * `evaluateTestPlanGate` — mirrors `packages/aeg-core/bin/verify-test-plan.ts`'s
 * input assembly (PR_BODY/BRANCH env) exactly, emitting the check contract
 * instead of human text.
 *
 * scope: diff — reads only the PR body, never the whole repo.
 */

import { evaluateTestPlanGate } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'test-plan'

function main(): void {
  const body = process.env.PR_BODY ?? ''
  const branch = process.env.BRANCH ?? ''

  const result = evaluateTestPlanGate(body, branch)

  if (result.verdict === 'fail') {
    for (const message of result.messages) {
      if (!message) continue
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message,
        agent_recovery_prompt:
          'Open the PR body, tick every `[agent]` Test Plan box after actually running it (with pasted evidence), and leave `[principal]` boxes for the Principal, then re-run `vinaya check test-plan`.'
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
