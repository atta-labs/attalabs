import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { compileFlow, loadFlow } from '@atta/engine'
import type { Flow } from '@atta/engine'
import { type ParseMatchReportOptions, parseMatchReport } from './parse'
import { createGithubSignalToolHandler } from './tools/github-signals'
import type { RawSignal } from './tools/github-signals'
import type { CandidateInfo } from './parse'
import type { MatchReport } from './schema'

export type { MatchReport, HardRequirement } from './schema'
export { parseMatchReport } from './parse'
export type { CandidateInfo, ParseMatchReportOptions } from './parse'
export { extractSignals } from './tools/github-signals'
export type { RawSignal } from './tools/github-signals'

const YAML_PATH = join(dirname(fileURLToPath(import.meta.url)), '../yamls/herald-auditor.yaml')

let cachedYaml: string | null = null
function getYamlContent(): string {
  if (!cachedYaml) cachedYaml = readFileSync(YAML_PATH, 'utf-8')
  return cachedYaml
}

let cachedFlow: Flow | null = null
function getFlow(): Flow {
  if (!cachedFlow) cachedFlow = loadFlow(getYamlContent())
  return cachedFlow
}

export interface RunAuditInput {
  /** The formatted CANDIDATE PROFILE + JOB DESCRIPTION message — constructed by Herald */
  profile: string
  modelId: string
  vendor: string
  apiKey: string
  /** MATCH_REPORT_SCHEMA — Herald's domain knowledge, injected as {{schema}} template var */
  schema: string
  /** Candidate identity for the MatchReport.candidate field */
  candidateInfo: CandidateInfo
  /** Optional diagnostic callback on parse failure */
  onParseFailure?: ParseMatchReportOptions['onParseFailure']
}

/** Returned instead of a MatchReport when the audit execution itself failed
 *  (rate-limit, timeout, auth, or unknown) — distinguishable from the `null`
 *  a caller gets when the LLM responded but its output didn't parse. */
export interface RunAuditFailure {
  failed: true
  reason: string
}

export async function run(input: RunAuditInput): Promise<MatchReport | RunAuditFailure | null> {
  const flow = getFlow()
  const plan = compileFlow(flow, input.profile, input.modelId, { schema: input.schema })
  // Local to this call — batch mode runs 1-10 concurrent `run()` invocations,
  // and a shared/module-level capture would let them clobber each other.
  let capturedSignals: RawSignal[] = []
  const adapter = new LangGraphAdapter({
    providerKeys: { [input.vendor]: input.apiKey },
    customTools: {
      fetch_github_signals: createGithubSignalToolHandler((signals) => {
        capturedSignals = signals
      })
    }
  })
  const conclusion = await adapter.execute({ plan })
  if (conclusion.terminalState === 'FAILED') {
    return { failed: true, reason: conclusion.error ?? 'Audit execution failed for an unknown reason' }
  }
  const report = parseMatchReport(conclusion.content, input.candidateInfo, {
    onParseFailure: input.onParseFailure
  })
  return (
    report && {
      ...report,
      estimatedCostUsd: conclusion.estimatedCostUsd,
      ...(capturedSignals.length > 0 ? { githubSignals: capturedSignals } : {})
    }
  )
}
