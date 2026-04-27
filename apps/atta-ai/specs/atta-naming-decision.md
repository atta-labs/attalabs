# Atta Naming Decision

**Date:** April 26, 2026
**Status:** Locked. Domain bought.

---

## What's locked

- **Atta** = the ecosystem (parent organization, monorepo, code namespace)
- **AttaLabs** = the public brand wrapper used only for the domain
- **`attalabs.dev`** = the domain
- **No product is named Atta** — Atta refers unambiguously to the ecosystem

## Products

- **Vāda** — deliberation engine (Pāli: debate/discourse)
- **Vitakka** — personal AI thinking partner with longitudinal memory (Pāli: directed thought)
- **Sati** — memory layer / cross-provider persistent self (Pāli: mindfulness, recollection, memory) — renamed from the previous "Atta-the-product"
- **Herald** — pluggable MCP tool (English; signals "plugs in" per the naming rule)

Naming rule preserved: Pāli name = built by Atta. No Pāli name = it plugs in.

## Domain architecture

```
attalabs.dev                → ecosystem hub, engine tools, engine-as-MCP
vada.attalabs.dev           → Vāda
vitakka.attalabs.dev        → Vitakka
sati.attalabs.dev           → Sati
account.attalabs.dev        → billing / auth / API hub

Local development:
attalabs.test               → ecosystem hub
*.attalabs.test             → product subdomains (reserved TLD, no HTTPS enforcement)
```

## Authentication architecture

- **One Clerk application** for the entire ecosystem (named "Atta" in Clerk dashboard)
- Cookie scoped to `.attalabs.dev` — propagates across all subdomains
- Sign in once on any subdomain → signed in everywhere (Google's model)
- **One shared `users` table** in `@atta/db`, keyed by `clerk_id`
- Per-product profile rows reference `clerk_id` as foreign key

This replaces the previous "each product has its own Clerk application" model documented in older versions of `skill-auth.md`.

## Code namespace

The code namespace **stays `@atta/*`**. Package names do not change.

- `@atta/engine`
- `@atta/auth`
- `@atta/db`
- `@atta/ui`
- `@atta/cms`
- etc.

AttaLabs is only the public domain wrapper. The ecosystem name in code, conversation, and brand identity is Atta. There is no rename in the codebase.

## Why this shape

### Why "Atta" stays as the ecosystem name

The founder has strong, sustained brand attachment to "Atta" (Pāli for "self") because the ecosystem's thesis is creating/preserving the user's self across AI providers. Reviewers across multiple rounds confirmed that founder brand love is a hard constraint, not noise to optimize against.

### Why "AttaLabs" for the domain

Bare `atta.{premium-tld}` is unavailable:
- `atta.com` — €500K, owned by a domain investor
- `atta.ai` — owned by a Japanese individual, may free up in 2027
- `atta.io`, `atta.net` — taken

"Labs" is an administrative wrapper that places "Atta" in a corporate container without fusing it with another concept-word (unlike "AttaWise" or "AttaCore"). The Pāli root stays clean.

### Why memory product renamed to Sati

The previous arrangement had "Atta" naming both the ecosystem and the memory-layer product. This created persistent ambiguity ("which Atta?") that surfaced in the session start protocol every time. A parent that contains itself is a category error.

Sati is the Pāli word for memory/mindfulness/recollection — a more accurate name for a memory layer than Atta was. Sati is also already in Western vocabulary (via mindfulness culture), which aids recognition without baggage for the target audience.

### Why subdomains, not paths

- Each product is its own Next.js app — independent deployment
- Subdomain SSO via cookie scope works cleanly with Clerk
- `vada.attalabs.dev` reads as a product; `attalabs.dev/vada` reads as a page
- Future migration to `atta.ai` (if/when available) is a clean 1-to-1 mapping

### Why `.dev`

Endorsed by all reviewers in round 4:
- Google-run, HTTPS-required → trust signals
- Matches "Labs" register (R&D / experimentation)
- Strong with the current target audience (developers using Vāda via MCP)
- No "single app" framing concern that `.app` carries
- Migration to `atta.ai` later is TLD-independent in cost

### Why no "AI" in the name

- Anthropic, Mistral, Cohere, Perplexity, Hugging Face, Replicate — none have "AI" in their names
- "AI" in company names in 2026 reads as late-cycle / hype-driven
- Product names (Vāda, Vitakka, Sati) signal AI clearly without the parent doing it
- Future-proofs the brand if scope expands

## Future considerations

- **`atta.ai` watch:** monitor for availability in 2027. If it becomes available at a reasonable price, migrate from `attalabs.dev` → `atta.ai`. Migration is straightforward: update Clerk cookie domain, set up 301 redirects from `*.attalabs.dev` to `*.atta.ai`. The brand stays Atta either way; only the URL changes.
- **Defensive registrations:** `attalabs.co` and `atalabs.dev` (typo defense) deferred until traffic justifies the cost.

## What changed in project docs

- `memory_user_edits` updated April 26, 2026 to reflect new state
- `skill-auth.md` rewritten to describe single-Clerk-app architecture
- `skill-monorepo-structure.md` updated to reference Sati and account hub
- Session start protocol updated: products are now Vāda, Vitakka, Sati, Herald, or general Atta ecosystem work

Older docs (vada-state.md, vada-product-spec.md, vada-decisions.md, etc.) are intentionally left untouched until next time they are edited; they will be brought into alignment opportunistically.
