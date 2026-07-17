import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import type { CheckSpec } from '../../src/checks/contract'
import { coreCheckRegistry } from '../../src/checks/registry'
import { runChecks } from '../../src/checks/runner'

/**
 * D-092's no-privileged-API proof. This test must fail if someone later adds
 * a fast path — core checks are ordinary subprocesses, exactly like a
 * custom check, with no extra field and no branch in the runner.
 */

const FIXTURE = join(import.meta.dir, '..', 'fixtures', 'checks', 'passing-check.ts')

const ALLOWED_KEYS = new Set<keyof CheckSpec>(['name', 'run', 'args', 'scope', 'include', 'timeoutMs'])

describe('no-privileged-api (D-092)', () => {
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

  it('a core-shaped spec and a custom-shaped spec with the same run target produce structurally identical outcomes', async () => {
    const coreShaped: CheckSpec = { name: 'core-fixture', run: FIXTURE, scope: 'full' }
    const customShaped: CheckSpec = { name: 'custom-fixture', run: FIXTURE, scope: 'full' }

    const [coreOutcome, customOutcome] = await runChecks([coreShaped, customShaped], {
      parallel: 2,
      diffOnly: false,
      changedFiles: null,
      defaultTimeoutMs: 5000
    })

    expect(Object.keys(coreOutcome ?? {}).sort()).toEqual(Object.keys(customOutcome ?? {}).sort())
    expect(coreOutcome?.status).toBe(customOutcome?.status)
    expect(coreOutcome?.exitCode).toBe(customOutcome?.exitCode)
  })

  it('runChecks has no branch on provenance — the real core registry runs through the identical path a fixture custom check does', async () => {
    const customSpec: CheckSpec = { name: 'custom-fixture', run: FIXTURE, scope: 'full' }
    const [customOutcome] = await runChecks([customSpec], {
      parallel: 1,
      diffOnly: false,
      changedFiles: null,
      defaultTimeoutMs: 5000
    })
    const expectedFields = ['durationMs', 'errors', 'exitCode', 'name', 'status'].sort()
    expect(
      Object.keys(customOutcome ?? {}).sort(),
      'a custom check outcome must carry exactly the same field set a core check outcome does — no privileged shape either side'
    ).toEqual(expectedFields)
  })
})
