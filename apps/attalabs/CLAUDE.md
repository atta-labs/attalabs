# AttaLabs — Hub Overview

This app is the AttaLabs hub, serving `attalabs.dev` for the AttaLabs dev/lab ecosystem. It is distinct from Atta, the deep-thinking AI consumer product composed of Vāda + Vitakka + Sati — Atta's own consumer surface (target domain `atta.ai`) has not yet been deployed. See the root CLAUDE.md products table for the full picture.

**Domain:** attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/attalabs-web` | Live |
| Mobile | `mobile/` | `@atta/attalabs-mobile` | Not yet implemented |

---

## Specifications

Specs live in `specs/` at this level (`apps/attalabs/specs/`):

- `attalabs-cms-identity.md`

---

## Shared chrome

The root layout renders **no footer**. The home page is a full-bleed scroll of four full-height sections with its own fixed topbar, and a footer bolted under the last one read as a stray band rather than as chrome. Products that want the shared `@atta/ui/footer` `Footer` still mount it in their own layout; this hub deliberately does not.

Theme and branding come from CMS via `getProductCms('attalabs')` — this hub renders its own CMS identity (`attalabsConfig`, `branding-attalabs`, central project `l5n0n8nn`) directly. It no longer borrows Atta's. See `.claude/skills/ui-cms-theme/SKILL.md`.

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
