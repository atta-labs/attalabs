---
name: herald-engine
description: Herald AI forensic match engine — Skeptical Auditor YAML rules, audit API behavior, GitHub signal tool, caching, timeout, and fallback
---

# Herald Engine — Forensic Match Audit

## Context

Herald's core feature is a forensic CV-to-JD match report powered by Claude Sonnet. The audit call chain runs through `@atta/forensic-hiring-auditor` — a standalone agent package that wraps `@atta/engine` + `@atta/adapter-langgraph` — not a bespoke direct-SDK call in Herald's own code (D-044, D-045, D-051). Herald's route handles auth, credential resolution, caching, and the retry/timeout wrapper; the package owns the auditor's prompt/model config, the GitHub signal tool, and the JSON parse/NO-FIT gate. The system is tuned for honesty and evidence — not marketing.

---

## RULE #1: Never Modify the Auditor YAML Without Explicit Instruction

`packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml` is the single source of truth for the Skeptical Auditor's `system_prompt`, `model`, `max_tokens`, and its `fetch_github_signals` custom tool. It is the successor to the old `SKEPTICAL_AUDITOR_PROMPT` TypeScript constant (deleted in D-045) — the prompt now lives here, declaratively, not in Herald's app code.

**Do NOT modify it without explicit user instruction.**

What it enforces:
- Zero marketing language in any output
- Every claim must reference a detectable signal, tiered High/Medium/Low by verifiability
- Requirements are classified HARD (gating) or SOFT before scoring
- Gaps are honest and specific, soft gaps always paired with an evidence-backed mitigation
- Grades: `A`, `A-`, `B+`, `B`, `STRETCH` (potential, not readiness), or `NO FIT` — the model may propose `NO FIT`, but the real gate is enforced in code (see NO-FIT gate below), not left to the model

---

## Audit API Flow (`POST /api/audit`)

One endpoint, two payload shapes (D-045), still true today:

```
1. Dispatch on payload — `candidates` array present → batch shape; absent → single shape
2. Single: resolve profile (DB by `username`, `_test_profile_override`, or DANI_PROFILE default)
   and resolve credentials (BYOK per-user vendor key, or ANTHROPIC_API_KEY env fallback
   for the test/default paths)
3. Batch: requires Clerk auth; resolves the logged-in user's BYOK key; fans out up to
   10 candidates via Promise.all, each through the same single-pair cell
4. Check in-memory cache — hash(JD + profile + vendor + modelId) → 24h TTL
5. Call `run()` from `@atta/forensic-hiring-auditor` — internally loads the YAML,
   compiles it to a Plan, and executes it via `LangGraphAdapter`, with
   `fetch_github_signals` wired in as a custom tool the model may call
6. Per attempt: race the call against a 90s timeout; up to 2 attempts
7. `run()` returns a parsed `MatchReport` or `null` (parse failure or engine FAILED state)
8. If both attempts fail → return a partial report (never throw)
9. Cache real (non-partial) results and return
```

The GitHub signal fetch is no longer a deterministic pre-fetch that races the LLM call in parallel — it is a tool the auditor agent decides to invoke mid-run, at most once, only when the profile carries a `github_handle`.

### Timeouts

| Operation | Timeout | On failure |
|-----------|---------|-----------|
| `fetch_github_signals` tool call | 3s (`GITHUB_SIGNAL_TIMEOUT_MS`) | Tool returns `[]`; model proceeds without GitHub evidence |
| LLM generation (per attempt, 2 attempts) | 90s (`AUDIT_LLM_TIMEOUT_MS`) | Retry once, then partial report |

**Never increase timeouts without understanding the user-facing impact.** The 3s signal-tool timeout is unchanged since the original deterministic pre-fetch — signals are still best-effort, not required. The LLM timeout has moved twice as the auditor grew: 25s → 45s (when a tool-call turn made the audit a 2-turn dialogue) → 90s (when `max_tokens` rose 2000 → 8000). Any reference to 25s is stale.

### Caching

```ts
// Key: SHA-256 of (JD + JSON.stringify(profile) + vendor + modelId)
const cacheKey = getCacheKey(jd + JSON.stringify(profile) + creds.vendor + creds.modelId)
// TTL: 24 hours, in-memory Map
```

Vendor and model are part of the key so the same JD/profile pair re-audited under a different BYOK selection doesn't serve a stale cross-vendor result. Cache is in-memory — resets on server restart. This is intentional. Do not add persistence without explicit instruction. Only real (non-partial) reports are cached; partial fallbacks are recomputed on every retry.

### Partial Report Fallback

When both LLM attempts fail, `buildPartialReport()` returns a valid `MatchReport` shape with:
- `hard_requirements: []`, Grade: `B+`, Confidence: `Low`
- Empty signals and interview hooks
- A single gap (`severity: 'minor'`) explaining the incomplete analysis

This ensures the UI never crashes. **The shape must match `MatchReport` exactly.**

---

## Input Resolution (`POST /api/audit/resolve-input`)

Separate endpoint from the audit call — resolves a polymorphic CV or JD input (pasted text, URL, Herald profile username, or an uploaded file) into a plain `{ text, ... }` shape the audit call consumes. Two payload shapes, dispatched on `content-type`:

- `application/json` — `{ role: 'cv' | 'jd', input }`, handled by `handleJson`, which delegates to `resolveCvInput`/`resolveJdInput` (`src/lib/audit-input/resolve.ts`).
- `multipart/form-data` — a `file` + `kind` (`'pdf' | 'markdown'`) + `role` (`'cv' | 'jd'`, defaults to `'cv'` for backward compatibility with pre-existing callers), handled inline by `handleFileUpload` in the route itself (not `resolve.ts` — file parsing has always lived separately). Both roles share one `unpdf`/`file.text()` extraction branch; only the returned shape (`ResolvedCv` vs `ResolvedJd`) branches on `role`.

CV file upload predates the JD file-upload path; JD's `.docx` support is out of scope (no parser exists in this repo).

---

## GitHub Signal Tool (`packages/agents/forensic-hiring-auditor/src/tools/github-signals.ts`)

GitHub signals are raw facts — no LLM interpretation happens in the tool itself.

```ts
type RawSignal = {
  type: 'architecture' | 'data' | 'infra' | 'ai' | 'unknown'
  evidence: string          // Human-readable fact: "Turborepo monorepo configuration"
  source: { repo: string; file?: string; isPrivate: boolean }
  confidence: 'high' | 'medium' | 'low'
}
```

Signals are detected by:
1. Structural file patterns (`turbo.json`, `drizzle.config.ts`, etc.)
2. Dependency patterns in `package.json` (`@ai-sdk`, `drizzle-orm`, etc.)
3. Commit messages, filtered to the candidate's `author` (identity-filtered)
4. PR titles, filtered to `author:<handle>` via GitHub search (identity-filtered)

**Rules:**
- Identity-filtered — only commits/PRs by the candidate's GitHub handle
- No code leakage — file names and patterns only, no content
- No LLM inference — signals are structural facts, not interpretations
- Private repos are included if accessible via `GITHUB_PAT`
- `GITHUB_PAT` is optional — the `fetch_github_signals` tool returns `[]` without it (and without a `github_handle`), and the auditor is instructed to proceed on the profile alone
- Exposed to the auditor agent as `extractSignals` wrapped in `fetchGithubSignalsForHandle` — declared as a custom tool in the YAML, invoked by the model at most once per audit, not called deterministically by Herald's route

---

## LLM Configuration

Declarative, in `packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml`:

```yaml
defaults:
  model: claude-sonnet-4-6
  max_tokens: 8000
agents:
  - name: SkepticalAuditor
    classifier:
      mode: skip          # no Haiku classifier overhead for a single-shot audit
    custom_tools:
      - name: fetch_github_signals
        ...
```

Herald's route does not call the model directly. It calls `run()` from `@atta/forensic-hiring-auditor`, which does `loadFlow(yaml) → compileFlow → LangGraphAdapter.execute`. The actual vendor/model dispatched is whatever `creds.vendor`/`creds.modelId` the route resolves (BYOK per-user selection, or the YAML's `claude-sonnet-4-6` default via `envFallbackCreds`) — the YAML's `defaults.model` is the fallback, not a hardcoded call-site value. There is no `temperature` override in the YAML; it runs at the engine's default.

**Do not change the model, `max_tokens`, or the custom tool wiring without explicit instruction.**

---

## JSON Parsing (`packages/agents/forensic-hiring-auditor/src/parse.ts`)

`parseMatchReport()` handles model output that isn't clean JSON:
1. Strip markdown fences (` ```json ... ``` `)
2. Try `JSON.parse` on the cleaned text
3. If that throws, fall back to scanning for the first balanced `{...}` object in the text (tolerates leading/trailing prose) and parse that
4. Validate required fields (`grade`, `recommendation`, `signal`, `hard_requirements` array) exist on the parsed object
5. **Code-enforced NO-FIT gate:** if any `hard_requirements` entry has `kind: 'hard'` and `met: false`, the grade is forced to `'NO FIT'` and the recommendation to `'No Fit'` regardless of what the model returned — this cannot be overridden by the model
6. On any failure path, calls `onParseFailure({ reason, head, tail })` for diagnostics and returns `null`

If parsing returns `null`, the route's retry loop tries again (up to 2 attempts total). After both attempts fail, use the partial report.

---

## MatchReport Shape (`packages/agents/forensic-hiring-auditor/src/schema.ts`)

```ts
type MatchReport = {
  candidate: { name: string; title: string; github?: string }
  hard_requirements: Array<{
    requirement: string
    kind: 'hard' | 'soft'
    met: boolean
    evidence: string
  }>
  grade: 'A' | 'A-' | 'B+' | 'B' | 'STRETCH' | 'NO FIT'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: Array<{
    title: string
    observation: string
    interpretation: string
    confidence: string
  }>
  gaps: Array<{ gap: string; severity: 'disqualifying' | 'minor'; mitigation: string | null }>
  interview_hooks: string[]
}
```

**This shape is the contract between the audit API and the Envoy/Bulk Audit UI.** Never add or remove top-level fields without updating both sides. Note the two additions beyond the pre-migration shape: `hard_requirements` (the code-enforced NO-FIT gate's input) and `gaps[].severity` (`disqualifying` | `minor`, with `mitigation` nullable for disqualifying gaps).

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Fallback only | Used when no BYOK key applies — the anonymous/default profile audit and `_test_profile_override` paths. Real per-user audits resolve a BYOK vendor key instead (`resolveAuditCredentials`); batch requires the logged-in user to have one configured. |
| `GITHUB_PAT` | No | GitHub signal tool (public + private repos) |

---

## Anti-patterns

- ❌ Modifying `packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml` without instruction
- ❌ Removing the 3s `fetch_github_signals` tool timeout — signals must not block the audit indefinitely
- ❌ Removing or shrinking the 90s LLM timeout without understanding why it grew (tool-call turn, then higher `max_tokens`) — prevents spinner-of-death
- ❌ Removing the partial report fallback — UI must never crash
- ❌ Adding signals from non-author commits — identity filtering is required
- ❌ Persisting the cache to disk/DB without explicit instruction
- ❌ Changing the YAML's `model` or `max_tokens` without instruction
- ❌ Returning a different JSON shape than `MatchReport` from the API
- ❌ Weakening or bypassing the code-enforced NO-FIT gate in `parse.ts` — it must never become model-controlled
- ❌ Calling `loadFlow`/`compileFlow`/`LangGraphAdapter` directly from Herald's route — that belongs inside `@atta/forensic-hiring-auditor`; Herald consumes `run()`
