#!/usr/bin/env bun
/**
 * atta-labs/secret-scan — a custom vinaya check, scaffolded by `vinaya new check`.
 *
 * Contract: emit one JSON line on stderr per finding via `emitCheckError`,
 * then exit 0 (pass) or 1 (findings). The RUNNER enforces the timeout —
 * never sleep past it inside this file. This file is standalone (no import
 * from the vinaya CLI's own source tree) because it lives in YOUR repo, not
 * inside `@attalabs/vinaya`.
 *
 * Its registration key is `atta-labs/secret-scan` — namespaced `<yourname>/<id>`,
 * which is what `vinaya check` requires: a bare, un-namespaced key matching
 * no core check id is rejected, and the whole run then refuses rather than
 * executing a partial ruleset.
 *
 * Shells out to `gitleaks` against this branch's full commit range vs
 * `origin/main` (not just the diff — a leaked secret can sit in a commit the
 * PR's changed-file globs never touch again). No-network-by-default: this
 * script never fetches or installs the `gitleaks` binary itself — that is
 * `ci.setup`'s job (`vinaya.config.json`), which runs once per CI job before
 * any check invocation. Locally, `gitleaks` is expected on PATH (already the
 * convention for this repo's manual pre-push use, see
 * `aeg-root/roles/security.md`).
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type CheckError = {
  schema: 1
  check: string
  severity: 'error' | 'warning'
  message: string
  agent_recovery_prompt: string
  file?: string
  line?: number
}

const CHECK_NAME = 'atta-labs/secret-scan'

function emitCheckError(error: CheckError): void {
  process.stderr.write(`${JSON.stringify(error)}\n`)
}

type GitleaksFinding = {
  RuleID: string
  Description: string
  StartLine: number
  File: string
  Commit: string
}

function main(): void {
  const gitleaksPath = Bun.which('gitleaks')
  if (!gitleaksPath) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: '`gitleaks` is not resolvable on PATH — the secret scan could not run.',
      agent_recovery_prompt:
        'Install gitleaks (locally: `brew install gitleaks`; CI: check `ci.setup` in vinaya.config.json ran) and re-run this check. A missing scanner must never be treated as a clean scan.'
    })
    process.exit(1)
  }

  const reportDir = mkdtempSync(join(tmpdir(), 'vinaya-secret-scan-'))
  const reportPath = join(reportDir, 'report.json')

  const result = Bun.spawnSync(
    [
      'gitleaks',
      'git',
      '--redact',
      '--exit-code',
      '1',
      '--report-format',
      'json',
      '--report-path',
      reportPath,
      '--log-opts',
      'origin/main..HEAD',
      '.'
    ],
    { cwd: process.cwd(), stdout: 'ignore', stderr: 'ignore' }
  )

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: `gitleaks exited ${result.exitCode} — the scan did not complete (expected 0 = clean, 1 = findings).`,
      agent_recovery_prompt:
        'Run `gitleaks git --redact --log-opts "origin/main..HEAD" .` by hand to see the real error (likely a bad --log-opts range, e.g. origin/main not fetched), fix the underlying cause, and re-run this check.'
    })
    rmSync(reportDir, { recursive: true, force: true })
    process.exit(1)
  }

  let findings: GitleaksFinding[]
  try {
    findings = JSON.parse(readFileSync(reportPath, 'utf-8'))
  } catch (err) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: `Could not read/parse gitleaks' JSON report: ${err instanceof Error ? err.message : String(err)}`,
      agent_recovery_prompt:
        'Run gitleaks by hand to inspect its report output, fix the underlying cause, and re-run this check.'
    })
    rmSync(reportDir, { recursive: true, force: true })
    process.exit(1)
  }

  rmSync(reportDir, { recursive: true, force: true })

  if (findings.length === 0) process.exit(0)

  for (const finding of findings) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: `${finding.RuleID}: ${finding.Description} (commit ${finding.Commit.slice(0, 12)})`,
      agent_recovery_prompt:
        'A secret was found in git history, not just the working tree — editing the current file is not enough. Rotate this credential immediately, then remove it from git history (e.g. `git filter-repo` or BFG) before this branch merges.',
      file: finding.File,
      line: finding.StartLine
    })
  }

  process.exit(1)
}

main()
