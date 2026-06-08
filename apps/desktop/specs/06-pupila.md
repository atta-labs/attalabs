# 06 — Pupila

**Status:** draft
> Repo: `github.com/FranRom/pupila` (MIT). **Fran is Dani's friend.** Direction (core vs adjacent, co-build vs integrate) is a conversation with Fran, not a unilateral technical decision — recorded as such. Dani's standing note: prefers **one project**, will talk to Fran.

## What Pupila is
A **local-first job aggregator with a scoring engine.** Pulls ~13 sources (Ashby/Greenhouse/Lever ATSes, RemoteOK, HN hiring, web3.career, etc.), filters noise, scores each role 0–100 against a CV-derived profile using config-driven weighted keyword rules (with a `_signals` auditability breakdown), and writes `JOBS.md` + `data/jobs.json` with a day-over-day diff. Optional AI layers (per-job verdict, "Jinder" swipe deck, "AI Apply" cover letters) run on the user's **local `claude`/`codex` CLI** — no API keys, no cloud. Ships a 17-tool MCP server (factory + register-per-tool + Zod + `safeHandler`), a local launchd/cron scheduler, and a Vite UI.

## Herald ↔ Pupila — mirror images, one funnel
| | **Pupila** | **Herald** |
|---|---|---|
| Direction | **Inbound discovery** (find roles that fit) | **Outbound evaluation** (audit one match) |
| Engine | Keyword-weighted scoring over many jobs | LLM forensic audit with hard/soft gating |
| Runs | Candidate, locally | Recruiter (or candidate), hosted |
| LLM | User's local CLI (free) | BYOK Anthropic (hosted) |
| Volume | High (score hundreds) | Low (deep audit of one) |

Pupila is the **top of the funnel**, Herald the **bottom**. Both independently concluded scoring must be **auditable** (Pupila's `_signals` ↔ Herald's hard-requirement checklist). They are complementary, not competitive.

## Why hosting Pupila breaks it (and why desktop doesn't)
Two properties of Pupila are *derived from being local*, not cosmetic:
1. **Free LLM** — it shells out to the user's CLI subscription. Hosted, there is no user CLI on the server → you'd need paid API or BYOK, converting "free" into "someone pays per token," across hundreds of jobs.
2. **Scraping from the user's IP** — hosted, you scrape ~13 boards from one datacenter IP for every user, hitting rate limits / Cloudflare → needs proxies + a shared scrape-cache + a queue. (Not impossible — *scrape once into a shared cache* makes it tractable — but it is real infra.)

**In a desktop client, both evaporate:** the desktop *is* a local machine. The CLI is present (transport #3); scraping runs from the user's IP via the Node sidecar (server-side fetch → no CORS). **Fran's code embeds essentially unchanged.** This is the cleanest possible integration and a top reason for the desktop.

## Code portability (if integrated)
- **Lifts cleanly (~65%):** `fetchers/*` (HTTP), `filters.ts` (pure scoring + `_signals`), `normalize.ts`, `dedup.ts`, `salary.ts`, `types.ts`, `ai-review-parse.ts` (tolerant parser — also the reference for the CLI transport's prompt-and-parse).
- **Adapts (~20%):** the orchestrator's I/O sinks (flat files → cache/DB), the MCP read tools.
- **Discarded (~15%):** local CLI shell-out wiring (replaced by transport #3), launchd/cron, the Vite UI, the apply-worker.
- **Tooling seam:** Pupila is **pnpm + standalone ESM**; AttaLabs is **Bun + Turborepo**. Adopting workspace tooling is real but minor; Pupila's ~290 tests port too, de-risking.

## Integration paths (decide WITH Fran)
- **A — Fork:** copy the engine into the desktop; Pupila untouched; AttaLabs carries a diverging copy (fetchers rot as boards change). Lowest cost now, highest maintenance.
- **B — Shared `@atta/job-engine`:** both consume one package; no divergence; **requires changing Pupila** (replace its `src/` with imports) and Fran co-developing. "Co-own the engine, two front-ends" (his local-first UI; the desktop surface).
- **C — Integrate at the seam:** keep both; Pupila discovery feeds Herald audit. Cheapest, softest coupling.

**MCP angle (orthogonal, strong):** a hosted Herald MCP exposing `aggregate_jobs` / `score_jobs` / `audit_match` lets users call discovery+audit from their **own** Claude.ai — the caller's model does the reasoning, AttaLabs returns pure-function tool results. Only a shared scrape-cache remains as infra. On-thesis (BYOK+MCP, like Vāda).

## The relationship dimension (recorded)
MIT permits a fork, but absorbing a friend's project without talking first is the kind of thing that quietly damages a friendship. The right move is a conversation about direction (co-build / sibling / integrate). The desktop framing makes this *honest*: it gives Pupila's local-first architecture a home that *fits* it, rather than stripping it to host it. Whether Pupila is a desktop-core product or an adjacent sibling is Fran's call as much as Dani's.
