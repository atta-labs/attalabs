# Vinaya Web

Next.js web app for Vinaya — landing page and Known Limits page. No Sanity project of its own yet: layout borrows Atta's config/branding/theme (`getAttaConfig`/`getAttaBranding` via `createProductClient('atta')`), the same precedent `apps/aeg/web/studio` uses. See [vinaya-spec.md](../specs/vinaya-spec.md).

The `/studio` subtree (`src/app/studio/**`, `src/app/api/coherence/route.ts`) is Vinaya Studio's dashboard, ported from `apps/aeg/web/studio`. It reads governance state via the same `aeg-fs`/`forge` derivation layers (`src/lib/aeg-fs/`, `src/lib/forge/`) that `apps/aeg/web/studio` uses — no governance logic is re-implemented here.

`/studio/docs` mirrors AEG Studio's own methodology-doc browser (`src/lib/docs/load-aeg-docs.ts`, full nested `aeg-root/**.md` tree) — distinct from the deferred, not-yet-built `/docs` CLI reference. Nav is two-tier: root `layout.tsx` only wires `NextWebShell` (theme/shell, no TopBar of its own); a `(site)` route group (Home, Known Limits, AEG) carries the site TopBar; `src/app/studio/layout.tsx` carries its own TopBar (logo "Vinaya Studio", links Projects/Iterations/Backlog/Docs) with no left sidebar, mirroring `apps/aeg/web/studio`'s TopBar-only chrome.

## Related

- [Vinaya Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
