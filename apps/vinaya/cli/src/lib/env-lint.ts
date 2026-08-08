import { existsSync, readFileSync } from 'node:fs'
import type { CheckSpec } from '../checks/contract.js'

/** A check bin reading env directly — the warn heuristic's positive signal. */
const ENV_READ_PATTERN = /\b(?:process\.env|Bun\.env|Deno\.env)\b/

/**
 * Names of every spec in `specs` whose executable's source greps positive
 * for `process.env.`/`Bun.env.`/`Deno.env.` and carries no `env`
 * declaration — the "will lose environment access at the next minor"
 * candidates. Shared by `vinaya check`'s warn-phase-only output and `vinaya
 * doctor`'s permanent diagnostic, so the heuristic can't drift between the
 * two callers.
 *
 * Best-effort by construction: an unreadable `run` path (a bundled/compiled
 * binary, a non-JS custom check, a path that doesn't exist yet) is silently
 * skipped rather than treated as a false positive — this is a grep
 * heuristic over source text, not a static analyzer.
 */
export function checksMissingEnvDeclaration(specs: CheckSpec[]): string[] {
  const names: string[] = []
  for (const spec of specs) {
    if (spec.env) continue
    if (!existsSync(spec.run)) continue
    let source: string
    try {
      source = readFileSync(spec.run, 'utf8')
    } catch {
      continue
    }
    if (ENV_READ_PATTERN.test(source)) names.push(spec.name)
  }
  return names
}

/** The single canonical wording for the env-loss warning — one string, both callers. */
export function envDeclarationWarning(name: string): string {
  return `check "${name}" reads environment variables directly but declares no \`env\` — it will lose environment access at the next minor. Declare \`env\` for it (CheckSpec['env'] in src/checks/contract.ts, or vinaya.config.json's checks.<name>.env).`
}
