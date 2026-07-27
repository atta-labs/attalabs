import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import type { CheckSpec } from '../../src/checks/contract'
import { coreCheckRegistry } from '../../src/checks/registry'
import { runChecks } from '../../src/checks/runner'

/**
 * The no-privileged-API proof. This test must fail if someone later adds
 * a fast path — core checks are ordinary subprocesses, exactly like a
 * custom check, with no extra field and no branch in the runner.
 */

const FIXTURE = join(import.meta.dir, '..', 'fixtures', 'checks', 'passing-check.ts')

const ALLOWED_KEYS = new Set<keyof CheckSpec>(['name', 'run', 'args', 'scope', 'include', 'timeoutMs'])

describe('no-privileged-api', () => {
  it('core registry CheckSpecs carry no field a config-derived CheckSpec cannot carry', () => {
    const coreSpecs = coreCheckRegistry()
    expect(coreSpecs.length).toBeGreaterThan(0)
    for (const spec of coreSpecs) {
      const keys = Object.keys(spec) as Array<keyof CheckSpec>
      const extra = keys.filter((k) => !ALLOWED_KEYS.has(k))
      expect(
        extra,
        `core check "${spec.name}" carries field(s) a config check cannot express: ${extra.join(', ')}`
      ).toEqual([])
    }
  })

  describe('a REAL core-registry check run through runChecks', () => {
    // `Bun.spawn` inherits the parent env (runner.ts sets no explicit `env`
    // override) — clear PR_BODY so `brief-shape`'s own "no PR_BODY → exit 0"
    // bypass is deterministic regardless of what this test process inherited.
    const savedPrBody = process.env.PR_BODY
    beforeEach(() => {
      delete process.env.PR_BODY
    })
    afterEach(() => {
      if (savedPrBody !== undefined) process.env.PR_BODY = savedPrBody
    })

    it("produces a CheckOutcome structurally identical to a fixture custom check's — the literal §6 Part 5 requirement", async () => {
      const briefShapeSpec = coreCheckRegistry().find((s) => s.name === 'brief-shape')
      if (!briefShapeSpec) {
        throw new Error(
          'coreCheckRegistry() no longer registers "brief-shape" — update this test to name a live core check'
        )
      }
      const customSpec: CheckSpec = { name: 'custom-fixture', run: FIXTURE, scope: 'full' }

      const [coreOutcome, customOutcome] = await runChecks([briefShapeSpec, customSpec], {
        parallel: 2,
        diffOnly: false,
        changedFiles: null,
        defaultTimeoutMs: 10_000
      })

      // Both ran through the SAME runChecks call — one is a real
      // src/checks/bin/check-brief-shape.ts subprocess pulled straight from
      // the registry, not a fabricated core-shaped object.
      expect(Object.keys(coreOutcome ?? {}).sort()).toEqual(Object.keys(customOutcome ?? {}).sort())
      expect(coreOutcome?.exitCode).toBe(0) // no PR_BODY → brief-shape's documented bypass
      expect(coreOutcome?.status).toBe('pass')
      expect(customOutcome?.status).toBe('pass')
    })
  })

  it('runChecks has no branch on provenance — a core-labeled spec and a custom-labeled spec pointed at the SAME executable behave identically', async () => {
    const coreLabeled: CheckSpec = { name: 'core-fixture', run: FIXTURE, scope: 'full' }
    const customLabeled: CheckSpec = { name: 'custom-fixture', run: FIXTURE, scope: 'full' }

    const [coreOutcome, customOutcome] = await runChecks([coreLabeled, customLabeled], {
      parallel: 2,
      diffOnly: false,
      changedFiles: null,
      defaultTimeoutMs: 5000
    })

    expect(Object.keys(coreOutcome ?? {}).sort()).toEqual(Object.keys(customOutcome ?? {}).sort())
    expect(coreOutcome?.status).toBe(customOutcome?.status)
    expect(coreOutcome?.exitCode).toBe(customOutcome?.exitCode)
  })
})
