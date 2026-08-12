import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { CheckSpec } from '../../src/checks/contract'
import { coreCheckRegistry } from '../../src/checks/registry'
import { VinayaConfigSchema } from '../../src/lib/config'

/**
 * Proves the task 2 (#775) audit actually landed: every one of the 15
 * registered core checks carries an `env` declaration, and every
 * declaration is valid against the exact same `CheckEntrySchema` an
 * adopter's `vinaya.config.json` entry would be parsed with — the
 * no-privileged-API invariant extended to this new field.
 */
describe('registry env declarations', () => {
  const specs = coreCheckRegistry()

  it('registers exactly 15 core checks (the audited surface)', () => {
    expect(specs).toHaveLength(15)
  })

  it('every core check carries an env declaration', () => {
    const undeclared = specs.filter((s) => !s.env).map((s) => s.name)
    expect(undeclared).toEqual([])
  })

  it('every declared env shape parses through the same schema a config-file entry would', () => {
    for (const spec of specs) {
      const asConfigEntry = {
        checks: {
          [spec.name]: {
            run: spec.run,
            scope: spec.scope,
            ...(spec.env ? { env: spec.env } : {})
          }
        }
      }
      const parsed = VinayaConfigSchema.safeParse(asConfigEntry)
      expect(parsed.success, `check "${spec.name}"'s env declaration failed schema validation`).toBe(true)
    }
  })

  it('no core check declares `anyOf` — reserved for adopter-facing custom checks only', () => {
    const offenders: string[] = []
    for (const spec of specs) {
      for (const [key, decl] of Object.entries(spec.env ?? {})) {
        if (typeof decl === 'object' && decl !== null && 'anyOf' in decl) {
          offenders.push(`${spec.name}.${key}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('every check whose bin shells to `gh` forwards GITHUB_TOKEN and GH_TOKEN', () => {
    // The runner spawns children with ONLY the baseline env plus declared
    // keys. On a CI runner `gh` authenticates exclusively from
    // GITHUB_TOKEN/GH_TOKEN — a bin that shells to `gh` without forwarding
    // them runs unauthenticated there: hard-fail (review-gate, pre-fix) or
    // silently vacuous fail-open (single-plan-pr, dead-branch-push,
    // issue-assignment, pre-fix). Coupling: read each bin's source, detect
    // the `gh` shell-out, demand both token declarations.
    const SRC_BIN_DIR = join(import.meta.dir, '..', '..', 'src', 'checks', 'bin')
    const offenders: string[] = []
    for (const spec of specs) {
      const srcPath = join(SRC_BIN_DIR, `${basename(spec.run).replace(/\.(js|ts)$/, '')}.ts`)
      const source = readFileSync(srcPath, 'utf8')
      // Detect `gh` as a spawned command in ANY call shape: execFileSync's
      // array form (`'gh'`), execSync's string form (`'gh auth status'`),
      // and template-literal commands (`` `gh issue view ${n}` ``) — the
      // string forms slipped past an earlier exact-`'gh'` match and left
      // check-registry-gates undeclared.
      if (!/['"`]gh['"`\s]/.test(source)) continue
      const env = spec.env ?? {}
      if (!('GITHUB_TOKEN' in env) || !('GH_TOKEN' in env)) {
        offenders.push(spec.name)
      }
    }
    expect(offenders).toEqual([])
  })

  it('core registry CheckSpecs still carry no field a config-derived CheckSpec cannot carry, env included', () => {
    const ALLOWED_KEYS = new Set<keyof CheckSpec>([
      'name',
      'run',
      'args',
      'scope',
      'include',
      'timeoutMs',
      'env',
      'requiresOpenPr'
    ])
    for (const spec of specs) {
      const extra = (Object.keys(spec) as Array<keyof CheckSpec>).filter((k) => !ALLOWED_KEYS.has(k))
      expect(extra, `check "${spec.name}" carries an unexpected field: ${extra.join(', ')}`).toEqual([])
    }
  })

  // Security regression, PR #862 rounds 2-3. Round 2 added a `BASE_SHA` env
  // declaration to review-gate, forwarding an attacker-steerable ref into the
  // trust-anchor read; round 3 hardcoded a local `origin/main`, which the PR's
  // own workflow YAML could still `git update-ref`. `review-gate` must never
  // regain a ref-shaped env knob, and no bin may resolve `principals` from
  // any local/env source — only `loadTrustAnchorConfig()` (GitHub API).
  it('review-gate never declares BASE_SHA — its trust anchor is never caller-suppliable', () => {
    const reviewGate = specs.find((s) => s.name === 'review-gate')
    expect(reviewGate?.env).toBeDefined()
    expect(Object.keys(reviewGate?.env ?? {})).not.toContain('BASE_SHA')
  })

  it('every principals-resolving bin calls loadTrustAnchorConfig() with NO arguments, and never a local-git/env-derived config', () => {
    const bins = ['check-review-gate.ts', 'check-doc-coverage.ts', 'check-doc-coverage-push.ts']
    for (const name of bins) {
      const src = readFileSync(join(import.meta.dir, '..', '..', 'src', 'checks', 'bin', name), 'utf-8')
      const calls = src.match(/loadTrustAnchorConfig\(([^)]*)\)/g) ?? []
      expect(calls.length, `${name} should call loadTrustAnchorConfig exactly once`).toBe(1)
      expect(calls[0], `${name} must pass no argument — the fetcher param is test-only`).toBe('loadTrustAnchorConfig()')
      // The retired, PR-rewritable sources must not reappear for this purpose.
      expect(src, `${name} must not resolve principals from local git`).not.toContain('loadConfigFromRef')
      expect(src, `${name} must not resolve principals from the working tree`).not.toMatch(
        /resolvePrincipalAllowlist\(\s*loadConfig\(\)/
      )
    }
  })
})
