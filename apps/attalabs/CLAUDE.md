# AttaLabs — Hub Overview

This app is the AttaLabs hub, serving `attalabs.dev` for the AttaLabs dev/lab ecosystem. It is distinct from Atta, the deep-thinking AI consumer product composed of Vāda + Vitakka + Sati — Atta's own consumer surface (target domain `atta.ai`) has not yet been deployed. See the root CLAUDE.md products table for the full picture.

**Domain:** atta.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/attalabs-web` | Live |
| Mobile | `mobile/` | `@atta/attalabs-mobile` | Not yet implemented |

---

## Specifications

Specs live in `specs/` at this level (`apps/attalabs/specs/`):

- `atta-build-strategy.md`
- `atta-ecosystem-vision.md`
- `atta-finetuning-research.md`
- `atta-market-research.md`
- `atta-naming-decision.md`
- `cetana-reality-check.md`

---

## Shared chrome

The root layout renders the shared `@atta/ui/footer` `Footer` component — no product-specific footer content beyond `product`/`tagline` props. See `.claude/skills/ui-components/SKILL.md` for the component itself.

Theme and branding come from CMS via `getProductCms('attalabs')` — this hub renders its own CMS identity (`attalabsConfig`, `branding-attalabs`, central project `l5n0n8nn`) directly. It no longer borrows Atta's. See `.claude/skills/ui-cms-theme/SKILL.md`.

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
