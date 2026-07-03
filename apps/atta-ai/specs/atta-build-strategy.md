# Atta — Build Strategy

Status: draft

**Date:** May 3, 2026
**Location:** `apps/atta-ai/specs/atta-build-strategy.md`
**Purpose:** How Atta gets built. Sequencing, discipline, and first-user tests for each layer.

This document captures the build approach derived from four rounds of strategic review. It is the operational complement to `atta-ecosystem-vision.md` (the strategic vision) and `atta-market-research.md` (the competitive landscape).

---

## The build philosophy

**Three layers, three releases, one composition.**

Each layer in the Atta ecosystem (Vāda, Vitakka, Sati composed into Atta) ships as its own public release on AttaLabs (`attalabs.dev`). Each release validates one specific question that the next layer depends on. The composed consumer product, when ready, lives at its own home (`atta.ai` if available, or `atalabs.app`, or another consumer-grade domain).

The personal-project framing is real. The Principal builds publicly for learning, not on a VC clock. But the framing has a half-life. Each release converts the framing closer to "for users." The conversion is gradual, deliberate, and honest.

---

## The sequence

### Layer 1: Vāda — already shipped

**Status:** V1 in production at `vada.attalabs.dev`. Vāda Reviewers v1 merged May 1, 2026.

**What it is:** Episodic cognition primitive. Multi-agent adversarial deliberation, structured reviewer roles, typed conclusions. Available as MCP server callable from Claude Desktop, Cursor, and any MCP-compatible host.

**What still needs to happen for Vāda:**

- **Reviewer prompt iteration** (Track B Item 3 — currently next). Interactive refinement of the Reviewers v1 system prompts.
- **First benchmark run** (Track B Item 4). Six-condition comparison to validate the deliberation quality empirically.
- **Public surface clarity.** AttaLabs landing page positions Vāda within the Atta ecosystem story, not as a standalone tool.
- **First non-Dani user.** Someone who is not a friend installs the MCP server and uses Vāda for a real high-stakes question.

**What does NOT happen during Vāda's standalone phase:**

- No Vitakka surface. Vāda is callable directly via MCP, not wrapped in a chat.
- No memory layer. Each Vāda invocation is independent.
- No focus container. Vāda doesn't know about ongoing problems — it answers one question at a time.

These are deliberately deferred. They belong to the next layers.

### Layer 2: Vitakka — substantial middle layer

**Status:** Not yet started. Triggered when Vāda V1 has been used by at least a small number of non-Dani users and the deliberation primitive has been validated as useful.

**What it is:** Situated cognition. The layer where Vāda becomes contextually grounded inside a focus over time. Artifacts, MCP context, history, compaction, accumulating conclusions. See `vitakka-human.md` for the full description.

**Engineering scope estimate:** Round 4 reviewers estimated Vitakta is ~2-3x the engineering of Vāda (not the 3-5x the Principal initially claimed). This is still substantial — months of focused work — but smaller than the Principal's first instinct. The novel difficulty is integration without destroying cognitive clarity, not invention of primitives.

**What ships in Vitakka V1:**

- Single focus (the user's current problem) — not multi-focus initially
- Multi-model conversation surface inside the focus
- Vāda invocation invisibly when the system infers high stakes
- Artifact ingestion and grounding
- MCP context pulling (read-from)
- Conversation history within the focus
- Deliberation compaction with reasoning lineage preservation
- Short and long-form invocation calibration
- Accumulating typed conclusions visible in the focus
- Off-ramps to execution (one-click export to Notion, Linear, calendar, email, clipboard)

**What does NOT ship in Vitakka V1:**

- Cross-focus memory (Sati territory)
- Multiple simultaneous focuses (deliberately one focus at first)
- Fine-tuning on personal corpus (Sati V2 territory)
- Cetana's deliberation-guided execution loop

Public surface: `vitakka.attalabs.dev`. Same lab discipline as Vāda.

### Layer 3: Atta — the composition

**Status:** Not yet started. Triggered when Vitakta V1 has validated within-focus compounding.

**What it is:** The consumer product. Vitakta + Sati composed. Cross-focus memory, indexation, focus-to-focus continuity, eventual fine-tuning.

**Public surface:** **Not** AttaLabs. The composed Atta consumer product moves to its own domain when ready (`atta.ai` if available, or `atalabs.app`, or another). AttaLabs continues to host the components and ongoing lab work.

This is the moment the Principal converts from "personal project" to "consumer product." It is also the moment when distribution, pricing, and go-to-market questions become real. None of this is decided yet. The decisions activate when Atta V1 is close to ready.

### Layer 4: Cetana — earliest 2027

See `cetana-reality-check.md`. Build path is V0 (a Vāda YAML team for PM deliberation), V0.7 (MCP + CLI), V1 (full deliberation-guided execution loop). Earliest realistic V1: late 2026 / early 2027. Not in the critical path for shipping the Atta consumer product.

---

## Why this sequence and not another

### Why not skip Vitakka and go Vāda → Atta MVP?

Three round-3 reviewers recommended this. They argued Vitakka standalone has no defensible shape — it's "Jenova with hidden Vāda." The Principal pushed back in round 4: Vitakka is the substantial layer where most of the engineering and most of the category innovation lives.

**The Principal's argument prevailed.** Vitakta is not packaging. It is the layer that proves whether deliberation can be situated inside a focus over time — a genuinely unanswered product question. Skipping it would mean shipping Atta MVP with cross-focus memory layered on top of a within-focus surface that hasn't been validated. That's two unknowns combined. Shipping Vitakka standalone isolates one variable at a time.

The 2-3x engineering correction matters but doesn't change the sequence. Vitakka is still big enough to ship as its own release, and the validation it produces is independent of Sati's validation.

### Why ship to AttaLabs (the lab) and not directly to a polished consumer product?

The Principal is building a personal project that hopes to become a product. AttaLabs is honest about what it is — a lab where components ship publicly as they're built. Visitors expect transparency about state. They tolerate rough edges in exchange for seeing the work in progress.

A consumer product, by contrast, expects polish. It expects a complete experience. It expects the user to know what they're getting and why they should pay.

**Conflating these confuses both audiences.** Lab visitors get over-promised polish. Product users get under-delivered completeness.

Separating them — AttaLabs as permanent lab, the consumer product at its own home when ready — keeps each audience served correctly.

### Why not ship the consumer product first?

The Principal does not yet know:

- Whether Vāda's deliberation actually produces meaningfully better thinking for non-Dani users
- Whether users will adopt focuses as a unit of work
- Whether within-focus compounding feels valuable
- Whether cross-focus memory is the magic moment or a nice-to-have
- Whether the discipline of hiding complexity holds at scale
- What the right calibration is for invocation, compaction, and off-ramps
- What users will pay for and what they consider table stakes

Shipping to AttaLabs answers these questions in stages. Shipping a consumer product first would commit to all of them simultaneously and then have to revise based on usage. The lab approach trades polish for learning. For a personal project becoming a product, that's the correct trade.

---

## The hide-the-work discipline

This is the central execution risk identified across all four review rounds.

**The framing requires it:** the user experience must feel simple while the product underneath is sophisticated. Anyone who experiences Atta should think "this is calm and accessible," not "this is a multi-agent deliberation engine with typed conclusions and provenance traces."

**The Principal's history works against it:** the existing Vāda architecture is rich, taxonomic, and configurable. Reviewer roles, posture discipline, YAML team specs, four workflow types, BYOK encryption. These are intellectually beautiful systems. Engineers who build them often want users to admire them.

**The discipline is unproven.** No reviewer in any round had evidence the Principal could hide the work at scale. This is the highest-leverage discipline question in the entire build.

### Concrete tests of the discipline

The discipline is failing if any of these are true at any release:

- The first public version of Vāda's MCP server has a configuration UI with more than three options
- Vitakta V1's chat surface shows "running multi-agent adversarial deliberation" or similar machinery-revealing language to non-power-users
- The default view of any release exposes reviewer roles, YAML configurations, or posture discipline names
- A "show me how you thought about that" debate tree is the *default* expanded view, not a deliberate drill-down

The discipline is succeeding if:

- A non-technical user can install Vāda's MCP server and get value with no configuration beyond environment variables
- Vitakta V1's chat says "thinking carefully about this..." not "running 3-agent deliberation"
- Three months after Vitakta V1 ships, a user says "it just feels smarter than other AI tools" and cannot articulate why
- Power users can drill down into machinery on demand, but the default surface is calm

### The Principal's commitment

The Principal must commit to this discipline at every release decision. Each toggle added to a settings panel, each "Advanced" tab created, each piece of jargon exposed in the UI is a decision against the discipline. The aggregate of those decisions is what users experience.

Reviewers in round 4 named this as the "single biggest unproven risk." The Principal acknowledged it. The proof comes from shipping.

---

## First-user tests for each release

These are not feature checklists. They are the specific empirical questions each release answers about the next layer.

### Vāda V1 — first-user test

**Question being answered:** Does multi-agent adversarial deliberation produce meaningfully better answers than single-model prompting for real high-stakes questions?

**Specific test:** A non-friend technical user (indie hacker, researcher, founder) installs the MCP server. They ask a real high-stakes question they care about — counteroffer, architecture decision, strategic call. They use it again unprompted within a week for a second question.

**What "passes" looks like:** They voluntarily return. They report the deliberation was "noticeably better" — fewer confident hallucinations, useful disagreement, reusable artifact (the typed conclusion).

**What "fails" looks like:** They use it once, find it slow or theatrical, and revert to one-shot prompting. The deliberation is interesting in theory but not in practice.

**If it fails:** the Vitakta build does not start. Vāda needs more iteration on prompts, posture, or invocation.

### Vitakka V1 — first-user test

**Question being answered:** Does within-focus compounding work? Do users return to a focus voluntarily and find that the accumulated context reduces re-explanation?

**Specific test:** A founder with an active problem (pricing decision, hiring decision, strategy work) uses Vitakta for one week. They bring artifacts. They ask follow-up questions across sessions. They close the laptop and come back the next day.

**What "passes" looks like:** They resume the same focus rather than starting a new one. They report that "I didn't have to re-explain everything." Accumulated conclusions feel like genuine progress, not chat history.

**What "fails" looks like:** They start a new focus each session. They re-explain context every time. The focus feels like another folder. Compaction loses things they cared about.

**If it fails:** the Atta MVP build does not start. Vitakta needs better calibration on what to preserve, what to surface, and how invocation works.

### Atta V1 — first-user test

**Question being answered:** Does cross-focus memory deliver the "how did you know that?" moment that makes the composition feel magical instead of merely useful?

**Specific test:** The same Vitakta user now has three or more focuses (pricing, hiring, roadmap). They ask a question in Focus C that relates to a conclusion from Focus A. Atta surfaces that prior conclusion automatically — not because they searched for it, but because the system understood the relationship.

**What "passes" looks like:** They say "wait, how did you know that?" and trust the connection. They start treating Atta as the place their thinking lives across problems.

**What "fails" looks like:** Cross-focus retrieval is irrelevant or noisy. Users don't notice it. Or they notice it but find it spooky rather than helpful.

**If it fails:** Sati's retrieval and indexation needs rework. Atta V1 doesn't ship to consumer product domain.

---

## What converts the personal-project framing

Each release is a conversion moment.

**Vāda V1 going public on AttaLabs** is the first conversion. Strangers can find it. The framing shifts from "what I'm building for myself" to "what I'm building for myself, also visible to others."

**Vitakta V1 with first-user test passing** is the second conversion. The framing shifts from "personal project that's visible" to "product that has a real user." This is when distribution and feedback start mattering.

**Atta V1 on a consumer product domain** is the full conversion. The framing shifts to "product." Pricing, distribution, business model become real questions. The personal-project framing retires here.

**Cetana** comes after this conversion, if it comes at all. By that point Atta is either a real product with users and revenue, or it's been clarified as a personal project that hopes to become a product *eventually* but hasn't yet.

The half-life of "personal project" is real. Each release shortens it. The Principal must be honest about which conversion has happened at which moment, or the framing becomes a cognitive shield rather than a useful frame.

---

## What the build does NOT include

To stay disciplined about scope:

- **No round 5 strategic review.** Four rounds was enough. Further deliberation produces diminishing returns. Real users will pressure-test the framing better than reviewers can.
- **No domain commitment for the consumer product before Atta V1 is close to ready.** Premature domain choice is wasted optionality.
- **No team hiring during personal-project phase.** When and if hiring becomes relevant, it's after the framing has converted to "product."
- **No fundraising during AttaLabs phase.** AttaLabs is honest about what it is — a lab. Fundraising activates with the consumer product, not before.
- **No premature Cetana work.** Cetana V0 is a Vāda YAML team, callable when needed. V0.7 and V1 wait for Atta to prove out.
- **No marketing surface beyond AttaLabs during the lab phase.** Marketing activates when there's a consumer product to market. Until then, the public surface is honest about being a lab.

---

## Open questions deferred to the relevant release

These do not need answers now. They activate at the relevant phase.

**At Vitakka V1 build:**
- What's the right invocation heuristic for short vs long-form deliberation?
- What does compaction actually preserve, structurally?
- How are off-ramps designed for the eight most common execution destinations?
- What does the focus look like visually, beyond the chat surface?

**At Atta V1 build:**
- What's the cross-focus retrieval algorithm? Pure semantic? Topic-based? Conclusion-based?
- How does Sati handle conflicting conclusions across focuses?
- When does indexation update? How is it visible to the user?
- What does fine-tuning on personal corpus actually deliver, if anything?

**At consumer product domain activation:**
- Final domain choice (`atta.ai` if available, or `atalabs.app`, or other)?
- Pricing model (subscription? consumption? freemium?)
- Distribution strategy (PLG? content? founder networks? accelerator partnerships?)
- Business model that doesn't compromise neutrality (no pass-through model fees, no data monetization, no ads)
- Migration plan from AttaLabs subdomains to consumer product domain

---

## Related documents

- `atta-ecosystem-vision.md` — what Atta is and why
- `atta-market-research.md` — what Atta competes with and what to watch
- `atta-naming-decision.md` — domain architecture and naming rules
- `vitakka-human.md` — the substantial middle layer
- `cetana-reality-check.md` — the deliberation-guided execution layer (V4+)
- `vada-state.md` — current state of Vāda V1
- `atta-finetuning-research.md` — Sati's eventual fine-tuning path

---

## How to use this document

When deciding whether to add a feature: does it serve the discipline (hide the work, ship validated layers, avoid scope creep) or fight it? If it fights, defer.

When tempted to write another strategic review: stop. Check the relevant first-user test. Ship instead.

When the personal-project framing feels stretched: check which conversion moment has actually happened. Be honest. The framing is useful as long as it's accurate.

When competitive pressure tempts a faster ship: check `atta-market-research.md` for the threats that actually matter and the indicators to watch. Speed matters; panic doesn't.


---

## Vāda Desktop — distribution path for individual prosumers

*Added May 8, 2026.*

This section captures Vāda Desktop as a product surface, not as an engine implementation detail. Already documented technically in `vada-reviewers-spec.md` §3.5 (CLI mode, v1.5) and `vada-reviewers-tech-deep-dive.md` Section 9 (Karpathy `llm-council` precedent). What was missing — and what this section adds — is the **product framing**: subscription-paid execution as the lowest-friction distribution path for individual prosumers.

### The friction the BYOK model creates

Vāda's hosted MCP and web app both use BYOK (bring-your-own-key) for provider API access: users supply their Anthropic, OpenAI, Google, xAI keys, and Vāda calls those APIs on their behalf. This works for technical users who already have API keys. It does not work for the broader user base.

**Most prosumers don't have API keys.** They have subscriptions. They pay $20/month to Anthropic for Claude Pro / Max, $20/month to OpenAI for ChatGPT Plus, $20/month to Google for Gemini Advanced, $8/month to X for Premium. None of these subscriptions expose API access. Prosumers who want to use Vāda's vendor-diverse Reviewers either need to acquire (and pay separately for) API keys for each vendor — multiplying their AI spend — or skip Vāda entirely.

This is a real distribution problem. The Karpathy `llm-council` open-source release demonstrated the pattern that solves it: instead of using HTTP APIs, the tool spawns CLI subprocesses (Claude Code CLI, Gemini CLI, Codex CLI, Ollama) that authenticate with the user's existing subscription. Same vendor-diverse deliberation, zero API keys, paid for by subscriptions the user already has.

### What Vāda Desktop is

A desktop app (Tauri or Electron, TBD) that runs Vāda's engine locally and uses CLI subprocesses as the providers. The architecture:

- Same `@atta/engine` as the hosted Vāda — Plan compilation, LangGraph execution, all Vāda Teams (Reviewers, Sparring, Crucible, War Room) selectable from the same YAML catalog
- `LlmCallFn` adapter routes by model prefix as today (claude-* → Anthropic, gemini-* → Google, etc.) but the leaf-level "how do I actually call the model" function gets a second implementation: instead of an HTTP API client, spawn a CLI subprocess
- Subprocess discipline per `vada-reviewers-spec.md` §3.5: `mktemp -d` workdir, redirect-to-file, `trap` cleanup, `wait` per PID
- User authenticates each CLI once with their existing subscription; Desktop never sees plaintext credentials
- Runs entirely on the user's machine; no servers, no centralized infrastructure

The engine doesn't change. The teams don't change. The YAMLs don't change. The leaf-level provider call gets a sibling implementation that uses subprocesses instead of HTTP APIs.

### Why this is a real product surface, not just an engine detail

The natural read of "CLI mode" — and the read currently in the spec — is that it's an engine implementation choice with a fidelity benefit (CLIs run inside the vendor's product harness, closer to chat-product behavior than raw API calls). That's true but secondary.

The **primary** read is that CLI mode is the distribution path that lets Vāda reach individual prosumers without forcing them to adopt API keys. The desktop app is the packaging that makes this real:

- **Single download.** Tauri/Electron binaries for macOS, Windows, Linux. User installs once.
- **First-run setup.** App walks the user through authenticating each CLI they want to use (Claude Code CLI for Claude, Gemini CLI for Gemini, Codex CLI for OpenAI, Ollama for local). Each CLI does its own subscription auth flow. App doesn't handle credentials.
- **Vāda Teams from day one.** Same catalog (Reviewers, Sparring, Crucible, War Room) as hosted Vāda. Same UI surfaces (deliberate page, sessions history, settings). The engine is shared.
- **Zero recurring cost to Vāda.** No servers. No API key management. No envelope encryption (D-029) because there are no keys to encrypt. The user's existing subscriptions pay for the model time.
- **Open source.** Same legal/ToS posture as Aider, llm-council, and Continue: user-on-own-machine using their own subscriptions, tolerated by vendors because it's not commercial subscription exploitation.

### How it fits the Atta build sequence

Vāda Desktop is **not** the next thing to build. The sequence in this document — Vāda V1 (shipped) → reviewer prompt iteration → first benchmark run → Vitakta — is unchanged. Vāda Desktop slots in **after** Vāda Reviewers v1 ships, when the cognitive design has been validated and the question shifts to distribution.

**Why not before Reviewers v1 ships:** the prompts and synthesizer (rev 5 in `vada-reviewers-spec.md`) are still being iterated. Building Desktop UX around prompts that may still change is wasted work.

**Why not as part of Vitakta:** Vitakka is a different product (the situated-cognition layer; see `vitakka-human.md`). Vāda Desktop is Vāda — same engine, same teams, different distribution. Vitakta's roadmap is independent.

**Why this is a parallel product surface, not a replacement:** the hosted Vāda at `vada.attalabs.dev` continues to exist for users who want a hosted service (teams, businesses, anyone paying for someone else's infrastructure). Vāda Desktop is for individual prosumers who want their own subscriptions to cover the cost. Two surfaces, one engine, one team catalog.

**Estimated effort:** ~1-2 days of engine adapter work to add CLI subprocess routing (already specced as v1.5 in `vada-reviewers-spec.md` §3.5, engine constraint #6). ~2-3 weeks of desktop UI work (Tauri/Electron, first-run flow, Vāda Teams browser, sessions view, settings). Earliest realistic ship: Q3 2026, conditional on Vāda Reviewers v1 shipping first.

### Open questions

These are not blocking and don't need answers yet. They activate when Vāda Desktop work begins.

- **Pāli name or "Vāda Desktop"?** The Atta naming rule (Pāli = built by Atta) suggests a Pāli name. But Vāda Desktop is *the same product* as hosted Vāda, in a different surface. "Vāda Desktop" reads as a packaging variant, which is closer to the truth. Decide closer to ship.
- **Open source or commercial?** Karpathy's `llm-council` is open source MIT. Aider is open source Apache 2. Continue is open source Apache 2. The pattern in this product space is open source. Vāda Desktop probably ships open source as part of Vāda's existing public surface — separate commercial product surfaces (hosted, team, enterprise) remain hosted-only and remain potential revenue paths.
- **How does it relate to the Anthropic Claude Apps marketplace path?** When Anthropic's marketplace matures, Vāda becomes installable as a Claude App inside claude.ai — at which point Anthropic users can use Vāda without leaving their chat surface, paid for by their Claude subscription. Does Vāda Desktop become redundant for Anthropic users in that world? Probably partially — Anthropic-only users may default to the Claude App; cross-vendor users (who want Gemini AND GPT AND Grok in their reviewer pool) still need Desktop because Claude Apps can only call Claude.
- **Tauri vs Electron?** Bundle size, developer experience, and Bun compatibility all push toward Tauri. Electron is the safer, better-known choice. Decide closer to ship.
- **Does Desktop replace the hosted MCP entirely for individual users?** Probably not. Hosted MCP works for users who don't want to install anything; Desktop works for users who want lower friction and lower cost. Both serve real audiences. Keeping both is the conservative call.

### Why this matters for the Atta build philosophy

The "hide the work" discipline at the heart of this document is most testable on Vāda Desktop. A non-technical user installing the app should NOT see "configure your CLI subprocess discipline" or "select your provider routing" — they should see "connect your subscriptions" and then "ask me anything." If Vāda Desktop ships with surface complexity that exposes the subprocess machinery, the discipline has failed visibly. If it ships with calm onboarding that hides the machinery, the discipline has held under real product conditions.

This is also where the personal-project-to-product conversion (described elsewhere in this document) accelerates. Vāda Desktop is the surface that lets non-technical prosumers experience Vāda. The conversion from "lab tool for technical users" to "product for individual prosumers" happens, in practice, when Desktop ships.

### Related documents

- `vada-reviewers-spec.md` §3.5 — CLI mode v1.5 specification, including mandatory subprocess discipline
- `vada-reviewers-tech-deep-dive.md` Section 9 — Karpathy `llm-council` analysis, ask-llm subprocess pattern
- `atta-plan.md` "Vāda Desktop — CLI-subprocess providers (post-Reviewers-v1)" — current parking-lot status and dispatch criteria
- `atta-ecosystem-vision.md` — broader Atta layering (Vāda → Vitakta → Sati → Atta)
- `cetana-reality-check.md` — separate execution-layer product, V4+ horizon
