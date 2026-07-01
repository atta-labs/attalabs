/**
 * Decision-log shape and numbering checks (C1/C2/F1/F2/N1/N2). Pure — takes file
 * content as a string, returns findings. No filesystem, no git.
 */

export function hasStatusBlock(content: string): boolean {
  return /(^|\n)\s*(\*\*)?Status:?(\*\*)?\s*:?\s*(draft|target|ratified|retired)/i.test(content)
}

/** Each `## D-NNN` heading must have a Status and Type field in its block. */
export function malformedDecisionEntries(content: string): string[] {
  const bad: string[] = []
  const blocks = content.split(/\n(?=## )/)
  for (const block of blocks) {
    const m = block.match(/^##\s+(D-\d+|CONTRADICTION)\b.*/m)
    const heading = m?.[1]
    if (!heading) continue
    if (heading.startsWith('CONTRADICTION')) continue
    const hasStatus = /(^|\n)\*\*Status:\*\*/.test(block)
    const hasType = /(^|\n)\*\*Type:\*\*/.test(block)
    if (!hasStatus || !hasType) {
      bad.push(heading)
    }
  }
  return bad
}

/**
 * Extract and validate D-NNN numbers within a single decision log.
 * N1 (hard-fail): duplicate numbers within the log.
 * N2 (advisory): skipped numbers (gaps expected cross-log per state-machine §6).
 */
export function checkDecisionNumbers(
  content: string,
  logPath: string
): { n1Errors: string[]; n2Notes: string[]; numbers: number[] } {
  const raw: number[] = []
  for (const m of content.matchAll(/^## D-(\d+)\b/gm)) {
    raw.push(Number(m[1]))
  }

  const n1Errors: string[] = []
  const n2Notes: string[] = []

  const seen = new Map<number, number>()
  for (const n of raw) seen.set(n, (seen.get(n) ?? 0) + 1)
  for (const [n, count] of seen) {
    if (count > 1) {
      n1Errors.push(
        `N1 decision-duplicate: ${logPath} — D-${String(n).padStart(3, '0')} appears ${count} times. Numbers must be unique within a log.`
      )
    }
  }

  const sorted = [...new Set(raw)].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1] as number
    const curr = sorted[i] as number
    if (curr > prev + 1) {
      const skipped = Array.from(
        { length: curr - prev - 1 },
        (_, k) => `D-${String(prev + 1 + k).padStart(3, '0')}`
      ).join(', ')
      n2Notes.push(
        `N2 decision-skip: ${logPath} — gap after D-${String(prev).padStart(3, '0')}: ${skipped}. (Cross-log gaps are expected — state-machine §6.)`
      )
    }
  }

  return { n1Errors, n2Notes, numbers: sorted }
}
