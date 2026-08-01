# AttaLabs — CMS identity

Status: ratified

attalabs resolves its own CMS identity directly: `PROJECT_IDS.attalabs` (`l5n0n8nn`), `attalabsConfig`, and `branding-attalabs`. It no longer borrows Atta's — `apps/attalabs/web/src/app/layout.tsx` calls `getProductCms('attalabs')`, and `apps/attalabs/web/next.config.ts` calls `generateUIIndex('attalabs')`.

This is the same generic, key-based CMS pattern every product uses (`getProductCms(key)` / `getProductConfig(key)` / `getProductBranding(key)`, `key: ProductKey`) — see `.claude/skills/ui-cms-theme/SKILL.md`. Nothing product-specific was added; attalabs simply passes its own key instead of borrowing another product's.

The visible consequence: attalabs renders the `library-retro` / `theme-obsidian-retro` dark theme, resolved from its own `attalabsConfig` singleton in the central `attalabs` Sanity project — not Atta's look.
