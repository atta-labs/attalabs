import { readMarkdownTable } from './parse-registry'
import type { Tranche, Lifecycle, Task } from './types'

/**
 * Parse `aeg-root/tranches/<name>.md` into a typed `Tranche`.
 *
 * Captures:
 *   - the tranche's name (from `# Tranche: <name> — <timeframe>`; the
 *     superseded `# Iteration:` spelling is still read, see `parseName`)
 *   - the lifecycle marker (`Lifecycle: active|complete`, defaulting to
 *     `'active'` when absent — pre-§11 files have no marker)
 *   - the first goal paragraph
 *   - the `## Tasks (topology)` table rows
 *   - per-task rationale blocks (raw markdown, captured verbatim)
 *   - an optional `## Backlog` section as bullets
 *
 * Real tranche files include narrative references to dropped task ids in
 * prose (e.g. `herald-onto-engine.md`'s "Task 3a — removed"). The parser
 * ignores those — only rows present in the topology table become tasks.
 */
export function parseTranche(md: string): Tranche {
  return {
    name: parseName(md),
    lifecycle: parseLifecycle(md),
    goal: parseGoal(md),
    tasks: parseTasks(md),
    backlog: parseBacklog(md)
  }
}

function parseName(md: string): string {
  // The H1 is `# Tranche: <slug> — <timeframe>`. The slug may contain
  // hyphens (e.g. `herald-onto-engine`, `aeg-ui-v1`), so capture the first
  // non-whitespace run — the space before the em-dash is the delimiter.
  //
  // `Iteration:` is accepted as the superseded spelling, permanently. This is
  // a READER of files this repo does not necessarily own: content pulled out
  // of git history predates the rename and cannot be rewritten, and an
  // adopter's own topology files are theirs, not ours to migrate. Refusing
  // the old marker would not fail loudly — `parseName` returns `''`, which
  // reads downstream as a nameless tranche. The writer side is unaffected:
  // every file this repo emits or archives carries `# Tranche:`.
  const m = md.match(/^#\s+(?:Tranche|Iteration):\s+(\S+)/m)
  return m?.[1] ? m[1].trim() : ''
}

function parseLifecycle(md: string): Lifecycle {
  // `Lifecycle: active` or `Lifecycle: complete`. The label may be wrapped in
  // bold (`**Lifecycle:** active`); the closing `**` sits after the colon.
  const m = md.match(/^\s*(?:\*\*)?Lifecycle\s*:(?:\*\*)?\s*(active|complete)\b/im)
  return m?.[1] ? (m[1].toLowerCase() as Lifecycle) : 'active'
}

function parseGoal(md: string): string {
  // Match `Goal (…): <text>` to the end of the paragraph.
  // The live files use various subtitles ("execution, not roadmap-why",
  // "execution, not product-why"); strip everything up to the colon and
  // capture the first paragraph that follows.
  const lines = md.split(/\r?\n/)
  const buf: string[] = []
  let inGoal = false
  for (const raw of lines) {
    const line = stripBoldWrappers(raw)
    if (!inGoal) {
      const m = line.match(/^Goal\b[^:]*:\s*(.*)$/i)
      if (m) {
        inGoal = true
        const rest = (m[1] ?? '').trim()
        if (rest) buf.push(rest)
      }
    } else {
      if (line.trim() === '') break
      // Stop at the next markdown heading or HR.
      if (/^#{1,6}\s/.test(line) || /^---+\s*$/.test(line)) break
      buf.push(line.trim())
    }
  }
  return buf.join(' ').trim()
}

function stripBoldWrappers(line: string): string {
  // Remove bold markers around `Goal …:` or `Lifecycle:` style lines so the
  // greedy regexes above work on either `**Goal:**` or plain `Goal:`.
  return line.replace(/\*\*/g, '')
}

function parseTasks(md: string): Task[] {
  const rows = readMarkdownTable(md, /^##\s+Tasks\b/i)
  const rationales = extractRationales(md)
  const tasks: Task[] = []
  for (const row of rows) {
    // Expected 6 columns: # | Task | Issue | Project(s) | Depends-on | Conflicts-with.
    if (row.length < 6) continue
    const id = (row[0] ?? '').trim()
    if (!id) continue
    tasks.push({
      id,
      title: (row[1] ?? '').trim(),
      issue: parseIssueCell(row[2] ?? ''),
      projects: parseCsvCell(row[3] ?? ''),
      dependsOn: parseEdgeCell(row[4] ?? ''),
      conflictsWith: parseEdgeCell(row[5] ?? ''),
      rationaleMarkdown: rationales.get(id) ?? ''
    })
  }
  return tasks
}

function parseIssueCell(cell: string): number | null {
  const trimmed = stripBackticks(cell).trim()
  if (!trimmed) return null
  if (isEmDashOrDash(trimmed)) return null
  const m = trimmed.match(/#?(\d+)/)
  return m ? Number(m[1]) : null
}

function parseCsvCell(cell: string): string[] {
  const cleaned = stripBackticks(cell).trim()
  if (!cleaned || isEmDashOrDash(cleaned)) return []
  return cleaned
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseEdgeCell(cell: string): string[] {
  return parseCsvCell(cell)
}

function isEmDashOrDash(s: string): boolean {
  const t = s.trim()
  return t === '—' || t === '-' || t === '–'
}

function stripBackticks(s: string): string {
  return s.replace(/`/g, '')
}

/**
 * Capture each `### Task <id> — …` block as raw markdown — from the heading
 * through the line before the next `### ` / `## ` / `# ` / end-of-file.
 * The id may be `1`, `7a`, `7b`, etc. Per-task rationale lives inline in the
 * tranche file (see §4 template); the planner's rationale also lives in the
 * Issue body, but the inline copy is what `parseTranche` exposes.
 */
function extractRationales(md: string): Map<string, string> {
  const out = new Map<string, string>()
  const lines = md.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const m = (lines[i] ?? '').match(/^###\s+Task\s+(\S+)\s+—/)
    if (!m?.[1]) {
      i++
      continue
    }
    const id = m[1]
    const start = i
    i++
    while (i < lines.length && !/^#{1,3}\s/.test(lines[i] ?? '')) i++
    out.set(id, lines.slice(start, i).join('\n').trimEnd())
  }
  return out
}

function parseBacklog(md: string): string[] {
  const lines = md.split(/\r?\n/)
  let i = 0
  for (; i < lines.length; i++) {
    if (/^##\s+Backlog\b/i.test(lines[i] ?? '')) {
      i++
      break
    }
  }
  if (i >= lines.length) return []
  const bullets: string[] = []
  for (; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/^#{1,3}\s/.test(line)) break
    const m = line.match(/^\s*[-*+]\s+(.*)$/)
    if (m?.[1]) bullets.push(m[1].trim())
  }
  return bullets
}
