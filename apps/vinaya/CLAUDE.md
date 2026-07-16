# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx vinaya init` (coming soon). "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Landing + Known Limits pages live; Studio dashboard live locally at `/studio` (redirects to the `/the-studio` Portal page in production, D-126); methodology-doc browser at `/studio/docs`; site-wide TopBar on every route |
| CLI | `cli/` | `@atta/vinaya-cli` | Skeleton only — `vinaya help`/`version` router, hierarchical config loader, versioned `--json` envelope (`vinaya-cli-v1` task 1, #381). Real command logic (`init`, `check`, `doctor`, forge writes) not yet implemented. |

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
