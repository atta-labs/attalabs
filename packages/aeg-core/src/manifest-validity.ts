/**
 * doc-owners manifest validity checks (M1/M2/M3) plus the `# no-doc:` allow-list
 * parser. Pure — file-existence is injected by the caller.
 */

import { DOC_OWNERS_PATH, globToRegex, isUrlPointer, parseDocOwners, pointerToPath } from './doc-owners'

export type NoDocRule = { glob: string; reason: string }

/**
 * Parse `# no-doc: <glob> — <reason>` allow-list lines from doc-owners content.
 * These lines exempt a surface from the completeness scoreboard.
 */
export function parseNoDocRules(content: string): NoDocRule[] {
  const rules: NoDocRule[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^#\s+no-doc:\s+(\S+)(?:\s+[—–]\s+|\s+-\s+)(.+)$/)
    if (m) rules.push({ glob: (m[1] ?? '').trim(), reason: (m[2] ?? '').trim() })
  }
  return rules
}

/**
 * Validate the doc-owners manifest file (all bindings, not just fired ones).
 * M1 (hard-fail): in-repo pointer does not exist on disk.
 * M2 (advisory): glob fails to produce a valid regex (extremely unlikely with our simple grammar).
 * M3 (hard-fail): same glob appears more than once.
 */
export function checkManifestValidity(
  content: string | null,
  fileExists: (p: string) => boolean
): { m1Errors: string[]; m2Notes: string[]; m3Errors: string[]; noDocRules: NoDocRule[] } {
  if (content === null) return { m1Errors: [], m2Notes: [], m3Errors: [], noDocRules: [] }

  const { bindings, errors: parseErrors } = parseDocOwners(content)
  const m1Errors: string[] = [...parseErrors]
  const m2Notes: string[] = []
  const m3Errors: string[] = []
  const noDocRules = parseNoDocRules(content)

  // M2: glob syntax (advisory — our grammar is permissive so failures are very rare)
  for (const b of bindings) {
    if (!b.glob) {
      m2Notes.push(`M2 manifest-bad-glob: ${DOC_OWNERS_PATH}:${b.lineNum} — empty glob.`)
      continue
    }
    try {
      globToRegex(b.glob)
    } catch (e) {
      m2Notes.push(`M2 manifest-bad-glob: ${DOC_OWNERS_PATH}:${b.lineNum} — glob "${b.glob}" failed: ${e}`)
    }
  }

  // M3: duplicate globs
  const globLines = new Map<string, number[]>()
  for (const b of bindings) {
    const list = globLines.get(b.glob) ?? []
    list.push(b.lineNum)
    globLines.set(b.glob, list)
  }
  for (const [glob, lines] of globLines) {
    if (lines.length > 1) {
      m3Errors.push(
        `M3 manifest-duplicate-glob: ${DOC_OWNERS_PATH} — glob "${glob}" appears ${lines.length} times (lines ${lines.join(', ')}).`
      )
    }
  }

  // M1: every in-repo pointer exists on disk (checks ALL bindings, not just fired ones)
  for (const b of bindings) {
    if (isUrlPointer(b.pointer)) continue
    const pointerPath = pointerToPath(b.pointer)
    if (!fileExists(pointerPath)) {
      m1Errors.push(
        `M1 manifest-dangling: ${DOC_OWNERS_PATH}:${b.lineNum} — pointer ${b.pointer} does not exist on disk.`
      )
    }
  }

  return { m1Errors, m2Notes, m3Errors, noDocRules }
}
