/**
 * The `.vinaya/doc-owners` manifest parser and the C5 code→doc
 * coverage evaluator (state-machine.md Section 15). Pure — I/O (reading the
 * manifest off disk, checking pointer existence) is injected by the caller.
 */

import { isCodeFile } from './file-classify'
import { WAIVER_LABEL } from './waiver-label'

export const DOC_OWNERS_PATH = '.vinaya/doc-owners'

export type DocOwnersBinding = { glob: string; pointer: string; lineNum: number }

/**
 * What a caller found where the manifest should be.
 *
 * `absent` — a repo that never configured doc ownership. Legitimately dormant.
 * `empty` — a manifest that exists but has nothing in it. This is the shape a
 *   misresolved repo root produces, and reporting it as success is how a broken
 *   derivation passes for a real one. It is a refusal, not a dormancy.
 * `present` — parse it.
 *
 * Split out of `verify-dispatch --surfaces` so the three-way decision is
 * testable: the CLI chdirs to the repo root before reading, so the branch is
 * unreachable from a test as long as it lives inside the command.
 */
export type DocOwnersManifestState = 'absent' | 'empty' | 'present'

export function classifyDocOwnersManifest(content: string | null): DocOwnersManifestState {
  if (content === null) return 'absent'
  return content.trim() === '' ? 'empty' : 'present'
}

export type C5Result = { errors: string[]; notes: string[] }

/**
 * Parse the doc-owners file. Each non-blank, non-comment line is
 *   `<code-glob>  <doc-pointer>`
 *
 * Comments start with `#`. Pointer is in-repo path, path#anchor, or URL.
 * Returns the parsed bindings + any malformed-line errors.
 */
export function parseDocOwners(content: string): { bindings: DocOwnersBinding[]; errors: string[] } {
  const bindings: DocOwnersBinding[] = []
  const errors: string[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const stripped = raw.replace(/#.*$/, '').trim()
    if (!stripped) continue
    const parts = stripped.split(/\s+/)
    if (parts.length < 2) {
      errors.push(
        `C5 doc-owners-parse: ${DOC_OWNERS_PATH}:${i + 1} — malformed binding (expected "<glob>  <pointer>", got "${raw.trim()}").`
      )
      continue
    }
    const [glob, ...pointerParts] = parts
    bindings.push({ glob: glob ?? '', pointer: pointerParts.join(' '), lineNum: i + 1 })
  }
  return { bindings, errors }
}

/**
 * Translate a doc-owners glob to a RegExp. Deliberately simple — only `*` and
 * `**` are special; every other character is literal so Next.js dynamic-route
 * segments like `[username]` match without escaping.
 */
export function globToRegex(pat: string): RegExp {
  let re = '^'
  let i = 0
  while (i < pat.length) {
    const c = pat[i]
    if (c === '*') {
      if (pat[i + 1] === '*') {
        re += '.*'
        i += 2
      } else {
        re += '[^/]*'
        i += 1
      }
    } else if (/[.+^$|(){}[\]\\?]/.test(c as string)) {
      re += `\\${c}`
      i += 1
    } else {
      re += c
      i += 1
    }
  }
  re += '$'
  return new RegExp(re)
}

export function isUrlPointer(p: string): boolean {
  return /^https?:\/\//.test(p)
}

export function pointerToPath(p: string): string {
  const idx = p.indexOf('#')
  return idx === -1 ? p : p.slice(0, idx)
}

export type DocAck = { surface: string; note: string }

// Separator between <pointer> and <note>. Tolerates em-dash (—),
// en-dash (–), or a plain ASCII hyphen-minus (-) with REQUIRED surrounding
// whitespace. Required whitespace around `-` disambiguates the separator
// from hyphens that legitimately appear inside pointers (e.g. `aeg-root`,
// `.claude/skills/ui-components/SKILL.md`). Non-greedy `(.+?)` for the
// pointer plus this anchored separator means the pointer naturally stops
// at the first valid separator without literally excluding `-` from
// the pointer character set.
const SEPARATOR = /(?:[ \t]*[—–][ \t]*|[ \t]+-[ \t]+)/.source

export function readDocAcks(body: string): DocAck[] {
  const acks: DocAck[] = []
  const re = new RegExp(`^[ \\t]*Doc-ack[ \\t]*:[ \\t]*(.+?)${SEPARATOR}(.+?)[ \\t]*$`, 'gim')
  for (const m of body.matchAll(re)) {
    acks.push({ surface: (m[1] ?? '').trim(), note: (m[2] ?? '').trim() })
  }
  return acks
}

/**
 * Pure evaluator for the C5 doc-coverage check. The runtime wrapper reads
 * `.vinaya/doc-owners` from disk and `PR_BODY` from env; this
 * function takes both as inputs and an injectable file-exists for unit tests.
 *
 * Dormancy: a null `docOwnersContent` (absent file) OR no glob matching any
 * changed code file produces an empty result — no errors, no notes.
 *
 * `waiverActive` is a single PR-wide boolean, not a per-binding
 * pointer/reason lookup — it's the caller-resolved result of
 * `isWaiverLabelActorVerified`, itself a mechanized read of a forge fact.
 * There is no agent-emittable `Doc-waiver:` string anymore; a waiver is
 * either verified true PR-wide, or not.
 */
export function evaluateC5(
  changed: string[],
  docOwnersContent: string | null,
  prBody: string,
  fileExists: (p: string) => boolean,
  waiverActive: boolean
): C5Result {
  const out: C5Result = { errors: [], notes: [] }

  if (docOwnersContent === null) return out

  const { bindings, errors: parseErrors } = parseDocOwners(docOwnersContent)
  for (const e of parseErrors) out.errors.push(e)
  if (bindings.length === 0) return out

  const codeFiles = changed.filter(isCodeFile)
  const fired: DocOwnersBinding[] = []
  for (const b of bindings) {
    const re = globToRegex(b.glob)
    if (codeFiles.some((f) => re.test(f))) fired.push(b)
  }
  if (fired.length === 0) return out

  const acks = readDocAcks(prBody)

  for (const b of fired) {
    if (waiverActive) {
      out.notes.push(`C5 doc-waiver active for ${b.pointer} (binding ${DOC_OWNERS_PATH}:${b.lineNum})`)
      continue
    }

    if (isUrlPointer(b.pointer)) {
      const acked = acks.some((a) => a.surface === b.pointer)
      if (!acked) {
        out.errors.push(
          `C5 doc-coverage: code change matched ${DOC_OWNERS_PATH}:${b.lineNum} (glob \`${b.glob}\` → ${b.pointer}). External pointer requires \`Doc-ack: ${b.pointer} — <note>\` in the PR body, or an actor-verified \`${WAIVER_LABEL}\` label to skip.`
        )
      }
      continue
    }

    const pointerPath = pointerToPath(b.pointer)
    if (!fileExists(pointerPath)) {
      out.errors.push(
        `C5 doc-owners-dangling: ${DOC_OWNERS_PATH}:${b.lineNum} points to ${b.pointer}, which does not exist on disk. Fix the binding or add the doc.`
      )
      continue
    }

    if (!changed.includes(pointerPath)) {
      out.errors.push(
        `C5 doc-coverage: code change matched ${DOC_OWNERS_PATH}:${b.lineNum} (glob \`${b.glob}\` → ${b.pointer}), but ${pointerPath} is not in the PR diff. Update it, or have a principal apply the \`${WAIVER_LABEL}\` label.`
      )
    }
  }

  return out
}
