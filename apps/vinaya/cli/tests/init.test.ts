import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { DOC_OWNERS_PATH } from '@atta/aeg-core'
import {
  ARCHIVIST_WORKFLOW_PATH,
  buildInitOps,
  CHECKS_WORKFLOW_PATH,
  CONFIG_PATH,
  DOCTRINE_POINTER_PATH,
  REVIEW_WORKFLOW_PATH,
  REVIEW_VERDICT_WORKFLOW_PATH,
  starterConfig
} from '../src/lib/artifacts.js'
import type { InitDeps } from '../src/commands/init.js'
import { runInit, runInitProduct } from '../src/commands/init.js'
import { runEject } from '../src/commands/eject.js'
import type { EjectDeps } from '../src/commands/eject.js'
import type { LabelGateway } from '../src/lib/ops.js'

let root: string
let createdLabels: string[]

function makeDeps(overrides: Partial<InitDeps> = {}): InitDeps {
  const labels: LabelGateway = {
    async exists() {
      return false
    },
    async create(name) {
      createdLabels.push(name)
    }
  }
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    checkGhAuth: async () => true,
    labelGateway: () => labels,
    hookDirFor: () => '.husky',
    customHooksPath: async () => null,
    confirm: async () => true,
    ...overrides
  }
}

function ejectDeps(overrides: Partial<EjectDeps> = {}): EjectDeps {
  return {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    confirm: async () => true,
    ...overrides
  }
}

/** Recursive snapshot of the fixture tree: relative path → content. */
function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out.set(relative(dir, p), readFileSync(p, 'utf-8'))
    }
  }
  walk(dir)
  return out
}

/** Capture process.stdout.write output during `fn`, returning the output. */
async function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout)
  let buf = ''
  process.stdout.write = ((chunk: string) => {
    buf += chunk
    return true
  }) as typeof process.stdout.write
  try {
    await fn()
  } finally {
    process.stdout.write = original
  }
  return buf
}

beforeEach(() => {
  root = join(tmpdir(), `vinaya-init-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  // A pre-existing adopter file that must survive init and eject untouched.
  writeFileSync(join(root, 'README.md'), '# widget\n')
  createdLabels = []
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('vinaya init', () => {
  it('installs exactly the 6-item minimal manifest on a clean repo', async () => {
    let rc = -1
    await captureStdout(async () => {
      rc = await runInit(['--yes'], makeDeps())
    })
    expect(rc).toBe(0)

    // The minimal manifest (2026-07-23 re-ruling, +doc-owners #665; the
    // workflows item grew to three with the archivist workflow #761, and to
    // four with the review-verdict workflow — the comment half of the review
    // gate split into its own file so verdict comments can re-trigger the
    // required run): config + root VINAYA.md + four workflows (tracked) +
    // two hook stubs + the .vinaya/doc-owners starter. Nothing else is
    // written.
    for (const p of [
      CONFIG_PATH,
      DOCTRINE_POINTER_PATH,
      CHECKS_WORKFLOW_PATH,
      REVIEW_WORKFLOW_PATH,
      REVIEW_VERDICT_WORKFLOW_PATH,
      ARCHIVIST_WORKFLOW_PATH,
      '.husky/pre-commit',
      '.husky/pre-push',
      DOC_OWNERS_PATH
    ]) {
      expect(existsSync(join(root, p))).toBe(true)
    }
    expect(DOCTRINE_POINTER_PATH).toBe('VINAYA.md') // root placement, not governance/

    // Exhaustiveness: NOTHING outside the manifest lands. The cut artifacts
    // (governance/, GitHub templates, example scripts) must be absent.
    const tree = new Set(snapshot(root).keys())
    const expected = new Set([
      'README.md', // pre-existing adopter file
      CONFIG_PATH,
      DOCTRINE_POINTER_PATH,
      CHECKS_WORKFLOW_PATH,
      REVIEW_WORKFLOW_PATH,
      REVIEW_VERDICT_WORKFLOW_PATH,
      ARCHIVIST_WORKFLOW_PATH,
      '.husky/pre-commit',
      '.husky/pre-push',
      DOC_OWNERS_PATH
    ])
    expect(tree).toEqual(expected)
    for (const gone of [
      'governance',
      'scripts/vinaya-checks',
      '.github/ISSUE_TEMPLATE/vinaya-task.md',
      '.github/pull_request_template.md'
    ]) {
      expect(existsSync(join(root, gone))).toBe(false)
    }

    // labels created-if-absent
    expect(createdLabels).toContain('vinaya/tier:0')
    expect(createdLabels).toContain('vinaya/needs:principal-input')
    // starter config ships no example checks (empty `checks`)
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    expect(cfg.checks).toEqual({})
    // manifest recorded in config
    expect(cfg.managed.version).toBe(1)
    expect(cfg.managed.files).toContain(CHECKS_WORKFLOW_PATH)
    expect(cfg.managed.files).toContain(DOCTRINE_POINTER_PATH)
    expect(cfg.managed.blocks.some((b: { path: string }) => b.path === '.husky/pre-commit')).toBe(true)
    // hooks are executable
    expect(statSync(join(root, '.husky/pre-commit')).mode & 0o111).not.toBe(0)
  })

  it('hook stubs pin the exact installed version with --yes (npx cache-key regression)', () => {
    // A bare/`@latest`-spec npx cache entry does not satisfy `--no-install
    // @attalabs/vinaya` — on a fresh machine the first commit after init died
    // on npx's non-interactive cancel. The exact-version `--yes` pin is the
    // fix; this locks it.
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '..', 'package.json'), 'utf-8')) as { version: string }
    const hookOps = buildInitOps({ owner: 'acme', repo: 'widget', hookDir: '.husky' }).filter(
      (op) => op.kind === 'managed-block' && /pre-(commit|push)/.test(op.path)
    )
    expect(hookOps.length).toBe(2)
    for (const op of hookOps) {
      if (op.kind !== 'managed-block') continue
      expect(op.body).toContain(`npx --yes @attalabs/vinaya@${pkg.version} check`)
      expect(op.body).not.toContain('--no-install')
    }
  })

  it('--dry-run writes nothing but shows the exact content install would write', async () => {
    const before = snapshot(root)
    const out = await captureStdout(() => runInit(['--dry-run'], makeDeps()))
    const after = snapshot(root)
    expect(after).toEqual(before) // nothing written
    // dry-run diff shows the exact bytes a real install writes
    for (const op of buildInitOps({ owner: 'acme', repo: 'widget', hookDir: '.husky' })) {
      if (op.kind === 'create-file') expect(out).toContain(op.content.trimEnd().split('\n')[0] ?? '')
    }
    expect(out).toContain('nothing was written')
  })

  it('dry-run output byte-matches what install then writes (content artifacts)', async () => {
    await runInit(['--yes'], makeDeps())
    for (const op of buildInitOps({ owner: 'acme', repo: 'widget', hookDir: '.husky' })) {
      // vinaya.config.json is the one file whose bytes legitimately differ: the
      // ownership `managed` manifest is injected at apply time. Every other
      // create-file artifact is byte-identical to what the diff showed.
      if (op.kind === 'create-file' && op.path !== CONFIG_PATH) {
        expect(readFileSync(join(root, op.path), 'utf-8')).toBe(op.content)
      }
    }
    // config: seed portion is exactly the starter ruleset; only `managed` is added.
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    const { managed, ...seed } = cfg
    expect(managed).toBeDefined()
    expect(seed).toEqual(starterConfig() as unknown as typeof seed)
  })

  it('aborting the confirmation writes nothing and exits clean', async () => {
    const before = snapshot(root)
    const rc = await runInit([], makeDeps({ confirm: async () => false }))
    expect(rc).toBe(0)
    expect(snapshot(root)).toEqual(before)
  })

  it('refuses without gh auth unless --dry-run', async () => {
    const rc = await runInit(['--yes'], makeDeps({ checkGhAuth: async () => false }))
    expect(rc).toBe(1)
    expect(existsSync(join(root, CONFIG_PATH))).toBe(false)
  })

  it('stops on a custom core.hooksPath rather than guessing', async () => {
    const rc = await runInit(['--yes'], makeDeps({ customHooksPath: async () => '.config/hooks' }))
    expect(rc).toBe(1)
    expect(existsSync(join(root, CONFIG_PATH))).toBe(false)
  })
})

describe('remoteless graceful-skip (spec D3)', () => {
  it('warns, skips labels, and still installs + prints the summary — no gh-auth requirement either', async () => {
    let ghAuthCalled = false
    const deps = makeDeps({
      detectRepo: async () => ({ repoRoot: root, owner: '', repo: '' }),
      checkGhAuth: async () => {
        ghAuthCalled = true
        return false // would fail the run if it were ever consulted
      }
    })

    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runInit(['--yes'], deps)
    })

    expect(ghAuthCalled).toBe(false)
    expect(rc).toBe(0)
    expect(out).toContain('Vinaya installed')
    expect(out).not.toContain('vinaya/tier:0') // no label ops rendered

    // everything except labels still installed
    for (const p of [
      CONFIG_PATH,
      DOCTRINE_POINTER_PATH,
      CHECKS_WORKFLOW_PATH,
      REVIEW_WORKFLOW_PATH,
      '.husky/pre-commit'
    ]) {
      expect(existsSync(join(root, p))).toBe(true)
    }
    expect(createdLabels).toEqual([])
  })

  it('init product scaffolds nothing (its only op is a label) but still exits clean', async () => {
    await runInit(['--yes'], makeDeps())
    createdLabels = []
    const rc = await runInitProduct(
      ['mobile', '--yes'],
      makeDeps({ detectRepo: async () => ({ repoRoot: root, owner: '', repo: '' }) })
    )
    expect(rc).toBe(0)
    expect(createdLabels).toEqual([])
  })
})

describe('never-clobber', () => {
  it('appends to a pre-existing hook and REFUSES a foreign workflow + root VINAYA.md', async () => {
    mkdirSync(join(root, '.husky'), { recursive: true })
    writeFileSync(join(root, '.husky/pre-commit'), '#!/usr/bin/env sh\nnpm run lint\n')
    mkdirSync(join(root, '.github/workflows'), { recursive: true })
    writeFileSync(join(root, CHECKS_WORKFLOW_PATH), 'name: not-ours\n')
    // A pre-existing root VINAYA.md is the new refuse-if-foreign collision case
    // (it replaces the PR-template collision the old manifest carried).
    writeFileSync(join(root, DOCTRINE_POINTER_PATH), '# my own notes\n')

    const out = await captureStdout(() => runInit(['--yes'], makeDeps()))

    // hook: adopter line kept, managed block appended
    const hook = readFileSync(join(root, '.husky/pre-commit'), 'utf-8')
    expect(hook).toContain('npm run lint')
    expect(hook).toContain('vinaya:managed:pre-commit')
    // foreign checks workflow: untouched, and REFUSE shown in the diff
    expect(readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')).toBe('name: not-ours\n')
    expect(out).toContain('REFUSE')
    expect(out).toContain(CHECKS_WORKFLOW_PATH)
    // foreign root VINAYA.md: untouched, and REFUSE shown in the diff
    expect(readFileSync(join(root, DOCTRINE_POINTER_PATH), 'utf-8')).toBe('# my own notes\n')
    expect(out).toContain(DOCTRINE_POINTER_PATH)
    // the non-foreign review workflow still installs
    expect(existsSync(join(root, REVIEW_WORKFLOW_PATH))).toBe(true)
  })

  it('REFUSES a foreign .vinaya/doc-owners rather than overwriting it', async () => {
    mkdirSync(join(root, '.vinaya'), { recursive: true })
    writeFileSync(join(root, DOC_OWNERS_PATH), '# adopter-authored bindings\napp/** docs/app.md\n')

    const out = await captureStdout(() => runInit(['--yes'], makeDeps()))

    expect(readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')).toBe('# adopter-authored bindings\napp/** docs/app.md\n')
    expect(out).toContain('REFUSE')
    expect(out).toContain(DOC_OWNERS_PATH)
  })
})

describe('workflows', () => {
  it('splits the review gate: required half on pull_request only, verdict half on issue_comment', async () => {
    await runInit(['--yes'], makeDeps())
    const checks = readFileSync(join(root, CHECKS_WORKFLOW_PATH), 'utf-8')
    const review = readFileSync(join(root, REVIEW_WORKFLOW_PATH), 'utf-8')
    const verdict = readFileSync(join(root, REVIEW_VERDICT_WORKFLOW_PATH), 'utf-8')
    expect(checks).toContain('pull_request')
    expect(checks).not.toContain('issue_comment')
    // Required half: pull_request only — no comment path, so its runs never
    // list permanently-skipped comment jobs.
    expect(review).toContain('pull_request')
    expect(review).not.toContain('issue_comment')
    // Verdict half: comment-triggered, VERDICT-guarded before checkout cost,
    // evaluator holds no write permission, retrigger re-runs the required run.
    expect(verdict).toContain('issue_comment')
    expect(verdict).toContain('VERDICT')
    expect(verdict).toContain('actions: write')
    expect(verdict).toContain('gh run rerun')
    expect(verdict).toContain('vinaya-review.yml')
    expect(checks).toContain('vinaya check --all --diff-only')
    // PR_NUMBER wiring is what makes the review-gate adapter EVALUATE —
    // without it the check reads "local dev" and exits 0 unconditionally,
    // a vacuous gate (PR #813 review blocker). Guard all three PR-facing
    // workflows.
    expect(review).toContain('PR_NUMBER')
    expect(checks).toContain('PR_NUMBER')
    expect(verdict).toContain('PR_NUMBER')
    expect(verdict).toContain('steps.pr.outputs.number')
  })
})

describe('round-trip: init then eject returns the repo to pre-init state', () => {
  it('clean fixture: filesystem is identical before init and after eject', async () => {
    const before = snapshot(root)
    await runInit(['--yes'], makeDeps())
    expect(snapshot(root)).not.toEqual(before) // init changed things
    const out = await captureStdout(() => runEject(['--yes'], ejectDeps()))
    expect(snapshot(root)).toEqual(before) // eject restored exactly
    // labels reported for manual removal, never auto-deleted
    expect(out).toContain('gh label delete vinaya/tier:0')
  })

  it('fixture with adopter lines in a hook: eject strips only the vinaya block', async () => {
    mkdirSync(join(root, '.husky'), { recursive: true })
    writeFileSync(join(root, '.husky/pre-commit'), '#!/usr/bin/env sh\nnpm run lint\n')
    const before = snapshot(root)

    await runInit(['--yes'], makeDeps())
    await runEject(['--yes'], ejectDeps())

    // their hook + line survive; no vinaya block remains
    const hook = readFileSync(join(root, '.husky/pre-commit'), 'utf-8')
    expect(hook).toContain('npm run lint')
    expect(hook).not.toContain('vinaya:managed')
    // everything else restored
    expect(snapshot(root)).toEqual(before)
  })

  it('eject is a no-op on an untouched repo', async () => {
    const before = snapshot(root)
    const rc = await runEject(['--yes'], ejectDeps())
    expect(rc).toBe(0)
    expect(snapshot(root)).toEqual(before)
  })

  it('eject refuses when the manifest is missing/corrupt (never a destructive guess)', async () => {
    // vinaya.config.json present but no `managed` manifest
    writeFileSync(
      join(root, CONFIG_PATH),
      JSON.stringify({ rings: { ring1_forgeWriteInterception: false, ring2_asyncAudits: false } })
    )
    const rc = await runEject(['--yes'], ejectDeps())
    expect(rc).toBe(1)
    // did not delete the file it could not prove ownership of
    expect(existsSync(join(root, CONFIG_PATH))).toBe(true)
  })
})

describe('vinaya init product', () => {
  it('refuses before init, then creates the project:<name> label and a .vinaya/projects.md row after', async () => {
    // before init
    const rcBefore = await runInitProduct(['mobile'], makeDeps())
    expect(rcBefore).toBe(1)

    await runInit(['--yes'], makeDeps())
    const treeAfterInit = snapshot(root)
    createdLabels = [] // isolate what `init product` creates

    const rc = await runInitProduct(['mobile', '--path', 'apps/mobile', '--yes'], makeDeps())
    expect(rc).toBe(0)
    // minimal manifest: init product's only forge-reaching op is the
    // project:<name> label — no governance/ files are written.
    expect(createdLabels).toEqual(['project:mobile'])
    expect(existsSync(join(root, 'governance'))).toBe(false)
    // the registry row IS a new local file, so the tree grows by exactly
    // `.vinaya/projects.md` — it is deliberately not tracked in the managed
    // manifest (adopter-declared data, not vinaya-owned scaffolding).
    const treeAfterProduct = snapshot(root)
    const newPaths = [...treeAfterProduct.keys()].filter((p) => !treeAfterInit.has(p))
    expect(newPaths).toEqual(['.vinaya/projects.md'])
    const registry = readFileSync(join(root, '.vinaya/projects.md'), 'utf-8')
    expect(registry).toContain('| mobile | `apps/mobile` | `apps/mobile/specs` |')
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    expect(cfg.managed.labels).toContain('project:mobile')
    expect(cfg.managed.files).not.toContain('.vinaya/projects.md')
  })

  it('re-running init product for the same name is idempotent (no duplicate row)', async () => {
    await runInit(['--yes'], makeDeps())
    await runInitProduct(['mobile', '--path', 'apps/mobile', '--yes'], makeDeps())
    const rc = await runInitProduct(['mobile', '--path', 'apps/mobile', '--yes'], makeDeps())
    expect(rc).toBe(0)
    const registry = readFileSync(join(root, '.vinaya/projects.md'), 'utf-8')
    const rows = registry.split('\n').filter((l) => l.trim().startsWith('| mobile |'))
    expect(rows).toHaveLength(1)
  })

  it('appends a second row for a second product without disturbing the first', async () => {
    await runInit(['--yes'], makeDeps())
    await runInitProduct(['mobile', '--path', 'apps/mobile', '--yes'], makeDeps())
    await runInitProduct(['web', '--path', 'apps/web', '--yes'], makeDeps())
    const registry = readFileSync(join(root, '.vinaya/projects.md'), 'utf-8')
    expect(registry).toContain('| mobile | `apps/mobile` |')
    expect(registry).toContain('| web | `apps/web` |')
  })

  it('rejects a product name with path traversal, creating nothing (security finding 2)', async () => {
    await runInit(['--yes'], makeDeps())
    const before = snapshot(root)
    createdLabels = []
    for (const bad of ['../../evil', 'a/b', '..', 'Mobile', 'has space']) {
      const rc = await runInitProduct([bad, '--yes'], makeDeps())
      expect(rc).toBe(2)
    }
    expect(snapshot(root)).toEqual(before)
    expect(createdLabels).toEqual([]) // no label leaked for a bad name
  })
})

describe('eject path-traversal safety (security finding 1)', () => {
  it('refuses a hostile manifest (`..` path) and deletes nothing outside the repo', async () => {
    // OUTSIDE.txt lives one dir above the repo root; a hostile manifest tries to reach it.
    const parent = join(tmpdir(), `vinaya-esc-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(parent, 'repo'), { recursive: true })
    const localRoot = join(parent, 'repo')
    const outside = join(parent, 'OUTSIDE.txt')
    writeFileSync(outside, 'must survive')
    // A `..` path fails the schema refinement → readManifest sees it as corrupt → orphan refuse.
    writeFileSync(
      join(localRoot, 'vinaya.config.json'),
      JSON.stringify({ managed: { version: 1, files: ['../OUTSIDE.txt'], blocks: [], labels: [] } })
    )
    const rc = await runEject(['--yes'], {
      detectRepo: async () => ({ repoRoot: localRoot, owner: 'acme', repo: 'widget' }),
      confirm: async () => true
    })
    expect(rc).toBe(1)
    expect(existsSync(outside)).toBe(true) // never deleted
    rmSync(parent, { recursive: true, force: true })
  })
})

describe('partial-failure ownership recording (review finding 3)', () => {
  it('persists the files+blocks manifest before labels, so a label-create failure cannot orphan files', async () => {
    const throwing: LabelGateway = {
      async exists() {
        return false
      },
      async create() {
        throw new Error('gh rate limit')
      }
    }
    let rc = -1
    await captureStdout(async () => {
      rc = await runInit(['--yes'], makeDeps({ labelGateway: () => throwing }))
    })
    // A label-create failure is a warning, not a crash — every other artifact
    // already applied, so the command still finishes with exit 0.
    expect(rc).toBe(0)
    // files were written AND recorded despite the label failure
    expect(existsSync(join(root, CHECKS_WORKFLOW_PATH))).toBe(true)
    const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf-8'))
    expect(cfg.managed.files).toContain(CHECKS_WORKFLOW_PATH)
    // → eject can now clean up (no orphan half-state)
    const before = snapshot(root)
    await runEject(['--yes'], ejectDeps())
    expect(snapshot(root)).not.toEqual(before)
    expect(existsSync(join(root, CHECKS_WORKFLOW_PATH))).toBe(false)
  })

  it('warns with the specific label name and the gateway failure reason, and continues to the next label', async () => {
    const flaky: LabelGateway = {
      async exists() {
        return false
      },
      async create(name) {
        if (name.endsWith('tier:0')) throw new Error('HTTP 404: Not Found')
        createdLabels.push(name)
      }
    }
    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = ((...args: unknown[]) => {
      warnings.push(args.join(' '))
    }) as typeof console.warn
    let rc = -1
    try {
      await captureStdout(async () => {
        rc = await runInit(['--yes'], makeDeps({ labelGateway: () => flaky }))
      })
    } finally {
      console.warn = originalWarn
    }
    expect(rc).toBe(0)
    expect(warnings.some((w) => w.includes('tier:0') && w.includes('HTTP 404: Not Found'))).toBe(true)
    // every other label still gets created — one failure doesn't stop the loop
    expect(createdLabels.length).toBeGreaterThan(0)
  })
})
