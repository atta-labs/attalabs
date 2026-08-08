---
name: vada-architecture
description: Vāda's product structure (Vāda Teams catalog), wedges/capabilities/moats framework, current phase status, and locked architectural decisions. Load before any architectural decision, cross-cutting change, or when drafting executor tasks that span multiple layers.
---

# Vāda Architecture — Master Reference

## Context

Vāda is a YAML-driven multi-agent deliberation runtime, shipping as an MCP server and a web app at `vada.attalabs.dev`. Multiple LLM agents debate, are consulted, or are critically reviewed; an optional synthesizer reconciles their outputs; auditors verify the result; revision fires when audits flag the conclusion. Accessed from any MCP-compatible client (Claude.ai web, Claude Desktop, Claude Code CLI, Cursor).

**Where Vāda sits in the wider ecosystem** (v2 naming framing locked May 12, 2026 — see root `CLAUDE.md`'s naming bullets):

- **AttaLabs** is the dev/lab ecosystem at `attalabs.dev`. Vāda is one product inside it.
- **Atta-the-product** is a separate composed product (Vāda + Vitakka + Sati) targeting `atta.ai` when ready. Not yet deployed.
- Vāda has two permanent surfaces: standalone at `vada.attalabs.dev` (current) and as the deliberation layer inside Atta-the-product (future).

The product surface today is the catalog of YAML team specs at `packages/agents/vada-deliberation/yamls/`. The engine treats every YAML identically — there are no per-team code branches. As of the generic flow refactor (May 12-13, 2026), the YAML schema is `2.0` and all flows are expressed as a sequence of rounds.

**Scope note:** `packages/agents/` is a shared namespace, not exclusively Vāda's — it also hosts standalone, non-Vāda packages (e.g. `forensic-hiring-auditor`, Herald's forensic match-audit engine; see `.claude/skills/herald-engine/SKILL.md`). This skill documents only the Vāda deliberation catalog above; a change elsewhere under `packages/agents/` doesn't necessarily touch Vāda's architecture. (Confirmed: the additive `Conclusion.estimatedCostUsd` / `MatchReport.estimatedCostUsd` field is Herald/adapter-level, not a Vāda deliberation-catalog change. Same for #520: the additive `MatchReport.githubSignals` field and its per-invocation capture live entirely in `forensic-hiring-auditor`, Herald-only content.)

---

## Vāda Teams Catalog

Vāda exposes deliberation as a catalog of YAML team specs compiled by the Atta engine. Both MCP tools are generic — there are no per-team tools. The catalog currently contains 10 YAML team specs at `packages/agents/vada-deliberation/yamls/` (3 published, 7 experimental). New teams are added by authoring YAML and dropping the file into the directory — the engine's `listPublicSpecs()` discovers it dynamically.

`listPublicSpecs()` reads this directory from disk at runtime (`readdirSync`), so `apps/vada-ai/web/next.config.ts`'s `outputFileTracingIncludes` must separately declare the directory for Vercel's static tracer, which cannot detect a dynamically-joined path. Moving the catalog without updating that entry breaks every catalog-backed route in production only (green build, green local dev) — see `.claude/skills/vada-yaml-authoring/SKILL.md` for the full note.

| MCP Tool | Behavior | Cost | Serves |
|----------|----------|------|--------|
| `vada__deliberate` | Compiles a YAML spec and runs the full flow end-to-end. Returns synthesized output + structured field when the spec declares one. | Variable per spec | MOAT-A (audit trail) |
| `vada__consult` | Routes to a YAML spec via `spec_id`; constructs a Flow in-memory with role-selected reviewers; runs and returns reviewer responses. | Lower | Acquisition surface |

Both surfaces are live. `vada__consult` accepts an optional `reviewer_config: Record<agentName, modelId>` mirroring the web UI's per-slot model configurability, validated against the vendor registry.

| Catalog YAML | Display name | Shape (v2) | Status |
|---|---|---|---|
| `a0-baseline` | A0 | solo | Experimental (baseline) |
| `a1-baseline` | A1 | solo | Experimental (baseline, structured) |
| `brokered-trio` | Brokered Trio | brokered-no-synth | Experimental |
| `brokered-quartet` | Brokered Quartet | brokered-no-synth | Experimental |
| `vada-reviewers` | Reviewers | brokered-no-synth | **Published** |
| `vada-reviewers-synthesis` | Reviewers + Synthesis | brokered-synth | **Published** |
| `vada-fusion-native` | Outside Read | rounds-audit | **Published** (`vada__consult` spec_id) |
| `sparring` | Sparring | rounds-audit | Experimental (PR #31 unpublished) |
| `crucible` | Crucible | rounds-audit | Experimental (PR #31 unpublished) |
| `war-room` | War Room | rounds-audit | Experimental (PR #31 unpublished) |

---

## Layer Stack

```
USER CHAT CLIENT            (Claude.ai web, Claude Desktop, Claude Code CLI, Cursor — external)
        ↓ MCP protocol (stdio for local installs; hosted HTTP at vada.attalabs.dev/api/mcp)
@vada/mcp-server            WEDGE-2   → see skill: vada-mcp-server
        ↓ Plan request
@atta/engine                WEDGE-1   → see skill: atta-engine
  (YAML → loadFlow → compileFlow → Plan)
        ↓ Plan (JSON DAG)
@atta/adapter-langgraph     CAP-1     → see skill: atta-adapter-langgraph
  (includes cognitive router nodes; SDK-shape dispatch per the vendor registry)
        ↓ per-turn dispatch
YAML specs + agent visuals  MOAT-B    → see skill: vada-yaml-authoring
  (v2 deliberation YAML files in packages/agents/vada-deliberation/yamls/; agent UI types in web/src/components/agents/visuals/)
        ↓ agent config
PROVIDER APIs               (12 vendors registered in @atta/models: anthropic, openai, google, xai, groq,
                             openrouter, deepseek, cerebras, mistral, together, fireworks, ollama)

PARALLEL AUDIT: Neon Postgres → vada.attalabs.dev dashboard   MOAT-A (live)
```

---

## v2 schema — what changed

Prior to the v2 schema, the engine supported three structurally distinct YAML shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) each with its own compiler (`compileBrokered`, `compileRounds`, `compileSolo`) and its own discriminated workflow union type (`BrokeredWorkflow | RoundsWorkflow | SoloWorkflow`). The v2 schema collapsed all of this into one model:

- **Schema layer** is uniform: every flow is `{ schema_version, id, defaults, agents, rounds }`. A round has `id, name, layout, agents, message_template, repeats?, agent_failure?, on_failure?`. Validation enforces 10 structural and semantic rules; `validateFlow` throws `InvalidFlowConfigError` on any violation.
- **Compiler layer** has one entrypoint: `compileFlow(flow, question, model?, customVars?) → Plan`. It detects four shapes from the flow's topology (`solo`, `brokered-no-synth`, `brokered-synth`, `rounds-audit`) and emits matching Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`). The detection is a pragmatic compromise: the adapter and route handler depend on v1 node-id conventions, so `compileFlow` preserves them while the schema itself is fully generic.
- **Revision** is declarative on `on_failure`: an audit round can specify `{ action: revise, target: <prior-round-id>, max_revisions, signal: { type, value, case_sensitive? } }`. The engine emits the conditional edge structure (`terminal-k → audit-{first}-{k}` flow edge plus `audit-{last}-{k} → terminal-{k+1} | __END__` conditional edge with `anyOf` evaluation) automatically.
- **Template variables** in v2 YAMLs still use the v1 `TemplateState` shape (`outputsByRound`, `lastOutputByAgent`, `conclusion`, etc.) — the adapter was not refactored as part of that migration. See OQ-H in `vada-state.md`.
- **Workflow types deleted**: `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and the `Workflow` discriminated union are gone. The Plan graph types (`Plan`, `PlanNode`, `PlanEdge`, `PlanGraph`, `PlanNodeRole`, `PlanNodeKind`, `PlanEdgeKind`) survive — they describe the compiled output, not the input.

For the full schema documentation, see `apps/vada-ai/specs/yaml-schema-reference.md`. For the design rationale, see `apps/vada-ai/specs/generic-flow-refactor.md`.

---

## Wedges / Capabilities / Moats

Use this framework when labeling new work. Do NOT call something a moat unless it's structurally defensible.

| Label | Type | Defensibility |
|-------|------|---------------|
| WEDGE-1 | Deliberation engine as first coherent product | First-mover only. 6-12 months. |
| WEDGE-2 | First multi-agent deliberation MCP server | First-mover only. 6-12 months. |
| CAP-1 | Cognitive router / orchestration layer | Enabler. Inside adapter. Not a moat alone. |
| **MOAT-A** | Decision infrastructure with auditability | **Primary moat. Only one clearly defensible today.** |
| MOAT-B | Validated team corpora | Conditional on building them. Zero exist currently. |
| MOAT-C | Workflow embedding / process lock-in | Emerges from adoption. Not actionable directly. |

**Not moats:** engine itself, MCP first-mover alone, marketplace effects, brand, memory substrate (future).

---

## Phase Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | LangGraph foundation; Mastra deleted | ✅ complete |
| 2 | Package restructure (`@atta/engine`, `@vada/mcp-server`) | ✅ complete |
| 2.5 | Documentation hygiene | ✅ complete |
| 4 | `vada__consult` through engine | ✅ complete |
| 5 | Specs update | ✅ complete |
| 6 | `vada__consult` V1 polish (DB, Domain Expert, benchmark infra) | ✅ complete |
| 6.5 | Benchmark infrastructure | ✅ complete |
| 6.7 | Reviewer prompt audit + rewrite; benchmark architecture flaw found | ✅ complete |
| 7.1 | YAML schema investigation | ✅ complete |
| 7.2 | YAML refactor (Phase A + B); TypeScript deleted | ✅ complete |
| 7.2.1 | YAML catalog loader extracted into `@atta/engine` | ✅ complete |
| 7.3 | Hardcoded fallbacks eliminated; -v1 suffixes dropped; MCP registry made dynamic | ✅ complete |
| 8 | Synthesis exposed to consumers (structured field) | ✅ complete |
| 9 | Hosted MCP server | ✅ complete (May 4) |
| 10 | Single-source-keys reversal | ✅ complete (May 4) |
| 11 | Shared keys UI + ecosystem schemas | ✅ complete (May 5) |
| 12 | Doc audit pass | ✅ complete (May 6) |
| 13 | Vendor registry consolidation | ✅ complete (May 11) |
| 14 | Generic flow refactor + cleanup | ✅ complete (May 12-13) |
| 15 | Per-vendor tool substrate — GOOGLE_TOOL_REGISTRY + OPENAI_COMPAT_TOOL_REGISTRY + openai-compat custom tool loop | ✅ complete (Jun 23) |
| 16 | Reviewer prompt iteration (Track B Item 3b) | queued |
| 17 | Synthesizer prompt iteration (Track B Item 3c) | queued |
| 18 | First Vāda Reviewers benchmark run (Track B Item 4) | queued |
| 19 | Benchmark architecture redesign | queued |
| 20 | YAML cost calculator UI | queued |
| 21 | Validation experiments + cost-quality frontier | queued |
| MOAT-A | vada.attalabs.dev dashboard (full transcript + cost attribution) | required pre-launch |
| MOAT-B | One verticalized team + 100+ validated corpus | required pre-launch |

---

## UI token roles

Vāda renders through `@atta/ui` and follows the repo-wide token-role doctrine:
**`accent` is a surface, `primary` is the highlight.** The neobrutalist libraries use
`bg-accent` as a full-opacity hover *fill*, so a theme cannot also make it a light text
colour — on a dark background a fill must be dark and text must be light.

Vāda's 12 highlight call sites (`bench/*`, `mcp/page.tsx`, `deliberation/[id]/components/*`,
`_archived-science/[slug]`) moved from `text-accent`/`border-accent` to their `primary`
equivalents, matching the shared `next-link` nav-hover and `Logo` wordmark. In
`theme-kpop-demon-hunter` both tokens are bright (accent cyan, primary magenta), so this
is a hue shift, not a contrast change. **New Vāda UI must use `text-primary` /
`hover:text-primary` for emphasis and leave `bg-accent` to component hover fills** — see
`.claude/skills/ui-theme-tokens/SKILL.md`.

**retro's `Badge` has no `size` variant** (only `variant`) since the retroui relaunch (`d2bca515`) — `SessionCard.tsx` carried a stale `size='xs'` prop until fixed here; grep `<Badge` call sites for a stray `size=` before reusing this pattern elsewhere in Vāda.

## Locked Architectural Decisions

| Decision | Reason |
|----------|--------|
| Cognitive router inside `@atta/adapter-langgraph`, not a separate package | Round 23 reviewer convergence; over-modular for V1 |
| Sparring (2 agents) = default rounds-audit team, not Crucible (4-7) | Round 24 convergence; simpler, faster, easier to debug |
| Tools ON for reasoning agents, OFF for audit agents | Task 4.5 empirical finding; restricting reasoning tools degrades output |
| `vada__consult` ships before `vada__deliberate` | Round 24; validates distribution without betting on deliberation thesis first |
| Direct `@anthropic-ai/sdk` in adapter (not LangChain wrapper) | LangChain wrapper had a `top_p` bug |
| `Agent.tools: string[]` (not boolean) | Tool-specific config needed; adapter registry maps logical name → Anthropic API type |
| Recursion limit raised to 150 in LangGraph | Classifier nodes double graph step count; default 25 is insufficient |
| Spec ratification via explicit metadata block (not assumption) | Prevents spec/implementation drift like the BYOK gap |
| Architectural decisions are recorded append-only | Audit trail preserved across supersession events |
| Active YAML specs are unversioned (`crucible.yaml`, no version suffix) | Versioning belongs in git history + the frozen decision archive; filenames are stable |
| v2 naming framing (AttaLabs vs Atta; no -AI suffix; Pāli rule demoted) | Three rounds of multi-reviewer pressure-testing converged on v2 |
| Single source of truth for vendor metadata at `packages/models/src/vendors.ts` | Four prior prefix-resolution implementations had diverged |
| Adapter dispatches by SDK shape (3 branches: anthropic, google-genai, openai-compat) | Vendor count grows; SDK shape count is small and stable |
| Universal round-based YAML schema (v2) | One model expresses every deliberation pattern; engine compiler treats them uniformly |
| `compileFlow` shape detection preserves v1 Plan node ids | Adapter and route handler depend on the ids; deliberate pragmatic weakening of "zero branches" |
| `RevisionCondition` single-variant (`type: 'contains'`); engine throws on `equals`/`matches` | Honest engine surface; schema reserves the types for future extensibility |

---

## Reviewer Round Pattern

Architectural decisions get pressure-tested via informal rounds with Gemini, ChatGPT, DeepSeek, Grok. Rounds are numbered (17-24+ so far). When a major architectural question arises, consider drafting a reviewer round before committing.

The Vāda Reviewers product team itself (`vada-reviewers.yaml`, `vada-reviewers-synthesis.yaml`) is the productized version of this manual workflow — the same pattern Vāda uses to validate its own design choices is the pattern Vāda sells.

Reviewer responses: `apps/vada-ai/specs/engine/v2-results/`.

---

## Pre-Public-Launch Requirements

1. `vada__consult` and `vada__deliberate` both active in MCP — ✅ both live
2. At least one verticalized team with 100+ validated corpus questions (MOAT-B) — queued
3. vada.attalabs.dev dashboard with full transcript + cost attribution (MOAT-A) — live
4. Benchmark data showing measurable value over A0/A1 baselines — queued (depends on Phases 17-20)

---

## Post-Launch Watchdog Metric

`vada__deliberate` usage share at 6 months:

| Share | Signal |
|-------|--------|
| ≥ 20% | Healthy |
| 10-20% | Investigate escalation, UI, pricing |
| < 10% | Thesis failure; reconsider positioning |

---

## What Vāda is NOT

- ❌ A chat app (no dedicated UI for free-form chat)
- ❌ A multi-model aggregator (Poe/Perplexity style)
- ❌ A frontier model competitor
- ❌ A developer framework (users don't write code; they author YAMLs)
- ❌ A chain-of-thought tool (distinct from sequential-thinking MCP)
- ❌ Atta-the-product. Vāda is one product in AttaLabs and a deliberation layer inside Atta; it is not "Atta itself."

Global chrome (topbar, footer) is shared cross-product `@atta/ui` — see [.claude/skills/ui-components/SKILL.md](../ui-components/SKILL.md), not this file, for footer/topbar content and layout.

Vāda's theme and branding come from its own Sanity project (`ofnj2ojb`) via `getProductCms('vada')` — the product key resolves the project, so no `SANITY_PROJECT_ID` is involved. See [.claude/skills/ui-cms-theme/SKILL.md](../ui-cms-theme/SKILL.md) for that system; it is not this file's domain.

---

## Full docs

Vāda-internal:
- `apps/vada-ai/specs/vada-product-spec.md` — full product truth
- `apps/vada-ai/specs/yaml-schema-reference.md` — v2 YAML schema definitive reference
- `apps/vada-ai/specs/generic-flow-refactor.md` — generic flow refactor design document
- `apps/vada-ai/docs/vada-decisions-legacy.md` — Vāda-internal frozen decision archive
- `apps/vada-ai/specs/vada-state.md` — current implementation state and open questions
- `apps/vada-ai/specs/vada-science-of-deliberation.md` — foundational theory
- `apps/vada-ai/specs/engine/v2-results/` — reviewer rounds

Ecosystem-level (for the wider AttaLabs framing):
- root `CLAUDE.md`'s naming bullets — v2 brand architecture
- `aeg-project/state.md` — cross-project current state
- `docs/decisions-legacy.md` — global frozen decision archive
