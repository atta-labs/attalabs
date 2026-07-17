import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

/**
 * Core parity: each core check's verdict agrees with its `bin/*` equivalent
 * on the same input. Covers brief-shape vs `bin/verify-brief.ts` — the case
 * §3/§9 name explicitly. Compares exit-code verdicts (pass/fail), not exact
 * message text — the two intentionally emit different shapes (JSON check
 * contract vs human text), by design (§2: "the existing bins do not honor
 * the error contract").
 */

const REPO_ROOT = join(import.meta.dir, '../../../../..')
const CHECK_BIN = join(REPO_ROOT, 'apps/vinaya/cli/src/checks/bin/check-brief-shape.ts')
const VERIFY_BRIEF = join(REPO_ROOT, 'packages/aeg-core/bin/verify-brief.ts')

async function runExit(cmd: string[], env: Record<string, string>): Promise<number> {
  const proc = Bun.spawn(cmd, {
    env: { ...process.env, ...env },
    stdout: 'ignore',
    stderr: 'ignore',
    cwd: REPO_ROOT
  })
  return await proc.exited
}

describe('core-parity: brief-shape vs bin/verify-brief.ts', () => {
  it('agree (both fail) on a known-bad PR_BODY missing every required section', async () => {
    const badBody = 'Just a one-line PR body with no required sections.'
    const env = { PR_BODY: badBody, BRANCH: 'task/vinaya-cli-v1/3' }
    const [checkExit, binExit] = await Promise.all([
      runExit(['bun', CHECK_BIN], env),
      runExit(['bun', VERIFY_BRIEF], env)
    ])
    expect(checkExit).toBe(1)
    expect(binExit).toBe(1)
  })

  it('agree (both pass) when PR_BODY is empty — nothing to check', async () => {
    const env = { PR_BODY: '', BRANCH: 'task/vinaya-cli-v1/3' }
    const [checkExit, binExit] = await Promise.all([
      runExit(['bun', CHECK_BIN], env),
      runExit(['bun', VERIFY_BRIEF], env)
    ])
    expect(checkExit).toBe(0)
    expect(binExit).toBe(0)
  })
})
