# Vāda — product backlog

**Out of the AEG flow.** Held / future / research items for Vāda. This is a reference the Planner reads when choosing the next iteration slice — the flow never operates on it. Items graduate from here into an iteration (and get edges, owner, status) only when the Planner pulls them.

Migrated from the retired global `roadmap.md` (June 3, 2026). See git history of `roadmap.md` for the full prior detail.

---

## Reviewers — interactive research (principal-driven, not agent-dispatch)

These are judgment/iteration loops, not clean "agent → PR" tasks. They belong here, not in an execution iteration.

- **Reviewer system-prompt iteration (B-3b).** Run `vada__consult` with `spec_id: "vada-reviewers"`, read the 3 reviewer responses, judge behavior, tweak, re-run. Starting prompt: rev 5 spec §4.1.1. Unblocked (PR #31, PR #65).
- **Synthesizer system-prompt iteration (B-3c).** Same shape; starting prompt rev 5 spec §4.1.2.
- **First benchmark run (B-4).** Six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, Dani final arbiter. Per-question-type breakdown required.
- **Iterate or ship (B-5).** Decide recommended synthesis mode from data, not philosophy.
- **Post-benchmark decisions (rev 5 §7.2–7.9):** structured schema enforcement on reviewers; reviewer tool access; brief-authorship UX; final product name; synthesizer-as-scaffold UX; verification-block compliance across vendors; phantom-consensus detectability; default synthesis mode; success-criteria thresholds (70%/50%).
- **Fate of experimental YAMLs** (`a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`, `crucible`, `sparring`, `war-room`): keep as benchmark-only, promote, or retire — decide on benchmark data + user feedback.

## Web content

- **Trust Vāda page rewrite** — currently references browser-only BYOK; needs a full rewrite for the server-side at-rest model (post-D-028/D-029). User-facing prose.

## Hosted MCP hardening (Track E7+ — weeks-of-investment, deferred)

- **E8 Rate limiting** — per-key + per-user invocation caps. Pricing-tier dependent.
- **E9 Audit log retention** — per-decryption events for security audit. Retention policy TBD.
- **E10 KMS migration** — move master key from env var to KMS-managed. `kms_key_id` column already reserved.
- **E11 Per-key tool scoping** — restrict an API key to specific tools.
- **E12 OAuth as alternative to bearer auth** — works around Anthropic's claude.ai connector-broker `ofid_*` bug that fails bearer-auth self-hosted MCP. Only matters if claude.ai web adoption matters; Claude Code CLI works today.

## Research / parking lot

- **Vāda Desktop — CLI-subprocess providers.** Karpathy's `llm-council` precedent. "Use what you already pay for" chat-subscription transport. Likely lives at the Atta ecosystem level (Vitakka or a future consumer surface), NOT a Vāda product line. Transport mode already specced in `vada-reviewers-spec.md` §3.5 (v1.5, conditional on benchmark data). Research only — no active task.

## Stale specs (patch opportunistically when touched)

- `vada-product-spec.md`, `vada-product-recognitions.md`
- `vada-state.md` — phase update post-May-4/5
- `vada-reviewers-spec.md` — verify MCP/BYOK references; §8 phantom-consensus not in locked decisions
- `vada-teams-catalog/02-mcp-tool-interface.md` — stale `apiKey` body param (post-D-028 reads keys from DB by `clerkId`)
- `vada-teams-catalog/04-caller-claude-protocol.md` — "Caller Claude owns synthesis" reversed by D-016
- `apps/vada-ai/CLAUDE.md` — Settings tab table still shows Teams tab
