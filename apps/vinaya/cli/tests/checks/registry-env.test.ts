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

  // Security regression, second pass on PR #862's own fix: a `BASE_SHA`
  // declaration was briefly added to review-gate's env, forwarding an
  // attacker-steerable ref (a pull_request-triggered workflow runs the PR's
  // own YAML) into a trust-anchor read. Never again — review-gate's
  // principals resolution is hardcoded to TRUST_ANCHOR_REF and must never
  // accept a caller-suppliable ref of any kind.
  it('review-gate never declares BASE_SHA — its trust-anchor read is hardcoded, never caller-suppliable', () => {
    const reviewGate = specs.find((s) => s.name === 'review-gate')
    expect(reviewGate?.env).toBeDefined()
    expect(Object.keys(reviewGate?.env ?? {})).not.toContain('BASE_SHA')
  })

  it('no check bin ever calls loadConfigFromRef with anything but TRUST_ANCHOR_REF — source-text guard against the same env-steering mistake creeping back in', () => {
    const bins = ['check-review-gate.ts', 'check-doc-coverage.ts', 'check-doc-coverage-push.ts']
    for (const name of bins) {
      const src = readFileSync(join(import.meta.dir, '..', '..', 'src', 'checks', 'bin', name), 'utf-8')
      const calls = src.match(/loadConfigFromRef\(([^)]*)\)/g) ?? []
      expect(calls.length, `${name} should call loadConfigFromRef exactly once`).toBe(1)
      expect(calls[0], `${name} must pass TRUST_ANCHOR_REF, never an env-derived value`).toBe(
        'loadConfigFromRef(TRUST_ANCHOR_REF)'
      )
    }
  })
})
