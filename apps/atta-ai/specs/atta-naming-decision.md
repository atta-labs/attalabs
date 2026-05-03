# Atta Naming Decision

**Date:** April 26, 2026 (original) — May 3, 2026 (lab vs product domain distinction added)
**Status:** Locked. AttaLabs domain bought. Final product domain TBD.

---

## What's locked

### Brand architecture (clarified May 3, 2026)

**Atta** = the ecosystem (parent organization, monorepo, code namespace `@atta/*`).

**AttaLabs** = the *lab* where Atta builds publicly. Permanent home at `attalabs.dev`. This is where Vāda lives now, where each component ships as it's built, where research and experimentation are visible to friends and early users. AttaLabs is **not** the consumer product. It is the public-facing development surface.

**The final product** = lives at its own home, separate from the lab. Target: `atta.ai` if/when the current Japanese owner releases it (possibly 2027). Fallback: `atalabs.app` or another consumer-grade domain. Decided when the consumer product is ready to ship — not before.

This is a sharper distinction than earlier framings. Earlier: AttaLabs was both lab and product home. Now: AttaLabs is permanently the lab. The polished consumer product gets its own name discipline when the time comes.

### Products

- **Vāda** — deliberation engine (Pāli: debate/discourse)
- **Vitakka** — situated cognition layer with artifacts, MCPs, focus continuity (Pāli: directed thought)
- **Sati** — cross-focus memory (Pāli: mindfulness, recollection)
- **Cetana** — deliberation-guided execution (Pāli: volition, intention)
- **Herald** — pluggable MCP tool (English; signals "plugs in")

Naming rule preserved: Pāli name = built by Atta. No Pāli name = it plugs in.

### Domain architecture

```
attalabs.dev                → AttaLabs lab. Engine tools, engine-as-MCP, ecosystem hub.
vada.attalabs.dev           → Vāda (live)
vitakka.attalabs.dev        → Vitakka (when shipped)
sati.attalabs.dev           → Sati (when shipped)
account.attalabs.dev        → billing / auth / API hub
cetana.attalabs.dev         → Cetana (when shipped)

[final-product-domain]      → the composed Atta consumer product. Decided when ready.
                              Candidates: atta.ai, atalabs.app, others.

Local development:
attalabs.test               → ecosystem hub
*.attalabs.test             → product subdomains (reserved TLD, no HTTPS enforcement)
```

The composed Atta consumer product will eventually move to its own domain. AttaLabs subdomains continue to host the *components* as research artifacts and the *lab* of ongoing work. Subdomain → final-product migration happens via 301 redirects when ready, similar to how the eventual `atta.ai` migration was originally planned.

### Authentication architecture

- **One Clerk application** for the entire ecosystem (named "Atta" in Clerk dashboard)
- Cookie scoped to `.attalabs.dev` — propagates across all subdomains
- Sign in once on any subdomain → signed in everywhere (Google's model)
- **One shared `users` table** in `@atta/db`, keyed by `clerk_id`
- Per-product profile rows reference `clerk_id` as foreign key

When the consumer product moves to its own domain, the Clerk app extends cookie scope. Single sign-in remains. The lab and product share auth.

### Code namespace

The code namespace **stays `@atta/*`**. Package names do not change.

- `@atta/engine`
- `@atta/auth`
- `@atta/db`
- `@atta/ui`
- `@atta/cms`
- etc.

AttaLabs is the public lab URL. The consumer product gets its own URL. Neither changes the codebase. The ecosystem name in code, conversation, and brand identity is Atta.

---

## Why this shape

### Why Atta stays as the ecosystem name

The Principal has strong, sustained brand attachment to "Atta" (Pāli for "self") because the ecosystem's thesis is creating and preserving the user's self across AI providers. Reviewers across multiple rounds confirmed founder brand attachment is a hard constraint, not noise to optimize against.

### Why "AttaLabs" for the lab

Bare `atta.{premium-tld}` was unavailable when the domain was bought (April 2026):
- `atta.com` — €500K, owned by a domain investor
- `atta.ai` — owned by a Japanese individual, may free in 2027
- `atta.io`, `atta.net` — taken

"Labs" places "Atta" in a corporate container without fusing it with another concept-word. The Pāli root stays clean. And — clarified in round 4 — *Labs* is honest: the public surface of AttaLabs *is* a lab. Components ship there as they're built. Friends try them. Research happens visibly. Calling it "Labs" matches what it actually is.

### Why a separate domain for the final product

This is the clarification of May 3, 2026.

The consumer product — the composed Atta with Vāda, Vitakka, Sati, Cetana working as one — is qualitatively different from "the AttaLabs lab where Vāda is live and other components are coming." A user installing the consumer product expects polish, completeness, and a coherent experience. A user visiting AttaLabs expects to see a lab — components in different states of development, transparent about what works and what doesn't.

Conflating the two confuses both audiences:
- Lab visitors expect rough edges; the consumer product can't have them
- Product users expect completeness; the lab can't deliver it

Separating the domains separates the audiences. AttaLabs stays permanently as the lab. The consumer product gets a polished, separate home when ready.

### Why memory product renamed to Sati (April 2026)

The previous arrangement had "Atta" naming both the ecosystem and the memory-layer product. That created persistent ambiguity. Sati (Pāli for memory/mindfulness/recollection) is more accurate for what the product actually does. The rename freed Atta to refer unambiguously to the ecosystem.

### Why subdomains for the lab, not paths

- Each product is its own Next.js app with independent deployment
- Subdomain SSO via cookie scope works cleanly with Clerk
- `vada.attalabs.dev` reads as a product; `attalabs.dev/vada` reads as a page
- Future migration to a final-product domain is a clean 1-to-1 mapping per component (or absorbed into the consumer product)

### Why `.dev` for AttaLabs

- Google-run, HTTPS-required → trust signals
- Matches "Labs" register (R&D / experimentation)
- Strong with the current target audience (developers using Vāda via MCP)
- No "single app" framing concern that `.app` carries

The consumer product domain may use `.app` deliberately — *it is* a single app from the user's perspective. That's the right register for the consumer product, the wrong one for the lab.

### Why no "AI" in the name

- Anthropic, Mistral, Cohere, Perplexity, Hugging Face, Replicate — none have "AI" in their names
- "AI" in company names in 2026 reads as late-cycle / hype-driven
- Product names (Vāda, Vitakka, Sati) signal AI clearly without the parent doing it
- Future-proofs the brand if scope expands

---

## The consumer product domain decision (deferred)

When the composed Atta is ready to ship as a consumer product (estimated 2027 based on current sequencing), the domain decision activates. Candidates:

**`atta.ai`** — first preference. Pure Pāli root. Watch for Japanese owner releasing in 2027 (signaled possibility, not confirmed). If available at reasonable cost, acquire and migrate.

**`atalabs.app`** — fallback. "Labs" register acknowledges the AttaLabs lineage; `.app` register fits the consumer product. Less elegant than `atta.ai` but defensible.

**Other options** — `atta.io` or `atta.net` if owners ever sell, alternative spellings, or coined names. All inferior to the first two.

The decision activates when the consumer product is ready, not before. Premature domain commitment is wasted optionality. AttaLabs as the lab is enough until then.

### Migration plan (when activated)

When the consumer product domain is chosen:
- Clerk cookie scope extends to the new domain
- 301 redirects from relevant `attalabs.dev` paths to the consumer product
- AttaLabs continues to host components and lab work
- Consumer product is the polished surface; AttaLabs is the development surface
- Marketing tells a unified story: *AttaLabs is where it's built. [Consumer domain] is where it ships.*

---

## What's authoritative

- **Code namespace:** `@atta/*` (immutable)
- **Lab domain:** `attalabs.dev` (permanent)
- **Consumer product domain:** TBD when ready (do not commit prematurely)
- **Naming rule:** Pāli for built-by-Atta, English for plugs-in (immutable)
- **Brand:** Atta (ecosystem), not AttaLabs (lab) and not the consumer product domain (when chosen)
