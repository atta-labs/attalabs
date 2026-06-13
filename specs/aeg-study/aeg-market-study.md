# AEG — Market Study: What Exists, and Why You Might *Not* Build This

**Status:** study / living
**Author:** Team Leader (Claude), at the Principal's request
**Date:** 2026-06-13 (research verified live this date)
**Companion:** `aeg-process-reflection.md` (the honest internal assessment)
**Purpose:** an exhaustive, current, deliberately skeptical survey of the space AEG sits in — built to answer the Principal's question: *"This space is crowded. Should I drop AEG and use something already done and famous?"* The default posture of this document is **"talk yourself out of building it,"** because that is the test a real product must survive.

> **Research honesty:** the competitor facts, adoption figures, and the EU AI Act timeline below were verified by live web search on 2026-06-13. Where a claim is a vendor's own marketing, it is labelled as such. A multi-agent deliberation can sharpen reasoning but cannot validate current-world facts inside a frozen snapshot — so the dated, sourced claims here matter more than any argument built on them.

---

## 1. The one-paragraph answer

The space AEG touches is **more crowded than it looks, and the two biggest adjacent categories are already owned by funded/famous projects** — *agent control planes* (Cordum and the "governance layer" category) and *spec-driven development* (GitHub Spec Kit, 90k+ stars). AEG's genuinely differentiated position is **not** "govern agents" or "spec-driven dev" — both taken — but a narrower seam: **forge-native governance of the AI-assisted *software-delivery* workflow, designed for human trust and team adoption.** Whether that seam is a *product* or just *good personal infrastructure* is unproven, and the strongest honest reason to build it is the **Sateliot/adoption** thesis, not the compliance thesis (whose deadline just slipped 16 months). Recommendation: **don't drop it, don't productize it yet — run the two experiments (Herald ship + Sateliot pilot) and let evidence decide.**

---

## 2. Map of the territory (five clusters AEG touches)

AEG is unusual — and this is a *warning sign*, not a boast — in that it touches five adjacent categories at once. Touching all five means it is differentiated from each but **fully owned by none**, and a buyer in any one category will reach for the specialist, not AEG.

### Cluster A — Agent orchestration frameworks
**Who:** LangGraph (the one AEG is *built on*), CrewAI, Microsoft AutoGen/AG2 + Agent Framework, OpenAI Agents SDK, Google ADK, Claude Agent SDK, LlamaIndex, Pydantic AI. (Verified: LangGraph surpassed CrewAI in stars in early 2026, ~47M monthly downloads, dominant for "production control"; the field went from "four frameworks to six" in 2026.)
**What they do:** run agents — graph/role/handoff/conversation orchestration, state, tools, checkpointing.
**AEG's relation:** AEG is *downstream* of these. It is **not** an orchestration framework and must never pretend to be — it runs *on* LangGraph via `@atta/adapter-langgraph`. Competing here is suicide; these are the incumbents and AEG is their consumer.
**The recurring industry quote that matters:** *"Multi-Agent Orchestration Needs a Control Plane, Not Another Framework — every framework is adding multi-agent support; none solve governance across agents."* This is the gap AEG and others are chasing. AEG does **not** chase it the way the others do (see Cluster B).

### Cluster B — Agent governance / control planes (THE crowded-and-dangerous one)
**Who:** **Cordum** (`cordum.io`, `github.com/cordum-io/cordum`) is the sharpest direct example — "the open agent control plane," framework-agnostic (LangChain/CrewAI/MCP/any), **pre-execution policy enforcement, approval gates, deterministic audit trails, policy-as-code in YAML**, a "Safety Kernel" that returns ALLOW/DENY/REQUIRE_APPROVAL/ALLOW_WITH_CONSTRAINTS, and a **"Cordum Edge for Claude Code"** local path. Plus the broader category: Semantic Kernel positioned for "built-in governance," and a wave of "AI agent governance platform" content.
**Market signal (verified, vendor-cited Gartner):** *"74% of enterprises see AI agents as a new attack vector"*; *"over 40% of agentic AI projects will be canceled due to inadequate risk controls"*; a *"1,445% surge in agentic AI governance inquiries"* (Gartner, Feb 2026); *"only 7% of organizations have fully embedded AI governance."* The pain is real and budgeted.
**AEG's relation — read carefully, this is the crux:** Cordum governs agents at **RUNTIME** — it evaluates *every tool call / API request / delegation* against policy *before the action executes*, across a fleet of autonomous agents doing real-world side effects. **AEG governs the DEV/PR WORKFLOW that produces code** — planner → brief → developer → reviewer → merge, with the git forge as the source of truth. These are **different layers**: Cordum is "should this *running agent* be allowed to send this email / hit this API right now?"; AEG is "is this *AI-written code change* reviewed, spec-conformant, and merge-worthy?"
**The danger:** to a buyer, the words are nearly identical — "pre-dispatch gates," "approval workflows," "audit trails," "policy as code," "observe mode / start with monitoring." AEG independently reinvented Cordum's *vocabulary* (our D-030 "observe mode" is almost verbatim Cordum's "start with monitoring, not restriction"). A customer hearing AEG's pitch will say "isn't that Cordum?" and AEG will spend its first sentence explaining it's a different layer. **That is a weak position.** If AEG ever markets on "governance / control plane," it loses to Cordum on funding, content, and category ownership.

### Cluster C — Spec-driven development (THE other crowded-and-dangerous one)
**Who:** **GitHub Spec Kit** — open-source, **90,000+ stars** (verified, May 2026), agent-agnostic (30+ agents: Copilot, Claude Code, Gemini CLI…). Its workflow is **`/constitution` → `/specify` → `/plan` → `/tasks` → `/implement`**, with `constitution.md` ("non-negotiable governing principles the agent follows"), cross-artifact consistency analysis, and "checklists as unit tests for English." Plus: Kiro, Augment Code's spec tooling, Tessl, "Constitutional SDD" (arXiv Feb 2026), FSPEC ("dark factory"), Specmatic, and a whole `spec-driven` GitHub topic.
**Market signal (verified):** Futurum's Mitch Ashley — *"the specification becomes the unit of governance across agents and contributors,"* *"vendors are competing to own the artifact that governs intent."* GitHub's own framing: *"this approach is bigger than any one tool or company."*
**AEG's relation — this is the most threatening finding in the study:** AEG's planner→brief→tasks flow, its **`state-machine.md` constitution**, its tiered docs, its "the brief is the unit of context" — **substantially overlap Spec Kit's already-open-source, 90k-star, GitHub-blessed workflow.** AEG even references Spec Kit in its own `brief-authoring` skill (the `[NEEDS CLARIFICATION]` convention is lifted from it). A reviewer comparing AEG to Spec Kit will find AEG is a *more opinionated, forge-native, single-author variant of a thing GitHub open-sourced and the market is standardizing on.* AEG's distinguishing claims vs Spec Kit (forge-derived status, declared package-level conflicts, multi-developer dispatch gates, the Reviewer/Archivist roles) are real but **incremental**, and Spec Kit is a moving target with GitHub's distribution behind it.

### Cluster D — AI dev-workflow / autonomous-coding platforms
**Who:** GitHub Copilot (moving to usage-based AI-credit billing June 2026; ships admin audit logs, MCP allowlists, policy management — i.e. *governance is shipping inside the incumbent*), Copilot Workspace, Cursor, Windsurf, Devin/Cognition, Factory, Sweep, the "AI coding agent" field generally.
**Market signal (verified, sobering on the *why*):** AI-generated code is measurably unsafe — a SonarQube study found *70%+ of one model's detected vulns rated BLOCKER*; Pearce et al. found *~40% of code in security-sensitive contexts contained vulnerabilities*; Deloitte's State of AI 2026: *only 1 in 5 companies has a mature governance model for autonomous agents.* This is the real, evidence-backed pain AEG's review/spec-conformance gates address.
**AEG's relation:** AEG is a *discipline layer on top of* these tools (it dispatches Claude Code / any agent). It does not compete with them; it orchestrates them. But the incumbents (esp. GitHub) are **absorbing governance into the platform** — audit logs, policy management, Spec Kit — which is the existential threat: *the thing AEG adds may become a free checkbox in the tool teams already use.*

### Cluster E — Enterprise AI compliance / provenance
**Who:** the EU-AI-Act-driven governance vendors, SLSA/provenance/supply-chain tooling, NIST AI RMF / ISO 42001 tooling, the GRC incumbents adding AI modules.
**Market signal — AND THE BIG CORRECTION:** The EU AI Act **high-risk (Annex III) obligations were provisionally deferred from 2 August 2026 to 2 December 2027** (Digital Omnibus political agreement, 7 May 2026 — verified across multiple sources; *still subject to formal adoption, not yet enacted*). Earlier internal AEG notes (D-030) cited "August 2026" as a near-term wedge. **That cliff moved ~16 months.** The compliance urgency AEG might have surfed is materially weaker than it was. (Prohibited-practice and GPAI obligations are already in force; the *high-risk* tier — the one relevant to "auditable AI-written code" — is the one that slipped.)
**AEG's relation:** AEG's "audit-by-construction provenance" (D-030 provenance block) is a genuine asset *here* and the incumbents in Cluster B/D mostly *don't* produce dev-workflow provenance. But with the deadline deferred, this is a **slower-burning** wedge, not a 2026 fire.

---

## 3. Where AEG is genuinely differentiated (the honest, narrow seam)

Stripping the vocabulary, the combination that is **not** found packaged elsewhere (verified absence, not proof of novelty):

1. **Forge-native, status-is-derived governance.** Status is never stored — it is computed from branch/PR/merge state. Cordum stores run history; Spec Kit tracks tasks; AEG *refuses to store status at all*. This is a real, clean architectural stance and I did not find it elsewhere.
2. **Declared, package-level conflicts with a *principled refusal* of dynamic scanning.** The "when unsure, declare and serialize; never build a dynamic file-overlap scanner" rule is distinctive and intellectually honest about what can't be done reliably.
3. **Orchestrator-independence as a hard boundary.** "A tool may know AEG; AEG does not know the tool." Cordum *is* the control plane; AEG *needs no* control plane and runs by hand. This makes AEG adoptable with zero infrastructure — which is the Sateliot thesis's foundation.
4. **The dev-workflow layer, not the runtime layer.** AEG governs *producing code with agents*; Cordum governs *agents taking actions at runtime*. Different layer, genuinely.
5. **Manual-mode-first, designed for human trust.** Every gate is a visible checkpoint. This is not a feature the runtime-control-plane crowd has, because they're built for *automated* fleets, not *scared humans adopting their first agent.*

**The catch:** #1–#4 are *architecturally* differentiated but **may not be things a buyer values enough to switch for.** #5 — human trust/adoption — is the one that is differentiated *and* maps to a real, unserved buyer (see §5).

---

## 4. The case *against* building AEG as a product (steelmanned)

The Principal asked to be talked out of it. Here is the strongest version:

1. **Two giants own your two biggest categories.** Spec Kit (90k stars, GitHub distribution) owns spec-driven dev; Cordum + the control-plane category own agent governance. AEG is a more-opinionated variant of the first and a different-layer cousin of the second. In both head-to-heads, AEG loses on distribution.
2. **The incumbents are absorbing your value.** GitHub ships Spec Kit *and* Copilot governance *and* audit logs. The single most likely future is that "governed AI-assisted delivery" becomes a **free feature of the tool teams already pay for** — the worst possible market for a standalone.
3. **Methodologies don't sell; the consulting around them does.** AEG is a methodology with a thin config layer. Scrum made its creators little; certifications/consulting made the money. A read-only Studio dashboard over governance files is a weak product wedge an incumbent replicates in a sprint.
4. **Your compliance accelerant just slipped 16 months.** The EU AI Act high-risk deadline moved to Dec 2027. "Adopt governance before the cliff" is no longer urgent.
5. **Your evidence base is N=1.** AEG is validated on one person's two-half-built-app monorepo. "Who else runs this, at scale?" has no good answer yet.
6. **Adoption cost is brutal.** "Adopt our whole governance discipline for your AI agents" is a huge ask for teams already drowning in process, unless the pain is on fire — and post-deferral, for most teams, it isn't *yet*.

**If you weight these honestly, the rational default is: do NOT productize AEG. Use Spec Kit for the spec/plan/task flow, Cordum (or wait for GitHub) for runtime governance, and spend your hours shipping Herald and Vāda.** That is the disciplined null hypothesis, and it should be beaten by evidence, not by attachment.

## 5. The case *for* — the one thesis that survives the above

One thread survives the steelman, and it's the one the Principal surfaced from real life, not from a market map: **trust and adoption for teams that are *afraid* of AI.**

The Sateliot pilot — teaching a *scared* junior developer (and his team lead) to adopt agents — points at a buyer that Cordum and Spec Kit **do not serve**:

- **Cordum serves teams that already run autonomous fleets** and need to police them. That team is *past* the fear. It's a maturity-stage-3 product.
- **Spec Kit serves developers who already trust their agent** and want better output structure. Also past the fear.
- **AEG's manual mode, visible hand-offs, and observe mode serve the team that hasn't started** — the one where the team lead is afraid that agent work is invisible, unaccountable, and unreviewable. AEG's whole design answers exactly that fear: every seam is a human checkpoint; nothing merges without review; status is transparent; you can run it read-only first.

This reframes AEG's category from the crowded **"AI governance / control plane"** to the comparatively empty **"AI adoption & trust scaffolding for teams"** — closer to "the Scrum of agentic development" than "the firewall of agentic runtime." That is:
- a **different buyer** (the engineering manager nervous about AI, not the platform/security team policing a fleet),
- a **different pain** (fear of losing control/visibility, not regulatory exposure),
- and a **less-contested category** (nobody famous is selling "how a scared team safely starts using agents").

It is also the thesis AEG is *already accidentally built for* — manual mode is "the teaching mode," observe mode is "monitoring not restriction," the conversational protocol is "the human always knows what's happening." Those were built for trust, not compliance.

**This is the experiment worth running, and Sateliot is the lab.** Not "does AEG govern agents better" (it competes there and may lose) but **"does AEG make a frightened team comfortable enough to adopt agents and keep using them?"** If yes, there is a real, defensible, uncrowded product. If no, AEG is excellent personal infrastructure and that's a fine thing to be.

## 6. Recommendation

1. **Keep AEG. Freeze its design.** It's past diminishing returns. (See the reflection doc.)
2. **Do not market it as governance or spec-driven dev.** You lose both head-to-heads.
3. **Run two experiments, let them vote:**
   - **Herald-onto-engine ship:** does AEG demonstrably make shipping a real feature faster/safer? (Metric: real errors caught vs. time cost — the iteration already caught two premise errors; keep score.)
   - **Sateliot pilot (the primary one):** does AEG make a scared junior dev + his team lead adopt agents and keep using them without the Principal in the room? (Metric: a human-trust outcome.)
4. **If you productize, productize the trust/adoption thesis** — "the safe on-ramp for teams afraid of agents" — with observe mode as the wedge and provenance as the slower-burn compliance upsell (deadline now Dec 2027).
5. **Borrow ruthlessly instead of rebuilding** where you're not differentiated: lean on Spec Kit's conventions where they match, treat Cordum-style runtime governance as a *different layer you don't need to build*, and keep AEG's energy on its genuine seam (forge-native dev-workflow governance + human trust).

The honest bottom line: **the crowded space is a real reason for humility, not for surrender.** AEG's defensible ground is small but real, and it's the human-adoption corner — the one the Sateliot story, not the market map, revealed. Build the evidence there before deciding.

---

*Living study. Re-verify competitor facts and the EU AI Act status before citing — both move fast (the high-risk deadline already moved once in 2026). Update after Herald ships and after the Sateliot pilot produces a human outcome.*

## Sources (verified 2026-06-13)
- Agent frameworks landscape 2026 (LangGraph dominance, "four to six frameworks"): multiple 2026 surveys (Medium/ATNO, TowardsAI, ServicesGround, Cordum, AliceLabs, GuruSup).
- "Orchestration needs a control plane, not another framework"; Cordum product + claims (pre-dispatch gates, policy-as-code YAML, Edge for Claude Code, Gartner 74% / 40%-cancelled / 1,445% surge / 7% embedded): cordum.io, github.com/cordum-io/cordum (vendor-cited Gartner figures).
- GitHub Spec Kit (90k+ stars, /constitution→/specify→/plan→/tasks→/implement, agent-agnostic, "spec as unit of governance"): github.com/github/spec-kit, GitHub Blog, DevOps.com, Augment Code, EPAM, MarkTechPost.
- AI-code vulnerability rates (SonarQube/Pearce/Yan/Fu; Deloitte 1-in-5 governance maturity): Augment Code guide citing arXiv/IEEE/ACM sources.
- EU AI Act high-risk deferral Aug 2026 → Dec 2027 (Digital Omnibus, 7 May 2026, provisional/unenacted): Inside Privacy (Covington), Travers Smith, Decode the Future, Legiscope, CSA — multiple concurring.
- GitHub Copilot usage-based billing June 2026; Copilot enterprise governance (audit logs, MCP allowlists): Augment Code tools survey.
