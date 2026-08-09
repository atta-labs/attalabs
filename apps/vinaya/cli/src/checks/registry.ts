import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { packageRoot } from '../lib/package-root.js'
import type { CheckSpec } from './contract'

// `packageRoot(import.meta.url)` walks up to the nearest `package.json`
// rather than a fixed `../..` — the fixed depth was correct only when
// running unbundled from `src/checks/`; once bundled into a single-file
// `dist/index.js` (what a real `npm install` ships), the depth from the
// bundled file to the package root differs, and a fixed walk landed every
// `BIN_DIR`-derived path one directory short. `BIN_DIR` is still computed
// once at module scope: the package root a check's bin resolves against
// never changes at runtime.
//
// **The published tarball never contains `src/`** — `package.json`'s
// `files` allowlist ships only `dist`, `templates`, `README.md`. Every one
// of these checks was 100% unreachable through a real `npm install`
// (`check --all` errored "not found on PATH" for all 15 — found live
// against the real published `@attalabs/vinaya@0.1.1`, not caught by any
// prior review because verification only ever ran against local source,
// where `src/checks/bin/*.ts` genuinely exists). `scripts/build.ts` now
// bundles each `src/checks/bin/*.ts` to its own standalone, self-contained
// `dist/checks/bin/*.js` (same `Bun.build` shape as the main `dist/index.js`
// entrypoint) — that bundled output is what actually ships. Prefer it when
// present; fall back to the raw `.ts` source so `bun src/index.ts check
// --all` still works for local, unbundled dev without requiring a build
// first.
const DIST_BIN_DIR = join(packageRoot(import.meta.url), 'dist', 'checks', 'bin')
const SRC_BIN_DIR = join(packageRoot(import.meta.url), 'src', 'checks', 'bin')
const BIN_DIR = existsSync(DIST_BIN_DIR) ? DIST_BIN_DIR : SRC_BIN_DIR
const BIN_EXT = BIN_DIR === DIST_BIN_DIR ? '.js' : '.ts'

/** `bin('check-brief-shape')` → the real, resolvable path to that check's executable — bundled `.js` when shipped, raw `.ts` in local dev. */
function bin(name: string): string {
  return join(BIN_DIR, `${name}${BIN_EXT}`)
}

/**
 * The four core AEG gates an adopter's repo actually runs, expressed as
 * ordinary `CheckSpec`s — the exact shape a `vinaya.config.json` entry
 * produces. No extra field, no privileged flag: this IS the
 * no-privileged-API proof, not a stylistic choice. See
 * `tests/checks/no-privileged-api.test.ts`.
 *
 * `reader-resolvable-prose` is NOT registered here: it hardcodes this
 * monorepo's own doctrine layout
 * (`aeg-root/glossary.md`, `aeg-root/tranches/completed/`) and this
 * monorepo's own marketing-site source path
 * (`apps/vinaya/web/src/app/(site)/**\/page.tsx`) — a scope-registration bug,
 * not a pathing one. No `packageRoot()`-style fix makes those paths exist in
 * an arbitrary adopter's repo. The check's bin and its underlying
 * `@atta/aeg-core` logic are left in place — they may still be useful as this
 * repo's own internal doc-quality tool — but they are reachable only by
 * direct invocation, never through this adopter-facing registry.
 */
export function coreCheckRegistry(): CheckSpec[] {
  return [
    {
      name: 'brief-shape',
      run: bin('check-brief-shape'),
      scope: 'diff',
      timeoutMs: 15_000,
      // `process.env.PR_BODY ?? ''` — a missing PR_BODY is the documented
      // "local dev outside a CI/PR context — nothing to do" bypass, not a
      // hard requirement.
      env: { PR_BODY: { optional: true } }
    },
    {
      name: 'doc-coverage',
      run: bin('check-doc-coverage'),
      scope: 'diff',
      timeoutMs: 15_000,
      // `resolvePrBody()` falls through to `''` when neither PR_BODY nor
      // PR_BODY_FILE is set — the legitimate ring-0 "no PR exists yet" case.
      // BASE_SHA/PR_LABELS/WAIVER_LABEL_ACTOR each already default via
      // `|| 'origin/main'` / `|| ''` / `|| null` in the bin itself.
      env: {
        BASE_SHA: { optional: true },
        PR_BODY: { optional: true },
        PR_BODY_FILE: { optional: true },
        PR_LABELS: { optional: true },
        WAIVER_LABEL_ACTOR: { optional: true }
      }
    },
    {
      name: 'coherence',
      run: bin('check-coherence'),
      scope: 'full',
      timeoutMs: 30_000,
      // `resolveToken()`'s three-tier fallback (GITHUB_TOKEN, then GH_TOKEN,
      // then a `gh auth token` subprocess) means neither var is ever
      // hard-required — the subprocess path is the documented reason zero
      // pre-spawn env coverage is the correct outcome here, not a gap.
      // AEG_REPO/BRANCH each fall back to `git remote`/`git rev-parse`.
      env: {
        AEG_REPO: { optional: true },
        BRANCH: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'dispatch-readiness',
      run: bin('check-dispatch-readiness'),
      scope: 'full',
      timeoutMs: 30_000,
      // Identical `resolveToken()` three-tier fallback to `coherence` above
      // — same reasoning, same declaration.
      env: {
        AEG_REPO: { optional: true },
        BRANCH: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'closes-n',
      run: bin('check-closes-n'),
      scope: 'diff',
      timeoutMs: 15_000,
      // `process.env.PR_BODY ?? ''`; BRANCH/AEG_REPO both fall back to git
      // (`rev-parse --abbrev-ref HEAD` / `remote get-url origin`).
      env: {
        BRANCH: { optional: true },
        PR_BODY: { optional: true },
        AEG_REPO: { optional: true }
      }
    },
    {
      name: 'single-plan-pr',
      run: bin('check-single-plan-pr'),
      scope: 'diff',
      timeoutMs: 15_000,
      // BASE_SHA defaults to `'origin/main'`; PR_NUMBER's absence takes the
      // explicit `? Number(...) : null` branch — both tolerate absence.
      // Tokens forwarded so the bin's `gh pr list` authenticates on CI
      // runners (fail-open to [] without them — silently vacuous there).
      env: {
        BASE_SHA: { optional: true },
        PR_NUMBER: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'test-plan',
      run: bin('check-test-plan'),
      scope: 'diff',
      timeoutMs: 15_000,
      // `process.env.PR_BODY ?? ''` / `process.env.BRANCH ?? ''` — both
      // plain absence-tolerant fall-throughs.
      env: {
        PR_BODY: { optional: true },
        BRANCH: { optional: true }
      }
    },
    {
      name: 'no-disk-state',
      run: bin('check-no-disk-state'),
      scope: 'diff',
      timeoutMs: 15_000,
      // BASE_SHA defaults to `'origin/main'`, with a further `main...HEAD`
      // fallback in the bin itself when that yields no files.
      env: { BASE_SHA: { optional: true } }
    },
    {
      name: 'registry-gates',
      run: bin('check-registry-gates'),
      scope: 'full',
      timeoutMs: 30_000,
      // `resolveRepo()`'s only env read; falls back to `git remote get-url
      // origin` when unset. The bin is otherwise dormant (exit 0) when
      // `aeg-root/enforcement.md` doesn't exist — no other env dependency.
      env: { AEG_REPO: { optional: true } }
    },
    {
      name: 'review-gate',
      run: bin('check-review-gate'),
      scope: 'full',
      timeoutMs: 30_000,
      // BRANCH falls back to git; PR_NUMBER's absence takes the explicit
      // "no PR to evaluate yet (local dev, pre-push before a PR exists)"
      // bypass documented in the bin's own module comment. The bin shells
      // to `gh` directly (no `resolveToken()`), and on a CI runner `gh`
      // authenticates ONLY from GH_TOKEN/GITHUB_TOKEN — without forwarding
      // them the allowlist strips the workflow-provided token and every
      // `gh pr view` fails. Optional because local runs use `gh`'s own
      // keyring auth with no env var at all.
      env: {
        BRANCH: { optional: true },
        PR_NUMBER: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'branch-topology',
      run: bin('check-branch-topology'),
      scope: 'full',
      timeoutMs: 30_000,
      // BRANCH falls back to git; AEG_REPO falls back to `git remote`.
      env: {
        BRANCH: { optional: true },
        AEG_REPO: { optional: true }
      }
    },
    {
      name: 'dead-branch-push',
      run: bin('check-dead-branch-push'),
      scope: 'full',
      timeoutMs: 30_000,
      // BRANCH falls back to `git rev-parse --abbrev-ref HEAD`; the bin's
      // own module comment documents fail-open (UNKNOWN → allow) for every
      // other forge-reachability gap, unrelated to env absence. Tokens
      // forwarded so `gh pr list` authenticates on CI runners instead of
      // taking that UNKNOWN branch on every run.
      env: {
        BRANCH: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'first-push-dispatch',
      run: bin('check-first-push-dispatch'),
      scope: 'full',
      timeoutMs: 30_000,
      // BRANCH/AEG_REPO fall back to git; GITHUB_TOKEN/GH_TOKEN read as
      // `process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''` inside
      // `classifyReadiness` — absence degrades to an empty token, which
      // `fetchOpenIssuesByLabel` tolerates (fail-open, per the bin's own
      // module comment on forge-reachability failures).
      env: {
        BRANCH: { optional: true },
        AEG_REPO: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    },
    {
      name: 'doc-coverage-push',
      run: bin('check-doc-coverage-push'),
      scope: 'diff',
      timeoutMs: 15_000,
      // Same `resolvePrBody()`/BASE_SHA/PR_LABELS/WAIVER_LABEL_ACTOR
      // absence-tolerance as `doc-coverage` above, plus OVERRIDE_DOCS
      // (`overrideActive()`'s first, env-only check) which is opt-in by
      // design — absence is the default, unremarkable path.
      env: {
        OVERRIDE_DOCS: { optional: true },
        BASE_SHA: { optional: true },
        PR_BODY: { optional: true },
        PR_BODY_FILE: { optional: true },
        PR_LABELS: { optional: true },
        WAIVER_LABEL_ACTOR: { optional: true }
      }
    },
    {
      name: 'issue-assignment',
      run: bin('check-issue-assignment'),
      scope: 'full',
      timeoutMs: 30_000,
      // AEG_REPO/BRANCH both fall back to git. Every other fact this bin
      // needs (remote-ref existence, assignees, the authenticated login)
      // comes from `gh` subprocess calls gated behind `parsed &&
      // !remoteRefExists`, never a raw env read — tokens forwarded so
      // those calls authenticate on CI runners instead of null-skipping.
      env: {
        AEG_REPO: { optional: true },
        BRANCH: { optional: true },
        GITHUB_TOKEN: { optional: true },
        GH_TOKEN: { optional: true }
      }
    }
  ]
}
