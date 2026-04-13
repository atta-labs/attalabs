---
name: herald-engine
description: Herald AI forensic match engine — Skeptical Auditor prompt rules, match API behavior, signal detection, caching, timeout, and fallback
triggers:
  - Editing apps/herald-ai/web/src/app/api/match/route.ts
  - Editing apps/herald-ai/web/src/lib/prompts.ts
  - Editing apps/herald-ai/web/src/lib/signals.ts
  - Any work on the Herald forensic audit feature
---

# Herald Engine — Forensic Match Audit

## Context

Herald's core feature is a forensic CV-to-JD match report powered by Claude Sonnet. It runs as a POST endpoint, fetches GitHub signals in parallel, calls the LLM with a strict auditor persona, parses the JSON response, and caches the result. The system is tuned for honesty and evidence — not marketing.

---

## RULE #1: Never Modify the Skeptical Auditor Prompt

`src/lib/prompts.ts` contains `SKEPTICAL_AUDITOR_PROMPT`. This prompt is verbatim from the BUILD-SPEC and is the product's core differentiator.

**Do NOT modify it without explicit user instruction.**

What it enforces:
- Zero marketing language in any output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with a mitigation
- Grades A/A-/B+/B only — no inflation

---

## Match API Flow (`POST /api/match`)

```
1. Validate input — JD must be string, ≥ 20 chars
2. Check env vars — ANTHROPIC_API_KEY required
3. Check in-memory cache — hash(JD + profile) → 24h TTL
4. Start signal fetch in parallel (non-blocking, 3s timeout)
5. Wait for signals (best-effort — returns [] on timeout)
6. Build prompt: profile + JD + signals
7. Call Claude Sonnet with 25s hard timeout
8. Parse JSON response — strip markdown fences, validate required fields
9. If parse fails → retry once (attempt 2)
10. If both attempts fail → return partial report (never throw)
11. Cache result and return
```

### Timeouts

| Operation | Timeout | On failure |
|-----------|---------|-----------|
| GitHub signal fetch | 3s | Proceed with empty signals |
| LLM generation | 25s | Return partial report |

**Never increase timeouts without understanding the user-facing impact.** The 3s signal timeout is intentional — signals are best-effort, not required.

### Caching

```ts
// Key: SHA-256 of (JD string + JSON.stringify(profile))
const cacheKey = getCacheKey(jd + JSON.stringify(profile))
// TTL: 24 hours, in-memory Map
```

Cache is in-memory — resets on server restart. This is intentional for v1. Do not add persistence without explicit instruction.

### Partial Report Fallback

When both LLM attempts fail, `buildPartialReport()` returns a valid `MatchReport` shape with:
- Grade: `B+`, Confidence: `Low`
- Empty signals and interview hooks
- A single gap entry explaining the timeout

This ensures the UI never crashes. **The shape must match `MatchReport` exactly.**

---

## Signal Detection (`src/lib/signals.ts`)

GitHub signals are raw facts — no LLM interpretation.

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
3. Commit messages (identity-filtered — author only)
4. PR titles and bodies (author only)

**Rules:**
- Identity-filtered — only commits/PRs by the candidate's GitHub handle
- No code leakage — file names and patterns only, no content
- No LLM inference — signals are structural facts, not interpretations
- Private repos are included if accessible via `GITHUB_PAT`
- `GITHUB_PAT` is optional — without it, only public repos are scanned

---

## LLM Configuration

```ts
model: anthropic('claude-sonnet-4-20250514')
system: SKEPTICAL_AUDITOR_PROMPT
maxOutputTokens: 2000
temperature: 0.3
```

**Do not change the model or temperature without explicit instruction.** Temperature 0.3 is intentional — lower variance in audit outputs.

---

## JSON Parsing

The LLM returns JSON. Two things can go wrong:
1. Response is wrapped in markdown fences (` ```json ... ``` `) — strip them before parsing
2. Required fields missing — validate `grade`, `recommendation`, `signal` exist

```ts
// Strip markdown fences
const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
const parsed = JSON.parse(cleaned)

// Validate required fields
if (!parsed.grade || !parsed.recommendation || !parsed.signal) return null
```

If parsing fails, return `null` and the caller retries once. After 2 failures, use partial report.

---

## MatchReport Shape

```ts
interface MatchReport {
  candidate: { name: string; title: string; github?: string }
  grade: 'A' | 'A-' | 'B+' | 'B'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: Array<{
    title: string
    observation: string
    interpretation: string
    confidence: string
  }>
  gaps: Array<{ gap: string; mitigation: string }>
  interview_hooks: string[]
}
```

**This shape is the contract between the match API and the Envoy UI.** Never add or remove top-level fields without updating both sides.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude Sonnet calls |
| `GITHUB_PAT` | No | GitHub signal detection (public + private repos) |

---

## Anti-patterns

- ❌ Modifying `SKEPTICAL_AUDITOR_PROMPT` without instruction
- ❌ Removing the 3s signal timeout — signals must not block the LLM
- ❌ Removing the 25s LLM timeout — prevents spinner-of-death
- ❌ Removing the partial report fallback — UI must never crash
- ❌ Adding signals from non-author commits — identity filtering is required
- ❌ Persisting the cache to disk/DB without explicit instruction
- ❌ Changing `temperature` or `maxOutputTokens` without instruction
- ❌ Returning a different JSON shape than `MatchReport` from the API
