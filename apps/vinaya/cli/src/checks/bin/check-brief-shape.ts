#!/usr/bin/env bun

/**
 * Core check: brief-shape. Thin adapter over `@atta/aeg-core`'s
 * `checkBriefSections` — mirrors `packages/aeg-core/bin/verify-brief.ts`'s
 * input assembly (PR_BODY/BRANCH env, tier via `readTierFromPrBody`, the
 * non-task/non-brief-shaped bypass, `requireClosesN: isTaskBranch(branch)`
 * — #870), but emits the check contract (JSON lines on stderr, exit 0/1)
 * instead of human text — the reason this is a new executable rather than a
 * wrapper around `bin/*` (`packages/aeg-core/bin/*` is out of this task's
 * boundary to edit).
 *
 * scope: diff — reads only the PR body, never the whole repo.
 */

import { checkBriefSections, isBriefShaped, isTaskBranch, readTierFromPrBody } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'brief-shape'

function main(): void {
  const prBody = process.env.PR_BODY ?? ''
  if (!prBody) {
    // No PR body to check (local dev outside a CI/PR context) — nothing to do.
    process.exit(0)
  }

  const branch = process.env.BRANCH ?? ''
  const taskBranch = isTaskBranch(branch)

  // A non-task branch whose body isn't brief-shaped has no brief to grade —
  // an ordinary one-line dependency-bump PR must not be forced to grow one
  // (mirrors verify-brief.ts's identical bypass).
  if (branch && !taskBranch && !isBriefShaped(prBody)) {
    process.exit(0)
  }

  const { errors } = checkBriefSections(prBody, readTierFromPrBody, { requireClosesN: taskBranch })

  if (errors.length > 0) {
    for (const message of errors) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message,
        agent_recovery_prompt:
          'Open the PR body and add or fix the section named above, following the canonical PR-body template ' +
          '(`aeg-root/roles/developer.md` § PR body — canonical form / `aeg-root/templates/pr-report-template.md`). ' +
          'Commit the corrected PR body, then re-run `vinaya check brief-shape`.'
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
