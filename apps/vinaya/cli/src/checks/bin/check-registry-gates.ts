#!/usr/bin/env bun

/**
 * Core check: registry-gates. Thin adapter over `@atta/aeg-core`'s
 * `checkG1`–`checkG5` — mirrors `packages/aeg-core/bin/verify-registry.ts`'s
 * input assembly (`aeg-root/enforcement.md` parse, `.husky`/`.claude/hooks`/
 * `packages/aeg-core/bin` candidate-file glob, role/contract frontmatter,
 * G4's `gh`-reachability probe) exactly, collapsed into ONE registered
 * check rather than five, emitting the check contract instead of human
 * text.
 *
 * Collapsed, not five separate `CheckSpec`s (Developer's call, per Issue
 * #760 §4): G1–G5 share nearly all their I/O (the same `enforcement.md`
 * parse, the same candidate-file glob, the same `gh`-reachability probe) —
 * five near-identical thin scripts would each redo that work. Each finding
 * still names its own G-number in BOTH `CheckError.check` (`registry-gates.G3`,
 * not just `registry-gates`) and `CheckError.message` — the hard constraint
 * from Issue #760's own Traps-to-avoid (a Developer merging five distinct
 * failure classes into one undifferentiated report is a regression, not a
 * simplification) is met by that per-finding tagging, not by the CheckSpec
 * count.
 *
 * DORMANT WHEN ABSENT (same discipline `evaluateC5`/`.vinaya/doc-owners`
 * already uses): G1–G5 validate `aeg-root/enforcement.md` against THIS
 * monorepo's own `aeg-root/roles/`/`aeg-root/contracts/` doctrine tree — a
 * file layout that exists only in the AttaLabs monorepo itself, never in an
 * arbitrary adopter repo `vinaya init` installs into. This is the identical
 * "hardcodes this monorepo's own doctrine layout" problem `registry.ts`'s
 * own doc comment gives as the reason `reader-resolvable-prose` is NOT
 * registered. Rather than repeating that exclusion (which would silently
 * drop 5 of the 13 evaluators this task's brief explicitly names), this
 * adapter no-ops (exit 0, no findings) when `aeg-root/enforcement.md` does
 * not exist relative to the caller's cwd — meaningful and blocking inside
 * THIS repo (where the file exists), inert everywhere else. See the PR
 * body's Part 2 design-choice note.
 *
 * scope: full — reads the whole doctrine tree, not the local diff.
 */

import { execSync, execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import matter from 'gray-matter'
import {
  checkG1,
  checkG2,
  checkG3,
  checkG4,
  checkG5,
  parseEnforcementRegistry,
  type RegistryCheckResult
} from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'registry-gates'
const ENFORCEMENT_PATH = 'aeg-root/enforcement.md'
const ROLES_DIR = 'aeg-root/roles'
const CONTRACTS_DIR = 'aeg-root/contracts'

function isGithubCrossingLine(line: string): boolean {
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

function globCandidateFiles(): string[] {
  const out: string[] = []
  if (existsSync('.husky')) {
    for (const name of readdirSync('.husky')) {
      if (name === '_') continue
      const rel = `.husky/${name}`
      if (statSync(rel).isFile()) out.push(rel)
    }
  }
  if (existsSync('.claude/hooks')) {
    for (const name of readdirSync('.claude/hooks')) {
      if (name.endsWith('.sh')) out.push(`.claude/hooks/${name}`)
    }
  }
  if (existsSync('packages/aeg-core/bin')) {
    for (const name of readdirSync('packages/aeg-core/bin')) {
      if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(`packages/aeg-core/bin/${name}`)
    }
  }
  return out
}

function findCrossingFiles(candidateFiles: string[]): string[] {
  return candidateFiles.filter((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .some((line) => isGithubCrossingLine(line))
  )
}

type RoleFrontmatter = { file: string; role_id: string; performs: string[]; refuses_when: string }
type ContractFrontmatter = { file: string; producer: string; consumer: string }

function readRoles(): RoleFrontmatter[] {
  if (!existsSync(ROLES_DIR)) return []
  return readdirSync(ROLES_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const rel = `${ROLES_DIR}/${name}`
      const { data } = matter(readFileSync(rel, 'utf8'))
      return {
        file: rel,
        role_id: typeof data.role_id === 'string' ? data.role_id : '',
        performs: Array.isArray(data.performs) ? data.performs.map(String) : [],
        refuses_when: typeof data.refuses_when === 'string' ? data.refuses_when : ''
      }
    })
}

function readContracts(): ContractFrontmatter[] {
  if (!existsSync(CONTRACTS_DIR)) return []
  return readdirSync(CONTRACTS_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const rel = `${CONTRACTS_DIR}/${name}`
      const { data } = matter(readFileSync(rel, 'utf8'))
      return {
        file: rel,
        producer: typeof data.producer === 'string' ? data.producer : '',
        consumer: typeof data.consumer === 'string' ? data.consumer : ''
      }
    })
}

function ghReachable(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'], timeout: 8000 })
    return true
  } catch {
    return false
  }
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

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

function resolveRepo(): { owner: string; repo: string } | null {
  const fromEnv = process.env.AEG_REPO
  if (fromEnv) {
    const m = fromEnv.match(/^([^/]+)\/(.+)$/)
    if (m?.[1] && m[2]) return { owner: m[1], repo: m[2] }
  }
  let url: string
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch {
    return null
  }
  const ssh = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] }
  const https = url.match(/^https?:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (https?.[1] && https[2]) return { owner: https[1], repo: https[2] }
  return null
}

function emitResult(result: RegistryCheckResult, blocking: boolean): void {
  for (const f of result.findings) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: `${CHECK_NAME}.${result.check}`,
      severity: blocking ? 'error' : 'warning',
      message: `${result.check}: ${f.reason}`,
      agent_recovery_prompt: `Read the ${result.check} finding above (enforcement.md row / candidate file / role-contract frontmatter) and fix the drift it names, then re-run \`vinaya check registry-gates\`.`,
      ...(f.path ? { file: f.path } : {})
    })
  }
}

async function main(): Promise<void> {
  if (!existsSync(ENFORCEMENT_PATH)) {
    // Dormant — this monorepo's own doctrine tree isn't present (adopter
    // repo, or a check run from outside this repo's root). See module doc.
    process.exit(0)
  }

  const enforcementContent = readFileSync(ENFORCEMENT_PATH, 'utf8')
  const rows = parseEnforcementRegistry(enforcementContent)
  const ring0Rows = rows.filter((r) => r.ring === 'ring0')

  const candidateFiles = globCandidateFiles()
  const crossingFiles = findCrossingFiles(candidateFiles)
  const roles = readRoles()
  const contracts = readContracts()

  const repo = resolveRepo()
  const ghOk = repo !== null && ghReachable()

  const g4Result: RegistryCheckResult = ghOk
    ? checkG4(
        enforcementContent,
        makeResolveFn(
          `${(repo as { owner: string; repo: string }).owner}/${(repo as { owner: string; repo: string }).repo}`
        )
      )
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

  const g1 = checkG1(rows, existsSync)
  const g2 = checkG2(rows, candidateFiles)
  const g3 = checkG3(ring0Rows, crossingFiles)
  const g5 = checkG5(roles, contracts)

  // G1/G2: report-only (rollout policy mirrored from verify-registry.ts) —
  // surfaced as warnings, never affect the exit code.
  emitResult(g1, false)
  emitResult(g2, false)

  // G3/G4/G5: blocking.
  emitResult(g3, true)
  emitResult(g4Result, true)
  emitResult(g5, true)

  const blockingFailed = [g3, g4Result, g5].some((r) => r.status === 'fail')
  process.exit(blockingFailed ? 1 : 0)
}

main()
