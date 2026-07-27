/**
 * Finding-count baseline capture + comparison (aeg-governance-hardening task
 * 11, #324). Pure — does not run `verify-docs.ts`/`verify-coherence.ts`
 * itself and never calls `Date.now()` (a pure `src/` module cannot — see
 * `packages/aeg-core/CLAUDE.md`-equivalent constraint, this repo's is the
 * Workflow-script rule of the same shape). The CLI shim runs those tools,
 * counts their findings, and passes the counts plus a caller-supplied
 * timestamp in here.
 *
 * Exists to make the dispatch-readiness bar honestly "no new findings versus
 * the captured baseline" rather than "zero findings" — live-fire #2
 * (aeg-governance-hardening's own dispatch wave) asserted "verify-docs full
 * mode must be green" as a pre-flight precondition without ever running it;
 * full mode had 44 pre-existing, unrelated findings and was never green.
 * Baseline data is capture-at-run only, never a committed file.
 */

export type BaselineEntry = {
  tool: string
  findingCount: number
  /** ISO timestamp supplied by the caller — never generated inside this module. */
  capturedAt: string
}

/** Stamps a set of tool→findingCount pairs into baseline records, using the caller-supplied `capturedAt`. */
export function captureBaseline(
  counts: Array<{ tool: string; findingCount: number }>,
  capturedAt: string
): BaselineEntry[] {
  return counts.map((c) => ({ tool: c.tool, findingCount: c.findingCount, capturedAt }))
}

export type BaselineToolComparison = { tool: string; baseline: number; current: number; delta: number }

export type BaselineComparison = {
  /** True iff no tool's current finding count exceeds its baseline. */
  withinBudget: boolean
  /** Sum of every tool's delta (positive = net new findings across all tools). */
  delta: number
  perTool: BaselineToolComparison[]
}

/**
 * Compare current finding counts against a captured baseline, per tool.
 * A tool absent from the baseline (never captured before) has nothing to
 * regress against — its delta reports as `0` and its current count becomes
 * the effective baseline going forward, rather than failing budget purely
 * because no prior baseline was ever recorded for it.
 */
export function compareToBaseline(
  current: Array<{ tool: string; findingCount: number }>,
  baseline: BaselineEntry[]
): BaselineComparison {
  const perTool: BaselineToolComparison[] = current.map((c) => {
    const baselineEntry = baseline.find((b) => b.tool === c.tool)
    const baselineCount = baselineEntry ? baselineEntry.findingCount : c.findingCount
    return { tool: c.tool, baseline: baselineCount, current: c.findingCount, delta: c.findingCount - baselineCount }
  })

  return {
    withinBudget: perTool.every((t) => t.delta <= 0),
    delta: perTool.reduce((sum, t) => sum + t.delta, 0),
    perTool
  }
}
