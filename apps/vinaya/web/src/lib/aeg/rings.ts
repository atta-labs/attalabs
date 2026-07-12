import 'server-only'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { extractRealPathLinks, type SourceLink } from './extract-paths'
import { findHeadingLine, findTable, type ParsedTable } from '@atta/aeg-core'
import { findAegRoot, githubBlobUrl, toRepoRelative } from './repo'
import { findMatches, parseWorkflowJobs, type WorkflowMatch } from './workflow-jobs'

const ENFORCEMENT_FILE = 'enforcement.md'

export type RingRow = {
  cells: string[]
  line: number
  href: string
  /** Real repo paths pulled out of this row's own quoted backtick spans. */
  textLinks: SourceLink[]
  /** Real CI job/step matches (ring 1/2) or real hook files (ring 0). */
  mechanismLinks: (SourceLink | WorkflowMatch)[]
}

export type Ring = {
  id: 'ring-0' | 'ring-1' | 'ring-2'
  label: string
  where: string
  whatHappensOnViolation: string
  whoPays: string
  detailHeaders: string[]
  rows: RingRow[]
}

const RING0_MANUAL_LINKS: Array<{ match: string; paths: string[] }> = [
  { match: 'Editing a governed file', paths: ['.claude/hooks/check-skill.sh'] },
  { match: '`git commit`', paths: ['.husky/pre-commit'] },
  { match: '`git push`', paths: ['.husky/pre-push'] },
  { match: 'Creating a pull request', paths: ['.claude/hooks/check-forge-gates.sh'] },
  { match: 'Creating a task Issue', paths: ['.claude/hooks/check-forge-gates.sh'] },
  { match: 'Writing to pull requests or Issues through the raw API', paths: ['.claude/hooks/check-forge-gates.sh'] },
  { match: 'Merging', paths: ['.claude/hooks/check-pr-green.sh'] },
  { match: 'Starting the Dig', paths: ['.husky/pre-push'] }
]

const RING1_KEYWORDS: Array<{ match: string; keywords: string[] }> = [
  { match: 'Brief validation', keywords: ['Brief Validation'] },
  { match: 'Closes linkage', keywords: ['Closes #N'] },
  { match: 'Single-plan-PR guard', keywords: ['Single-plan-PR guard'] },
  { match: 'Coherence oracle', keywords: ['coherence oracle'] },
  { match: 'Documentation gate', keywords: ['documentation gate'] },
  { match: 'Test-plan state', keywords: ['Test Plan checkbox'] },
  { match: 'Typecheck + unit tests', keywords: ['Typecheck + unit tests'] },
  { match: 'Conventions', keywords: ['Biome lint/format', 'Commit-message format', 'Forbidden colors'] },
  { match: 'AI review', keywords: ['Claude Code Review'] },
  { match: 'Review gate', keywords: ['Review gate'] }
]

const RING2_KEYWORDS: Array<{ match: string; keywords: string[] }> = [
  { match: 'Post-merge archivist', keywords: ['Post-Merge Archivist'] },
  { match: 'Daily drift check', keywords: ['Daily Drift Check'] },
  { match: 'Direct-main-push detection', keywords: ['Direct-Main-Push Detection'] },
  { match: 'Dead-branch-push audit', keywords: ['dead-branch-audit'] }
  // 'Coherence oracle, full sweep', 'Docs coherence gate (C6)' and 'Staleness
  // audits' are intentionally absent — none currently has a real job in
  // archivist.yml (verified by their own quoted text: "not yet CI-wired" /
  // "Dispatched periodically" / reuses the ring-1 gate-suite job instead).
  // Absence here means zero matches, rendered honestly as "no CI job found",
  // not a fabricated link.
]

function manualLinksFor(rowFirstCell: string, table: Array<{ match: string; paths: string[] }>): SourceLink[] {
  const repoRoot = path.dirname(findAegRoot())
  const links: SourceLink[] = []
  for (const entry of table) {
    if (!rowFirstCell.includes(entry.match)) continue
    for (const relPath of entry.paths) {
      const absPath = path.join(repoRoot, relPath)
      if (!existsSync(absPath)) continue
      if (links.some((l) => l.path === relPath)) continue
      links.push({ path: relPath, href: githubBlobUrl(relPath) })
    }
  }
  return links
}

function workflowMatchesFor(
  rowFirstCell: string,
  table: Array<{ match: string; keywords: string[] }>,
  workflows: Awaited<ReturnType<typeof parseWorkflowJobs>>[]
): WorkflowMatch[] {
  const matches: WorkflowMatch[] = []
  const seen = new Set<string>()
  for (const entry of table) {
    if (!rowFirstCell.includes(entry.match)) continue
    for (const keyword of entry.keywords) {
      for (const m of findMatches(workflows, keyword)) {
        const key = `${m.workflowRelPath}:${m.jobId}:${m.stepName ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
        matches.push(m)
      }
    }
  }
  return matches
}

async function buildRows(
  table: ParsedTable,
  file: string,
  opts:
    | { kind: 'ring0' }
    | { kind: 'ring1'; workflows: Awaited<ReturnType<typeof parseWorkflowJobs>>[] }
    | { kind: 'ring2'; workflows: Awaited<ReturnType<typeof parseWorkflowJobs>>[] }
): Promise<RingRow[]> {
  return table.rows.map((row) => {
    const combinedText = row.cells.join(' ')
    const textLinks = extractRealPathLinks(combinedText)
    const firstCell = row.cells[0] ?? ''

    let mechanismLinks: (SourceLink | WorkflowMatch)[] = []
    if (opts.kind === 'ring0') {
      mechanismLinks = manualLinksFor(firstCell, RING0_MANUAL_LINKS)
    } else if (opts.kind === 'ring1') {
      mechanismLinks = workflowMatchesFor(firstCell, RING1_KEYWORDS, opts.workflows)
    } else {
      mechanismLinks = workflowMatchesFor(firstCell, RING2_KEYWORDS, opts.workflows)
    }

    return {
      cells: row.cells,
      line: row.line,
      href: githubBlobUrl(file, row.line),
      textLinks,
      mechanismLinks
    }
  })
}

/**
 * Reads `aeg-root/enforcement.md`'s own three tables (the Ring/Where/What/Who
 * summary, and each ring's own detail table) plus the real workflow files —
 * never hand-transcribed. `Ring 0` items get their real `.husky/*` hook (or
 * `.claude/hooks/*.sh` equivalent) + the bin scripts the row's own text names;
 * `Ring 1`/`Ring 2` items get real CI job/step names, matched by keyword
 * against a fresh parse of the workflow YAML.
 */
export async function loadRings(): Promise<Ring[]> {
  const aegRoot = findAegRoot()
  const enforcementPath = path.join(aegRoot, ENFORCEMENT_FILE)
  const enforcementRelPath = toRepoRelative(enforcementPath)
  const raw = await fs.readFile(enforcementPath, 'utf8')
  const lines = raw.split('\n')

  const summaryHeadingLine = findHeadingLine(lines, /^##\s*The model:/)
  if (!summaryHeadingLine) throw new Error('enforcement.md: could not find "## The model:" heading')
  const summaryTable = findTable(lines, summaryHeadingLine, false)
  if (summaryTable?.rows.length !== 3) {
    throw new Error('enforcement.md: summary table does not have exactly 3 rows (Ring 0/1/2) — table shape changed')
  }

  const ring0HeadingLine = findHeadingLine(lines, /^##\s*Ring 0/)
  const ring1HeadingLine = findHeadingLine(lines, /^##\s*Ring 1/)
  const ring2HeadingLine = findHeadingLine(lines, /^##\s*Ring 2/)
  if (!ring0HeadingLine || !ring1HeadingLine || !ring2HeadingLine) {
    throw new Error('enforcement.md: could not find all three Ring headings — table structure changed')
  }

  const ring0Table = findTable(lines, ring0HeadingLine)
  const ring1Table = findTable(lines, ring1HeadingLine)
  const ring2Table = findTable(lines, ring2HeadingLine)
  if (!ring0Table || !ring1Table || !ring2Table) {
    throw new Error('enforcement.md: one or more Ring detail tables could not be parsed')
  }

  const [forgeLifecycle, ci, claudeReview, archivist] = await Promise.all([
    parseWorkflowJobs('.github/workflows/forge-lifecycle.yml'),
    parseWorkflowJobs('.github/workflows/ci.yml'),
    parseWorkflowJobs('.github/workflows/claude-code-review.yml'),
    parseWorkflowJobs('.github/workflows/archivist.yml')
  ])

  const [ring0Rows, ring1Rows, ring2Rows] = await Promise.all([
    buildRows(ring0Table, enforcementRelPath, { kind: 'ring0' }),
    buildRows(ring1Table, enforcementRelPath, { kind: 'ring1', workflows: [forgeLifecycle, ci, claudeReview] }),
    buildRows(ring2Table, enforcementRelPath, { kind: 'ring2', workflows: [archivist] })
  ])

  const summaryByLabel = summaryTable.rows.map((row) => ({
    label: row.cells[0]?.replace(/\*\*/g, '').trim() ?? '',
    where: row.cells[1] ?? '',
    whatHappensOnViolation: row.cells[2] ?? '',
    whoPays: row.cells[3] ?? ''
  }))

  const find0 = summaryByLabel.find((s) => s.label.startsWith('0'))
  const find1 = summaryByLabel.find((s) => s.label.startsWith('1'))
  const find2 = summaryByLabel.find((s) => s.label.startsWith('2'))
  if (!find0 || !find1 || !find2) {
    throw new Error('enforcement.md: summary table rows are not labeled 0/1/2 as expected')
  }

  return [
    {
      id: 'ring-0',
      label: find0.label,
      where: find0.where,
      whatHappensOnViolation: find0.whatHappensOnViolation,
      whoPays: find0.whoPays,
      detailHeaders: ring0Table.headers,
      rows: ring0Rows
    },
    {
      id: 'ring-1',
      label: find1.label,
      where: find1.where,
      whatHappensOnViolation: find1.whatHappensOnViolation,
      whoPays: find1.whoPays,
      detailHeaders: ring1Table.headers,
      rows: ring1Rows
    },
    {
      id: 'ring-2',
      label: find2.label,
      where: find2.where,
      whatHappensOnViolation: find2.whatHappensOnViolation,
      whoPays: find2.whoPays,
      detailHeaders: ring2Table.headers,
      rows: ring2Rows
    }
  ]
}
