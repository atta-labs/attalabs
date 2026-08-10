// `vinaya quickstart`'s doc→code binding writer — the first programmatic
// writer for `.vinaya/doc-owners` (previously 100% hand-edited by adopters).
// Mirrors `lib/registry-write.ts`'s plan/apply/render shape exactly (same
// `create-host`/`append-row`/`skip-present` 3-state action, same
// plan-then-apply split). Simpler than the registry case: a `.vinaya/
// doc-owners` binding is a plain `<glob>  <pointer>` line (see
// `@atta/aeg-core`'s `parseDocOwners`), not a markdown table row — no
// heading/table-insertion logic is needed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DOC_OWNERS_PATH, parseDocOwners } from '@atta/aeg-core'

export type DocOwnersBindingAction = 'create-host' | 'append-row' | 'skip-present'

export type DocOwnersBindingPlan = {
  action: DocOwnersBindingAction
  /** The binding line as it will appear in the file, for diff display. */
  line: string
  /** Repo-relative path, for diff display. */
  path: string
}

function bindingLine(glob: string, pointer: string): string {
  return `${glob}  ${pointer}`
}

/** A brand-new `.vinaya/doc-owners`, seeded with one binding. No header — the
 * full grammar-explaining header is `vinaya init`'s own `starterDocOwners()`
 * (lib/artifacts.ts), written once at install time; this writer only ever
 * adds a binding line, whether the file already carries that header or not. */
export function freshDocOwners(glob: string, pointer: string): string {
  return `${bindingLine(glob, pointer)}\n`
}

/** Append a new binding line at the end of the file, preserving everything already there. */
export function appendDocOwnersBinding(content: string, glob: string, pointer: string): string {
  const sep = content.endsWith('\n') ? '' : '\n'
  return `${content}${sep}${bindingLine(glob, pointer)}\n`
}

/** Classify what binding `glob` → `pointer` would do to `.vinaya/doc-owners` — no writes. */
export function planDocOwnersBinding(repoRoot: string, glob: string, pointer: string): DocOwnersBindingPlan {
  const abs = join(repoRoot, DOC_OWNERS_PATH)
  const line = bindingLine(glob, pointer)
  if (!existsSync(abs)) {
    return { action: 'create-host', line, path: DOC_OWNERS_PATH }
  }
  const existing = readFileSync(abs, 'utf-8')
  const already = parseDocOwners(existing).bindings.some((b) => b.glob === glob)
  return { action: already ? 'skip-present' : 'append-row', line, path: DOC_OWNERS_PATH }
}

/** Apply a previously-planned binding change. No-op for `skip-present`. */
export function applyDocOwnersBinding(
  repoRoot: string,
  plan: DocOwnersBindingPlan,
  glob: string,
  pointer: string
): void {
  const abs = join(repoRoot, DOC_OWNERS_PATH)
  if (plan.action === 'create-host') {
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, freshDocOwners(glob, pointer), 'utf-8')
  } else if (plan.action === 'append-row') {
    const existing = readFileSync(abs, 'utf-8')
    writeFileSync(abs, appendDocOwnersBinding(existing, glob, pointer), 'utf-8')
  }
}

export function renderDocOwnersBindingDiffLine(plan: DocOwnersBindingPlan): string {
  if (plan.action === 'skip-present') return `  = keep   ${plan.path} (glob already bound)`
  if (plan.action === 'append-row') return `  ~ append line to ${plan.path}\n    ${plan.line}`
  return `  + create ${plan.path} (with binding)\n    ${plan.line}`
}
