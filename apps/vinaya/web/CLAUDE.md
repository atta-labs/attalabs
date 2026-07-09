# Vinaya Web

Next.js web app for Vinaya — landing page and Known Limits page. No Sanity project of its own yet: layout borrows Atta's config/branding/theme (`getAttaConfig`/`getAttaBranding` via `createProductClient('atta')`), the same precedent `apps/aeg/web/studio` uses. See [vinaya-spec.md](../specs/vinaya-spec.md).

The `/studio` subtree (`src/app/studio/**`, `src/app/api/coherence/route.ts`) is Vinaya Studio's dashboard, ported from `apps/aeg/web/studio`. It reads governance state via the same `aeg-fs`/`forge` derivation layers (`src/lib/aeg-fs/`, `src/lib/forge/`) that `apps/aeg/web/studio` uses — no governance logic is re-implemented here.

## Related

- [Vinaya Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
