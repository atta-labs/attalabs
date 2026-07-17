import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CheckSpec } from './contract'

const CLI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BIN_DIR = join(CLI_ROOT, 'src', 'checks', 'bin')

/**
 * The four core AEG gates, expressed as ordinary `CheckSpec`s — the exact
 * shape a `vinaya.config.json` entry produces. No extra field, no privileged
 * flag: this IS the D-092 no-privileged-API proof, not a stylistic choice.
 * See `tests/checks/no-privileged-api.test.ts`.
 */
export function coreCheckRegistry(): CheckSpec[] {
  return [
    {
      name: 'brief-shape',
      run: join(BIN_DIR, 'check-brief-shape.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'doc-coverage',
      run: join(BIN_DIR, 'check-doc-coverage.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'coherence',
      run: join(BIN_DIR, 'check-coherence.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'dispatch-readiness',
      run: join(BIN_DIR, 'check-dispatch-readiness.ts'),
      scope: 'full',
      timeoutMs: 30_000
    }
  ]
}
