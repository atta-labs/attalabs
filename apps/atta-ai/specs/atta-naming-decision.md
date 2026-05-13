# Atta Naming Decision

**Date:** April 26, 2026 (original) — May 3, 2026 (lab vs product distinction added) — May 12, 2026 (two-ecosystem clarification, AI-suffix decision, naming rule demoted)
**Status:** Locked. AttaLabs domain owned. Atta product domain TBD (atta.ai preferred, not owned).

---

## What's locked

### Two ecosystems at different scales (clarified May 12, 2026)

There are **two** ecosystems in this story, at different scales, and conflating them is the source of most confusion:

**AttaLabs is the dev/lab ecosystem.** Permanent home at `attalabs.dev`. Where Dani builds AI products. Multiple products live here — some related to Atta, some not. The Atta Engine may be opened up over time. More products may appear. AttaLabs is the umbrella.

**Atta is one product within AttaLabs** — and is itself an ecosystem at a smaller scale (an internal composition of Vāda + Vitakka + Sati). When the products inside Atta compose, the result is the deep-thinking AI experience that is Atta-the-product.

In short:
- **AttaLabs ecosystem** = the dev lab containing many products
- **Atta ecosystem** = the internal composition (Vāda + Vitakka + Sati) that makes up Atta-the-product

When `atta-ecosystem-vision.md` says "ecosystem," it means the second (the Atta-internal composition). When other docs say "AttaLabs ecosystem" or reference the dev surface, they mean the first.

### Brand architecture

- **AttaLabs** = the dev/lab ecosystem. Permanent home at `attalabs.dev`. Multiple products live here; some are built by the Atta team (Vāda, Vitakka, Cetana, the Atta Engine), some plug in (Herald today; possibly others later).
- **Atta** = a product within AttaLabs. The deep-thinking AI composed of Vāda + Vitakka + Sati. Code namespace `@atta/*` (immutable; the monorepo's name, not a brand). Target consumer domain: `atta.ai` if available, fallback options preserved.
- **The Atta Engine** = the agent-flow execution infrastructure that powers Vāda today and will power Vitakka and Atta. Lives in AttaLabs. May be opened up later. Possibly a future public product surface; not committed.

### Products in the AttaLabs ecosystem

| Product | What it is | Domain (today) | Domain (future) |
|---|---|---|---|
| **Atta** | The deep-thinking AI. Composed of Vāda + Vitakka + Sati. *Not yet deployed.* | (none) | `atta.ai` if available, `atalabs.app` or other if not |
| **Vāda** | Standalone deliberation engine. Also the deliberation layer inside Atta. | `vada.attalabs.dev` | `vada.attalabs.dev` (permanent) |
| **Vitakka** | Standalone focused-thinking product. Also the focus/situated-cognition layer inside Atta. *Not yet built.* | (none) | `vitakka.attalabs.dev` (permanent) |
| **Sati** | The memory layer inside Atta. Scope (standalone surface vs internal-only) TBD; composes with Vitakka to produce Atta-the-experience. | (none) | TBD |
| **Herald** | Standalone forensic CV/JD match tool. Not part of Atta. | (in development) | `herald.attalabs.dev` (permanent) |
| **Cetana** | Internal dev tooling for the Atta team — local Mac orchestration. Built by the Atta team. Not part of Atta. Future public product surface conditional on V0/V0.5 proving daily-driver value. | (internal use only today) | `cetana.attalabs.dev` (conditional, future) |

### Naming convention — no `-AI` suffix on any product brand

**Locked May 12, 2026.** All product brands are bare: **Atta, Vāda, Vitakka, Sati, Herald, Cetana**. Never `AttaAI`, `VadaAI`, `HeraldAI`, `CetanaAI`.

Reasoning (consolidated from three rounds of multi-reviewer pressure-testing):
- `-AI` suffixes read as 2023-era and dated; signal lack of brand confidence
- Adding `-AI` to clean Pāli words dilutes a distinctive, ownable name
- Adding `-AI` to "Atta" specifically would weaken the moat thesis ("Atta sounds like a system; AttaAI sounds like an app")
- A mid-life rebrand from `AttaAI` → `Atta` when `atta.ai` lands would create SEO fragmentation and user confusion. Pick one and commit.
- The "indie founder needs the suffix because there's no other AI signal" concern is real but solvable cheaply with page content (every product hero leads with what the product does in AI terms) and site metadata (link previews show AI category in `<title>` and OpenGraph tags), without paying the permanent cost of suffixed brands.

The risk this strategy accepts: cold link previews on `.dev` subdomains carry less AI context than a `.ai` TLD would. Mitigated by site metadata: a user pasting `vada.attalabs.dev` into Slack sees "Vāda — AI deliberation engine | AttaLabs" in the preview, not just "Vāda."

### Naming aesthetic — Pāli is preferred inside Atta, elective elsewhere

The earlier rule **"Pāli name = built by Atta"** was structural in v1. In v2 (May 12, 2026), it is **demoted to a naming aesthetic**:

- **Inside Atta**: Pāli names are mandatory. Atta, Vāda, Vitakka, Sati are all Pāli. If a future Atta-internal capacity emerges, it should be Pāli.
- **Inside AttaLabs more broadly**: Pāli is common but elective. Cetana has a Pāli name because the founder preferred it; that does not make it part of Atta. Herald has an English name because it fits the product's character. Future AttaLabs products may go either way.

This means Pāli is no longer a *signal of ownership* (Cetana is Pāli but not part of Atta; Herald is non-Pāli but is built by Dani). Pāli is a *naming preference* the founder may exercise as products call for it.

### Domain architecture

```
attalabs.dev                → AttaLabs ecosystem hub. Engine info, product directory.
vada.attalabs.dev           → Vāda (live)
vitakka.attalabs.dev        → Vitakka (when built)
herald.attalabs.dev         → Herald (when deployed)
cetana.attalabs.dev         → Cetana (conditional, future)

[atta-product-domain]       → Atta the consumer product. Decided when ready.
                              Candidates: atta.ai (preferred, owned by a Japanese
                              individual, may free 2027), atalabs.app, others.

Local development:
attalabs.test               → AttaLabs hub
*.attalabs.test             → product subdomains (reserved TLD, no HTTPS enforcement)
```

The Atta consumer product will eventually move to its own domain. AttaLabs subdomains continue to host the *standalone* products (Vāda, Vitakka, Herald, future Cetana) as their permanent homes. Vāda and Vitakka have two surfaces permanently: standalone at `*.attalabs.dev` *and* as composed layers inside Atta at the Atta product domain.

### Authentication architecture

- **One Clerk application** for the entire AttaLabs ecosystem (named "Atta" in Clerk dashboard)
- Cookie scoped to `.attalabs.dev` — propagates across all subdomains
- Sign in once on any subdomain → signed in everywhere (Google's model)
- **One shared `users` table** in `@atta/db`, keyed by `clerk_id`
- Per-product profile rows reference `clerk_id` as foreign key

When Atta moves to its own domain, the Clerk app extends cookie scope. Single sign-in remains.

### Code namespace

The code namespace **stays `@atta/*`**. Package names do not change.

- `@atta/engine`
- `@atta/auth`
- `@atta/db`
- `@atta/ui`
- `@atta/cms`
- etc.

`@atta/*` is the monorepo's name, not a brand. Code for any AttaLabs product can live under it without implying ownership by Atta-the-product. Herald and Cetana code lives in `@atta/*` packages without conflict — it's code in the Atta monorepo, not a product of Atta.

---

## Why this shape

### Why Atta is the product (not the umbrella)

The Principal has strong, sustained brand attachment to "Atta" (Pāli for "self") because the ecosystem's thesis is creating and preserving the user's self across AI providers. The founder fights for `atta.ai` specifically as Atta's destination. Treating "Atta" as merely a code namespace, or as the parent ecosystem, gave away the brand the founder is actually building.

The corrected framing: Atta is one product (the deep-thinking AI) within a broader dev lab (AttaLabs). The dev lab has its own ecosystem character (multi-product, possibly open source, possibly evolving). The deep-thinking AI has its own internal composition (Vāda + Vitakka + Sati). Both can be called "ecosystems" without contradiction — they're at different scales.

### Why "AttaLabs" for the dev lab

Bare `atta.{premium-tld}` was unavailable when the domain was bought (April 2026). "Labs" is honest: the public surface of AttaLabs *is* a lab. Multiple products ship there as they're built. Some are by the Atta team, some plug in. Friends try things. Research happens visibly. Calling it "Labs" matches what it actually is.

The "Labs" framing is also externally durable — even when Atta-the-product ships to its own domain, AttaLabs remains the lab where it (and other products) was built. AttaLabs does not retire when Atta moves out.

### Why a separate domain for the Atta consumer product

This is the clarification of May 3, 2026 (preserved through May 12).

The Atta consumer product — the composed deep-thinking experience with Vāda + Vitakka + Sati working as one — is qualitatively different from "the AttaLabs lab where Vāda is live and other components are coming." A user installing Atta expects polish, completeness, and a coherent experience. A user visiting AttaLabs expects to see a lab — components in different states of development, transparent about what works and what doesn't.

Conflating the two confuses both audiences:
- Lab visitors expect rough edges; the consumer product can't have them
- Product users expect completeness; the lab can't deliver it

Separating the domains separates the audiences. AttaLabs stays permanently as the lab. Atta the consumer product gets a polished, separate home when ready.

### Why two surfaces for Vāda and Vitakka

Vāda and Vitakka each live permanently in two places:
1. **Their own subdomain at AttaLabs** — for users who want only that capacity. Vāda for developers integrating deliberation via MCP, BYOK power users, agent-flow builders. Vitakka for users who want focused-thinking sessions without the full Atta composition.
2. **Inside Atta** — as foundational layers of the composed product. With Sati's memory continuity, they become the deep-thinking AI experience.

Each standalone product is a public proof point for one capacity of Atta. Users who only want one capacity get a clean entry. Users who want the integrated experience get Atta.

Cross-reference asymmetry:
- Vāda's page proudly references Atta: *"the deliberation engine behind Atta."*
- Vitakka's page proudly references Atta: *"the focus layer also inside Atta."*
- Atta's page references Vāda and Vitakka **sparingly** — by capacity, not by implementation. The user inside Atta should feel they have a thinking partner, not feel they are operating an orchestration engine.

### Why Cetana is not part of Atta

Cetana is internal dev tooling for the Atta team — local Mac orchestration for dispatching Claude Code agents into git worktrees, watching them work, and unblocking them on escalation (see `apps/cetana-ai/specs/cetana-spec.md`). Today it is internal-use-only. Tomorrow, if V0 + V0.5 prove daily-driver value, it ships as a public product surface at `cetana.attalabs.dev`.

Cetana's Pāli name historically reflected the rule "Pāli = built by Atta." With that rule demoted (May 12, 2026), Cetana keeps its Pāli name as the founder's preference — but it is not part of Atta-the-product. Cetana is a sibling product in AttaLabs.

### Why Herald is what it is

Herald is a forensic CV-to-job-description match tool. Standalone product in AttaLabs at `herald.attalabs.dev` when deployed. English name — chosen because it fits the product's character (announcer of forensic truth about CVs). Under the v1 rule, Herald was "non-Pāli = plugs in." Under v2's demoted rule, Herald is simply a non-Pāli product, no structural meaning.

Herald is **built by Dani**. It is not "plugs in from elsewhere" in any meaningful sense — that v1 framing was confused. Herald is an AttaLabs product, sibling to Atta, Vāda, Vitakka, and Cetana.

### Why subdomains for AttaLabs products, not paths

- Each product is its own Next.js app with independent deployment
- Subdomain SSO via cookie scope works cleanly with Clerk
- `vada.attalabs.dev` reads as a product; `attalabs.dev/vada` reads as a page
- Each product can evolve independently without colliding

### Why `.dev` for AttaLabs

- Google-run, HTTPS-required → trust signals
- Matches "Labs" register (R&D / experimentation)
- Strong with the current target audience (developers using Vāda via MCP, future Cetana users, anyone touching the engine)

The Atta consumer product domain may use `.app` deliberately when chosen — *it is* a single app from the user's perspective. That's the right register for the consumer product, the wrong one for the lab.

### Why no "AI" suffix anywhere

- The leading AI brands (Anthropic, Mistral, Cohere, Perplexity, Hugging Face, Replicate, Cursor, Linear, Granola, Lovable, v0) — none have "AI" in their names
- Indie-stage AI brands without `.ai` TLDs (Lovable on `.dev`, v0 historically on `.dev`) carry the signal via page content, not name
- Page content and site metadata carry the AI category signal more durably than a suffix
- Mid-life rebrands (`VadaAI` → `Vāda` when moving to a hypothetical `.ai`) are expensive and confusing; better to commit to clean names from day one

---

## The Atta product domain decision (deferred)

When the composed Atta consumer product is ready to ship (estimated 2027 based on current sequencing), the domain decision activates. Candidates:

**`atta.ai`** — first preference, will fight for it. Pure Pāli root. Currently owned by a Japanese individual; signaled possibility of release in 2027 but not confirmed. If available at reasonable cost, acquire and migrate.

**`atalabs.app`** — fallback. "Labs" register acknowledges the AttaLabs lineage; `.app` register fits the consumer product. Less elegant than `atta.ai` but defensible.

**Other options** — `atta.io` or `atta.net` if owners ever sell, alternative spellings, or coined names. All inferior to the first two.

The decision activates when the consumer product is ready, not before. Premature domain commitment is wasted optionality. AttaLabs as the lab is enough until then.

### Migration plan (when activated)

When the Atta domain is chosen:
- Clerk cookie scope extends to the new domain
- 301 redirects from any relevant `attalabs.dev` paths to the Atta domain
- AttaLabs continues to host the standalone products (Vāda, Vitakka, Herald, Cetana)
- Atta is the polished surface; AttaLabs is the lab surface
- Marketing tells a unified story: *AttaLabs is where it's built. [Atta domain] is where Atta ships.*
- Standard pattern: Notion's `notion.so → notion.com` migration. Communicate to users 30 days in advance; redirect for 12+ months after.

---

## What's authoritative

- **Code namespace:** `@atta/*` (immutable)
- **Lab domain:** `attalabs.dev` (permanent)
- **Atta product domain:** TBD when ready (`atta.ai` preferred, not committed because not owned)
- **AI suffix:** Not used on any product brand (locked May 12, 2026)
- **Pāli naming:** Mandatory inside Atta; elective elsewhere in AttaLabs (demoted from structural to aesthetic May 12, 2026)
- **Atta as flagship product:** Yes, not an ecosystem-only namespace (locked May 12, 2026)
- **Vāda/Vitakka dual-surface:** Standalone at AttaLabs *and* composed into Atta (permanent)
- **Sati:** Memory layer inside Atta; standalone surface deferred (scope TBD)
- **Cetana:** Internal dev tooling today; conditional future public product
- **Herald:** Standalone AttaLabs product (no longer "plugs in" — that framing retired)
