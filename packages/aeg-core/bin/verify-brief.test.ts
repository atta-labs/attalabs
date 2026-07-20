import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * CLI-level coverage for the two behaviors that live in the shim rather than in
 * `brief-validation.ts`: *when* `checkBriefSections` runs (branch vs body shape)
 * and the `--body-file` authoring-time entry. The section grammar itself is
 * covered in `src/brief-validation.test.ts` — this file only asserts routing.
 *
 * Live failure being regressed: a standalone fix brief on `fix/studio-iteration-href`
 * shipped with no §7 documentation-update list and CI stayed green, because the
 * branch-only bypass exempted every non-`task/*` branch before any section check
 * ran.
 */

const SCRIPT = join(import.meta.dirname, 'verify-brief.ts')

/** A complete standalone-fix brief: every required section, and no `Closes #N` (it has no task Issue). */
const FIX_BRIEF = `**For:** Sonnet (coding-agent CLI, dispatched locally)
**Project:** aeg-core

## Summary

Standalone fix — not an AEG task.

## Test plan

- [ ] **[agent]** \`bun test\` passes.

## Scope

One package.

**Tier:** 1

## Technical surface map

- \`packages/aeg-core/src/brief-validation.ts\`

## Pre-flight

Step 0 (worktree):
\`\`\`
git worktree add .worktrees/fix/x -b fix/x origin/main
\`\`\`

## Documentation-update list

- \`aeg-root/state-machine.md\`

## Stop conditions

- Pre-flight failure.

## Constraints

**Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not
covered by a stop condition, choose the most reasonable option.
`

/** The exact live failure shape: a real brief whose §7 documentation-update list is absent. */
const FIX_BRIEF_NO_DOC_LIST = FIX_BRIEF.replace(/## Documentation-update list[\s\S]*?(?=## Stop conditions)/, '')

/** An ordinary non-AEG PR body — the exemption the bypass exists to protect. */
const DEPENDENCY_BUMP = `## Summary

Bumps \`zod\` from 3.23.8 to 3.24.1.

## Test plan

- [ ] **[agent]** \`bun test\` passes.

## Scope

Lockfile only.

**Tier:** 0
`

type CliResult = { code: number; output: string }

function runCli(args: string[], env: Record<string, string> = {}): CliResult {
  try {
    const output = execFileSync('bun', [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60_000,
      env: { ...process.env, PR_BODY: '', PR_TITLE: '', BRANCH: '', ...env }
    })
    return { code: 0, output }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'verify-brief-'))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

function briefFile(name: string, contents: string): string {
  const path = join(tmp, name)
  writeFileSync(path, contents)
  return path
}

describe('verify-brief — brief-shaped bodies are validated on any branch', () => {
  it('FAILS a brief-shaped body missing its doc-update list on a fix/* branch (was silently bypassed)', () => {
    const { code, output } = runCli([], { BRANCH: 'fix/x', PR_BODY: FIX_BRIEF_NO_DOC_LIST })
    expect(code).toBe(1)
    expect(output).toMatch(/Documentation-update list/)
  })

  it('PASSES a complete brief-shaped body on a fix/* branch — no `Closes #N` required', () => {
    const { code, output } = runCli([], { BRANCH: 'fix/x', PR_BODY: FIX_BRIEF })
    expect(output).toMatch(/Closes #N` not required/)
    expect(code).toBe(0)
  })

  it('still exempts an ordinary non-brief body on a fix/* branch', () => {
    const { code, output } = runCli([], { BRANCH: 'fix/x', PR_BODY: DEPENDENCY_BUMP })
    expect(code).toBe(0)
    expect(output).toMatch(/not brief-shaped — bypass/)
  })

  it('still requires `Closes #N` on a task branch', () => {
    const { code, output } = runCli([], { BRANCH: 'task/iter/3', PR_BODY: FIX_BRIEF })
    expect(code).toBe(1)
    expect(output).toMatch(/Closes #N/)
  })

  it('keeps the plan-PR Closes guard running ahead of any exemption', () => {
    const { code, output } = runCli([], { BRANCH: 'plan/x', PR_BODY: `${DEPENDENCY_BUMP}\n\nCloses #12\n` })
    expect(code).toBe(1)
    expect(output).toMatch(/plan-PR Closes guard/)
  })
})

describe('verify-brief --body-file (authoring-time gate)', () => {
  it('PASSES a complete brief file', () => {
    const { code, output } = runCli(['--body-file', briefFile('complete.md', FIX_BRIEF)])
    expect(output).toMatch(/PASS/)
    expect(code).toBe(0)
  })

  it('FAILS the same brief with its doc-update list stripped', () => {
    const { code, output } = runCli(['--body-file', briefFile('no-doc-list.md', FIX_BRIEF_NO_DOC_LIST)])
    expect(code).toBe(1)
    expect(output).toMatch(/Documentation-update list/)
  })

  it('FAILS loudly when the path does not exist', () => {
    const { code, output } = runCli(['--body-file', join(tmp, 'nope.md')])
    expect(code).toBe(1)
    expect(output).toMatch(/could not read --body-file/)
  })

  it('infers the branch from the brief Step 0 when no BRANCH is set', () => {
    // No env branch and no PR: `fix/x` comes from the brief's own worktree line,
    // which is what makes `Closes #N` correctly optional here.
    const { code } = runCli(['--body-file', briefFile('infer.md', FIX_BRIEF)])
    expect(code).toBe(0)
  })
})
