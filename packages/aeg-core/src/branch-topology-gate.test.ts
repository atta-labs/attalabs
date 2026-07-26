import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { checkBranchTopology, taskBranchTopologyFields } from './branch-topology-gate'
import { parseIteration } from './parse-iteration'

/**
 * Parity oracle: the EXACT grep invocation `.husky/pre-push` ran before
 * task 32 (#399) — `grep -qE "^\|[[:space:]]*${id}[[:space:]]*\|" "$topo"`.
 * Each parity case below runs the real grep against a fixture file and
 * asserts the pure evaluator reaches the same verdict.
 */
function grepAccepts(topoFile: string, id: string): boolean {
  const r = spawnSync('grep', ['-qE', `^\\|[[:space:]]*${id}[[:space:]]*\\|`, topoFile])
  return r.status === 0
}

// Realistic 6-column topology fixture, deliberately including every
// whitespace/suffix shape the bash regex tolerated: no-space cells, wide
// spaces, a tab-padded cell, a letter-suffixed id, and a numeric row (320)
// that shares a prefix with a non-row id (32).
const TOPOLOGY_MD = `# Iteration: parity-fixture — test

Lifecycle: active

Goal (execution): prove grep/parseIteration parity for the gate.

## Tasks (topology)

| #  | Task                  | Issue | Project(s) | Depends-on | Conflicts-with |
|----|-----------------------|-------|------------|------------|----------------|
| 1  | Standard row          | #100  | aeg        | —          | —              |
|2|No-space row|#101|aeg|—|—|
|   7a   | Wide-space suffix row | #102 | aeg | — | — |
|\t9\t| Tab-padded row | #104 | aeg | — | — |
| 320 | Prefix-collision row | #103 | aeg | — | — |

### Task 1 — Standard row

Rationale prose.
`

const tmp = mkdtempSync(join(tmpdir(), 'branch-topology-gate-'))
const topoFile = join(tmp, 'parity-fixture.md')
writeFileSync(topoFile, TOPOLOGY_MD)

afterAll(() => rmSync(tmp, { recursive: true, force: true }))

function evaluatorAccepts(id: string, md: string | null = TOPOLOGY_MD): boolean {
  const result = checkBranchTopology({
    branch: `task/parity-fixture/${id}`,
    iteration: 'parity-fixture',
    taskId: id,
    topoPath: 'aeg-root/iterations/parity-fixture.md',
    topology: md === null ? null : parseIteration(md)
  })
  return result.verdict === 'allow'
}

describe('checkBranchTopology ↔ bash-grep parity (the exact pre-task-32 regex)', () => {
  const MATCHING_IDS = ['1', '2', '7a', '9', '320']
  const NON_MATCHING_IDS = ['3', '32', '7', '7b', 'a', '999', '0']

  for (const id of MATCHING_IDS) {
    it(`both accept id \`${id}\` (whitespace/suffix shapes the regex tolerated)`, () => {
      expect(grepAccepts(topoFile, id)).toBe(true)
      expect(evaluatorAccepts(id)).toBe(true)
    })
  }

  for (const id of NON_MATCHING_IDS) {
    it(`both reject id \`${id}\` (incl. prefix collisions: 32 must not match row 320)`, () => {
      expect(grepAccepts(topoFile, id)).toBe(false)
      expect(evaluatorAccepts(id)).toBe(false)
    })
  }
})

describe('checkBranchTopology refusal messages are byte-identical to the old hook output', () => {
  it('missing topology file → the exact missing-iteration message', () => {
    const result = checkBranchTopology({
      branch: 'task/ghost-iter/5',
      iteration: 'ghost-iter',
      taskId: '5',
      topoPath: 'aeg-root/iterations/ghost-iter.md',
      topology: null
    })
    expect(result.verdict).toBe('refuse')
    expect(result.reason).toBe(
      '✖ pre-push: branch `task/ghost-iter/5` names iteration `ghost-iter`, but aeg-root/iterations/ghost-iter.md does not exist.\n' +
        ' A task branch must belong to a real iteration ().'
    )
  })

  it('no matching row → the exact no-row message', () => {
    const result = checkBranchTopology({
      branch: 'task/parity-fixture/999',
      iteration: 'parity-fixture',
      taskId: '999',
      topoPath: 'aeg-root/iterations/parity-fixture.md',
      topology: parseIteration(TOPOLOGY_MD)
    })
    expect(result.verdict).toBe('refuse')
    expect(result.reason).toBe(
      '✖ pre-push: branch `task/parity-fixture/999` — no row with `#` = `999` in aeg-root/iterations/parity-fixture.md.\n' +
        "  The branch suffix must literal-match the topology's # column.\n" +
        "  If the plan PR adding this row hasn't merged yet, merge it first."
    )
  })

  it('matching row → allow', () => {
    const result = checkBranchTopology({
      branch: 'task/parity-fixture/7a',
      iteration: 'parity-fixture',
      taskId: '7a',
      topoPath: 'aeg-root/iterations/parity-fixture.md',
      topology: parseIteration(TOPOLOGY_MD)
    })
    expect(result.verdict).toBe('allow')
  })
})

describe('known theoretical divergences — synthetic-only, characterized so drift is visible', () => {
  // Neither shape occurs in any real iteration file (all live + completed
  // files were swept at task-32 time — see PR #for-399's evidence). Where
  // the two disagree on synthetic input, parseIteration's reading is the
  // authoritative one (only the `## Tasks` table defines rows).

  it('a row-shaped line OUTSIDE the Tasks table: grep matched it, the parser correctly does not', () => {
    const md = `${TOPOLOGY_MD}\n## Other\n\n| 555 | not a task row |\n`
    writeFileSync(join(tmp, 'outside.md'), md)
    expect(grepAccepts(join(tmp, 'outside.md'), '555')).toBe(true)
    expect(evaluatorAccepts('555', md)).toBe(false)
  })

  it('an indented Tasks-table row: grep (anchored at column 0) missed it, the parser tolerates it', () => {
    const md = TOPOLOGY_MD.replace('| 320 |', '  | 44 | Indented row | #105 | aeg | — | — |\n| 320 |')
    writeFileSync(join(tmp, 'indented.md'), md)
    expect(grepAccepts(join(tmp, 'indented.md'), '44')).toBe(false)
    expect(evaluatorAccepts('44', md)).toBe(true)
  })

  it('regex metacharacters in the id: grep interpreted them, the evaluator compares literally', () => {
    // `3.0` as an ERE would match row `320`; task ids are alphanumeric so
    // this is unreachable from a real branch name — literal comparison is
    // the correct reading.
    expect(grepAccepts(topoFile, '3.0')).toBe(true)
    expect(evaluatorAccepts('3.0')).toBe(false)
  })
})

describe('taskBranchTopologyFields mirrors the hook’s case-pattern + cut extraction', () => {
  it('extracts iteration and task id from a canonical task branch', () => {
    expect(taskBranchTopologyFields('task/aeg-governance-hardening/32')).toEqual({
      iteration: 'aeg-governance-hardening',
      taskId: '32'
    })
  })

  it('ignores segments beyond the third, exactly as `cut -d/ -f2,-f3` did', () => {
    expect(taskBranchTopologyFields('task/iter/32/extra')).toEqual({ iteration: 'iter', taskId: '32' })
  })

  it('returns null for branches the hook’s `task/*/*` case never matched', () => {
    expect(taskBranchTopologyFields('main')).toBeNull()
    expect(taskBranchTopologyFields('task/only-two')).toBeNull()
    expect(taskBranchTopologyFields('fix/aeg/thing')).toBeNull()
  })

  it('preserves the shell pattern’s empty-segment tolerance (`*` matches empty)', () => {
    expect(taskBranchTopologyFields('task//x')).toEqual({ iteration: '', taskId: 'x' })
  })
})
