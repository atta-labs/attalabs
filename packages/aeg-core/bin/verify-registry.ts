#!/usr/bin/env bun

/**
 * verify-registry — G1–G5, the deterministic checks that make
 * `aeg-root/enforcement.md`'s three ring tables load-bearing (aeg-core-purity
 * discipline: this is the thin I/O shim; the pure evaluators live in
 * `../src/registry-parse.ts` / `../src/registry-checks.ts`).
 *
 * Rollout policy: G1/G2 are report-only this iteration — they can
 * only print `info`, never affect the exit code. G3/G4/G5 are blocking:
 * the process exits non-zero if any of them returns `'fail'`.
 *
 * Usage: bun packages/aeg-core/bin/verify-registry.ts
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { resolveRepo } from '@atta/aeg-forge-state'
import { checkG1, checkG2, checkG3, checkG4, checkG5, parseEnforcementRegistry } from '../src/index'
import type { GateRow, RegistryCheckResult } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

const ENFORCEMENT_PATH = 'aeg-root/enforcement.md'
const ROLES_DIR = 'aeg-root/roles'
const CONTRACTS_DIR = 'aeg-root/contracts'

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

// ---------- G1: implementation paths resolve on disk -------------------------

function existsFn(path: string): boolean {
  return existsSync(join(REPO_ROOT, path))
}

// ---------- G2: candidate hook/CLI files --------------------------------------

/**
 * `.husky/*` (excluding the `_` internal dir), `.claude/hooks/*.sh`,
 * `packages/aeg-core/bin/*.ts` (excluding `*.test.ts` — tests aren't
 * hooks/CLIs that enforcement.md would ever register; including them would
 * flood G2 with noise the brief's own dig never contemplated).
 */
function globCandidateFiles(): string[] {
  const out: string[] = []

  for (const name of readdirSync(join(REPO_ROOT, '.husky'))) {
    if (name === '_') continue
    const rel = `.husky/${name}`
    if (statSync(join(REPO_ROOT, rel)).isFile()) out.push(rel)
  }

  const hooksDir = join(REPO_ROOT, '.claude/hooks')
  if (existsSync(hooksDir)) {
    for (const name of readdirSync(hooksDir)) {
      if (name.endsWith('.sh')) out.push(`.claude/hooks/${name}`)
    }
  }

  const binDir = join(REPO_ROOT, 'packages/aeg-core/bin')
  for (const name of readdirSync(binDir)) {
    if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
      out.push(`packages/aeg-core/bin/${name}`)
    }
  }

  return out
}

// ---------- G3: GitHub-crossing (create/body-edit) files ----------------------

/**
 * Matches the exact mutation classes `.claude/hooks/check-forge-gates.sh`
 * itself intercepts (PR/Issue create, PR/Issue body/title edit, `gh api`
 * POST to `/pulls`|`/issues` or PATCH to `/pulls/N`|`/issues/N`, raw
 * curl/wget writes) — that hook's own comment is explicit that
 * comments/labels/close/reopen/merge are "sanctioned append operations",
 * not gated. Scoping crossingFiles any broader (e.g. to every file that
 * merely shells `gh issue view`) would flag
 * `archive-task.ts`/`dead-branch-audit.ts` — Ring-2
 * mechanisms that legitimately comment/label/close as scheduled CI jobs,
 * never as an interactive agent-session command check-forge-gates.sh could
 * ever see — producing false G3 STOP conditions on working, documented
 * automation. This narrower reading is the one that matches what "no
 * seventh way into GitHub" (the Ring-0 create/body-edit gate) actually
 * guards.
 *
 * Evaluated PER LINE, not over the whole file: a file legitimately mixing
 * an unrelated `gh pr edit --add-label` (line A) with an unrelated
 * `gh pr comment --body-file` (line B) must never cross-match "edit" from
 * A with "--body" from B into a false create/body-edit finding. Path
 * anchoring for `gh api` mirrors the hook exactly: POST matches the bare
 * collection endpoint (`/issues`, `/pulls`); PATCH requires an exact
 * `/issues/<n>`|`/pulls/<n>` with nothing trailing, so a sub-resource PATCH
 * (`/issues/comments/<id>`) is correctly excluded.
 */
export function isGithubCrossingLine(line: string): boolean {
  const createMatch = /\bgh\s+(pr|issue)\s+create\b/.test(line)
  const editWithBodyOrTitle =
    /\bgh\s+(pr|issue)\s+edit\b/.test(line) &&
    /--body\b|--body-file\b|--title\b|(?:^|\s)-b(?:\s|$)|(?:^|\s)-F(?:\s|$)|(?:^|\s)-t(?:\s|$)/.test(line)
  const apiPost =
    /\bgh\s+api\b/.test(line) &&
    /-X\s*POST\b|--method\s*POST\b|(?:^|\s)-f(?:\s|$)|(?:^|\s)-F(?:\s|$)/.test(line) &&
    /(\/pulls|\/issues)(["'\s]|$)/.test(line)
  const apiPatch =
    /\bgh\s+api\b/.test(line) &&
    /-X\s*PATCH\b|--method\s*PATCH\b/.test(line) &&
    /(\/pulls|\/issues)\/[0-9]+(["'\s]|$)/.test(line)
  const curlWrite =
    /\b(curl|wget)\b/.test(line) &&
    /api\.github\.com/.test(line) &&
    /(\/pulls|\/issues)/.test(line) &&
    /-X\s*(POST|PATCH|PUT)\b|--method\s*(POST|PATCH|PUT)\b|--data\b|(?:^|\s)-d(?:\s|$)|--json\b|--post-data\b/.test(
      line
    )
  return createMatch || editWithBodyOrTitle || apiPost || apiPatch || curlWrite
}

function findCrossingFiles(candidateFiles: string[]): string[] {
  return candidateFiles.filter((path) =>
    readFileSync(join(REPO_ROOT, path), 'utf8')
      .split('\n')
      .some((line) => isGithubCrossingLine(line))
  )
}

// ---------- G4: forge resolution -----------------------------------------------

/**
 * Cheap reachability probe, same pattern `check-first-push-dispatch.ts` uses
 * before trusting any `gh`-shelling script's output: `resolveRepo()` alone
 * can still succeed (e.g. `AEG_REPO` set, or a git remote parses) even when
 * `gh` itself cannot reach a host or resolve credentials — that gap is what
 * silently turned every G4 call into a false "does not resolve" before this
 * fix. Checked once, upfront, before any `gh issue view`/`gh pr view` call.
 */
function ghReachable(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'], timeout: 8000 })
    return true
  } catch {
    return false
  }
}

/**
 * `repoFlag` (`<owner>/<repo>`) is always resolved and passed explicitly —
 * every call carries `-R <owner>/<repo>` unconditionally (task 23/#360: an
 * untargeted `gh` call from a worktree checkout silently mis-scopes or
 * returns nothing). Callers only construct this after confirming both
 * `resolveRepo()` and `ghReachable()` succeeded (see `main`'s severity:infra
 * escape hatch) — a transient `gh` failure on an individual call still
 * reads as "does not resolve" (the same known, documented limitation
 * `verify-dispatch.ts`'s own `sh()` helper has), but total unreachability
 * no longer silently produces fabricated per-citation findings.
 */
function makeResolveFn(repoFlag: string): (n: number) => boolean {
  const cache = new Map<number, boolean>()
  return (n: number): boolean => {
    if (cache.has(n)) return cache.get(n) ?? false
    const issueOk = sh(`gh issue view ${n} -R ${repoFlag} --json number`) !== ''
    const resolved = issueOk || sh(`gh pr view ${n} -R ${repoFlag} --json number`) !== ''
    cache.set(n, resolved)
    return resolved
  }
}

// ---------- G5: role/contract frontmatter --------------------------------------

type RoleFrontmatter = { file: string; role_id: string; performs: string[]; refuses_when: string }
type ContractFrontmatter = { file: string; producer: string; consumer: string }

function readRoles(): RoleFrontmatter[] {
  return readdirSync(join(REPO_ROOT, ROLES_DIR))
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const rel = `${ROLES_DIR}/${name}`
      const { data } = matter(readFileSync(join(REPO_ROOT, rel), 'utf8'))
      return {
        file: rel,
        role_id: typeof data.role_id === 'string' ? data.role_id : '',
        performs: Array.isArray(data.performs) ? data.performs.map(String) : [],
        refuses_when: typeof data.refuses_when === 'string' ? data.refuses_when : ''
      }
    })
}

function readContracts(): ContractFrontmatter[] {
  return readdirSync(join(REPO_ROOT, CONTRACTS_DIR))
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const rel = `${CONTRACTS_DIR}/${name}`
      const { data } = matter(readFileSync(join(REPO_ROOT, rel), 'utf8'))
      return {
        file: rel,
        producer: typeof data.producer === 'string' ? data.producer : '',
        consumer: typeof data.consumer === 'string' ? data.consumer : ''
      }
    })
}

// ---------- output --------------------------------------------------------------

function printResult(result: RegistryCheckResult): void {
  const icon = result.status === 'fail' ? '✗' : result.status === 'info' ? 'ℹ' : '✓'
  console.log(`${icon} ${result.check}: ${result.status} (${result.findings.length} finding(s))`)
  for (const f of result.findings) {
    console.log(`    - ${f.reason}`)
  }
}

if (import.meta.main) {
  const enforcementContent = readFileSync(join(REPO_ROOT, ENFORCEMENT_PATH), 'utf8')
  const rows: GateRow[] = parseEnforcementRegistry(enforcementContent)
  const ring0Rows = rows.filter((r) => r.ring === 'ring0')

  const candidateFiles = globCandidateFiles()
  const crossingFiles = findCrossingFiles(candidateFiles)
  const roles = readRoles()
  const contracts = readContracts()

  // G4 severity:infra escape hatch (mirrors verify-dispatch.ts's runGateMode
  // exactly): resolve the repo and probe `gh` reachability ONCE, up front.
  // Neither failing is a real G4 finding — it means G4 cannot be evaluated
  // at all, not that a citation is fabricated. G1/G2/G3/G5 need no forge
  // access and always run regardless.
  const repo = await resolveRepo()
  const ghOk = repo !== null && ghReachable()

  const g4Result: RegistryCheckResult = ghOk
    ? checkG4(enforcementContent, makeResolveFn(`${repo.owner}/${repo.repo}`))
    : {
        check: 'G4',
        status: 'fail',
        findings: [
          {
            reason:
              "severity:infra — could not resolve a GitHub repo (AEG_REPO / git remote) or `gh` is unreachable (`gh auth status` failed). G4 skipped — cannot evaluate whether enforcement.md's cited forge numbers resolve."
          }
        ]
      }

  const results: RegistryCheckResult[] = [
    checkG1(rows, existsFn),
    checkG2(rows, candidateFiles),
    checkG3(ring0Rows, crossingFiles),
    g4Result,
    checkG5(roles, contracts)
  ]

  for (const result of results) printResult(result)

  const blocking = results.filter(
    (r) => (r.check === 'G3' || r.check === 'G4' || r.check === 'G5') && r.status === 'fail'
  )
  process.exit(blocking.length > 0 ? 1 : 0)
}
