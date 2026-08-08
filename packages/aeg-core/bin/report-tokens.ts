#!/usr/bin/env bun

/**
 * report-tokens — emits one `Tokens: …` line (`packages/aeg-core/src/parse-token-report.ts`'s
 * grammar) for the calling role's own turn, replacing the retracted `/cost`
 * claim in `aeg-root/tranche-model.md` §12 (misc-hardening-v1 task 1,
 * #675): `/cost` is a Claude Code slash command typed by an operator at the
 * interactive prompt — an unattended agent session has no way to invoke it
 * itself. This reads the session's own transcript instead
 * (`~/.claude/projects/<slug>/<session-id>.jsonl`), which the harness
 * writes as the session runs and hands to every hook as `transcript_path`.
 *
 * Thin I/O shim: resolves the transcript path, reads it, and calls the pure
 * `summarizeTranscript` / `formatTokensLine` / `formatBreakdown` homed in
 * `@atta/aeg-core`. Mirrors `bin/archive-task.ts`'s split (I/O here, pure
 * logic in `src/`).
 *
 * Transcript-path resolution never scans `~/.claude/projects/<slug>/` for
 * the newest file — that breaks the moment two worktrees run concurrent
 * sessions (whichever session wrote last wins, regardless of which one
 * asked). Instead it reads the pointer `.claude/hooks/track-transcript.sh`
 * writes on every Stop event, keyed by `CLAUDE_PROJECT_DIR` — the harness's
 * own per-worktree identity, already relied on by `check-skill.sh`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { formatBreakdown, formatTokensLine, summarizeTranscript } from '../src/report-tokens'

export function sanitizeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, '-')
}

export function transcriptPointerPath(projectDir: string, tmpDir: string): string {
  return `${tmpDir}/claude-transcript-${sanitizeKey(projectDir)}.txt`
}

export type ResolveDeps = {
  env: Record<string, string | undefined>
  cwd: string
  exists: (path: string) => boolean
  readFile: (path: string) => string
}

/**
 * Resolves the transcript path to read: an explicit CLI arg wins outright;
 * otherwise reads the Stop-hook's pointer file. Throws rather than falling
 * back to a `—` line — a Claude Code session missing its own pointer file
 * is a wiring bug, not a surface that "genuinely cannot self-report" (that
 * case is a claude.ai role, which never calls this bin at all).
 *
 * A worktree reused across sessions (e.g. a Developer re-entry after
 * `CHANGES_REQUESTED`, `aeg-root/roles/developer.md`) can hold a pointer
 * file written by a *previous* session that hasn't been overwritten yet —
 * the new session's own Stop hook only fires after its first turn
 * completes. Reading that stale pointer silently would reproduce, one
 * session later, the exact wrong-session-attribution failure this reporter
 * exists to prevent. `CLAUDE_CODE_SESSION_ID` (set in every Claude Code
 * Bash tool call — confirmed empirically, not documented in the public hook
 * schema, so treated as a best-effort cross-check, never the primary
 * resolution path) lets the resolver catch this: when it disagrees with the
 * pointer's own stored session id, that pointer is stale and the resolver
 * throws rather than emit plausible-looking wrong numbers. When it's unset,
 * there is nothing to cross-check against, so the pointer is trusted as
 * before.
 */
export function resolveTranscriptPath(explicit: string | undefined, deps: ResolveDeps): string {
  if (explicit) return explicit

  const projectDir = deps.env.CLAUDE_PROJECT_DIR ?? deps.cwd
  const tmpDir = deps.env.TMPDIR ?? '/tmp'
  const pointerPath = transcriptPointerPath(projectDir, tmpDir)

  if (!deps.exists(pointerPath)) {
    throw new Error(
      `No transcript pointer at ${pointerPath}. The Stop hook (.claude/hooks/track-transcript.sh) hasn't ` +
        'fired yet this session — it writes the pointer after your first turn completes. Pass the transcript ' +
        'path explicitly as the first argument if you need a report before then.'
    )
  }

  const contents = deps.readFile(pointerPath).trim()
  const [pointerSessionId, transcriptPath] = contents.split('\t')
  if (!transcriptPath) {
    throw new Error(`Transcript pointer file ${pointerPath} is malformed: "${contents}"`)
  }

  const currentSessionId = deps.env.CLAUDE_CODE_SESSION_ID
  if (currentSessionId && pointerSessionId && currentSessionId !== pointerSessionId) {
    throw new Error(
      `Transcript pointer at ${pointerPath} is stale: it was written for session ${pointerSessionId}, ` +
        `but this session is ${currentSessionId}. A previous session's Stop hook wrote this pointer, and this ` +
        "session's own Stop hook hasn't fired yet (it fires after your first turn completes). Pass the " +
        'transcript path explicitly as the first argument if you need a report before then.'
    )
  }

  return transcriptPath
}

export type ParsedArgs = {
  phase: string
  role: string
  model: string | undefined
  transcriptPath: string | undefined
}

export function parseArgs(argv: string[]): ParsedArgs {
  let phase: string | undefined
  let role: string | undefined
  let model: string | undefined
  let transcriptPath: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--phase') phase = argv[++i]
    else if (arg === '--role') role = argv[++i]
    else if (arg === '--model') model = argv[++i]
    else if (arg && !arg.startsWith('--')) transcriptPath = arg
  }

  if (!phase || !role) {
    throw new Error(
      'Usage: bun packages/aeg-core/bin/report-tokens.ts --phase "<task-id>: develop" --role Developer ' +
        '[--model <id>] [<transcript-path>]'
    )
  }

  return { phase, role, model, transcriptPath }
}

export function main(argv: string[], deps: ResolveDeps): void {
  const { phase, role, model, transcriptPath } = parseArgs(argv)
  const resolvedPath = resolveTranscriptPath(transcriptPath, deps)
  const jsonl = deps.readFile(resolvedPath)
  const summary = summarizeTranscript(jsonl)

  // A zero-message summary (empty file, unparseable content, or a transcript
  // not yet flushed to disk) is indistinguishable, once formatted, from a
  // real session that genuinely spent 0 tokens — `formatTokensLine` takes
  // its numeric branch either way. Fail loud here instead, the same
  // discipline `resolveTranscriptPath` already applies to a missing
  // pointer: an unusable transcript is a wiring problem to report, not a
  // plausible-looking `0/0/—` to paste into a PR body.
  if (summary.messageCount === 0) {
    throw new Error(
      `Transcript at ${resolvedPath} yielded zero assistant messages with usage data — it's empty, ` +
        'unparseable, or not yet flushed to disk. Nothing to report; re-run once the session has produced at ' +
        'least one turn.'
    )
  }

  console.error(`[report-tokens] transcript: ${resolvedPath}`)
  console.error(formatBreakdown(summary))
  console.log(formatTokensLine({ phase, role, summary, modelOverride: model }))
}

if (import.meta.main) {
  main(process.argv.slice(2), {
    env: process.env,
    cwd: process.cwd(),
    exists: existsSync,
    readFile: (path: string) => readFileSync(path, 'utf8')
  })
}
