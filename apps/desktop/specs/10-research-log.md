# 10 — Research Log (sources & findings)

**Status:** draft
The raw trail so every external finding is re-verifiable and nothing is lost. Grouped by topic. Dates reflect source recency at time of research (June 2026).

## Repo facts (daniboomerang/attalabs @ main)
- Workspaces: `apps/*/*`, `packages/*`, `tools/*` (Bun). Apps nested two levels (`apps/herald-ai/web` → `@atta/herald-ai-web`).
- Packages: `adapter-langgraph, atta-agents, auth, cms, crypto, db, engine, identity, models, storage, typescript-config, ui`.
- Engine seam: `LlmCallFn` (in `@atta/engine`); `createMultiVendorLlmCall` in `packages/adapter-langgraph/src/llm.ts` (anthropic / google-genai / openai-compat branches).
- Shell: `packages/ui/lib/next-web-shell.tsx` (renders `<html>`, `next/headers cookies()`, mounts `AuthProvider`/`LibraryProvider`/`CookieNameProvider`/`ToastProvider`).
- `packages/ui/lib/next-link.tsx` (Link abstraction). `next` is a **peer** dep of `@atta/ui`.
- UI libraries: `@atta/ui/libraries/{basic,retro,animate,brutal}/components`; `library-loader.ts` (static map of **string-literal** dynamic imports — bundler-safe); `library-provider.tsx` (client; `library` prop from `config.userInterface.library.id`).
- Auth: `@atta/auth` = `provider.tsx` (thin `ClerkProvider` wrapper), `middleware.ts` (`clerkMiddleware`), `hooks.ts` (server `auth()`), `api-key-auth.ts` (a 2nd auth mode already present), appearance files. Atta-family Clerk app `summary-ladybird-76`; Herald separate app `closing-blowfish-4`.
- AEG conventions (D-041): model in `aeg-root/` with `projects.md` registry, `iterations/`, `coordination.md`, `state-machine.md`; living state in `aeg-project/` with `decisions.md` etc.; AEG flow.

## Tauri + Next.js (runtime model)
- **Beadbox** (vercel/next.js discussion #90982, Mar 2026): Next 16 + App Router + RSC + server actions + WS, shipped as a **Tauri v2 Node sidecar** running `node server.js` (standalone); WebView→localhost; "web app doesn't know it's inside a native wrapper." Lessons: NEXT_PUBLIC baked at build (fix the port); **macOS GUI empty PATH** (spawn login shell); zombie children on force-quit; ~160MB (~84MB Node) < Electron ~200MB.
- Next discussion #80621: "Tauri doesn't support the Next.js server in production" directly, but a Node sidecar can run it; `bun build --compile` of standalone fails to resolve CommonJS deps; `@yao-pkg/pkg` binary fails at runtime (`/snapshot` chdir).
- Tauri docs: sidecar via `bundle.externalBin`; spawn from Rust/JS (`Command.sidecar`); "Node.js as a sidecar" guide (Jan 2026). Sidecar must be a **self-contained binary**. Shell plugin spawns arbitrary commands (the user's CLI) with `shell:allow-spawn`.
- Official Tauri Next guide defaults to **SSG/static export** (Model A).

## Next standalone in a monorepo
- Next docs (`output`): set `outputFileTracingRoot` to monorepo root or external deps aren't included; `outputFileTracingIncludes/Excludes` for missed/extra files.
- vercel/next.js #85099: standalone from a Turborepo needs `output:'standalone'` + correct `outputFileTracingRoot`; don't use a custom `require('next')` server.
- Nx field guide (Medium, Mar 2026) + HF Clapper runtime error + #33895: **`server.js` is nested** at `.next/standalone/<app-path>/server.js`; `.next/static` + `public/` not auto-copied.

## Bun + Next
- Bun docs: can run Next dev/prod (`bun --bun next start`).
- Bun #26244 (Jan 2026): `bun build --compile` of standalone fails (`react-server-dom-webpack/client`). Bun #14496 (Oct 2024): Bun crashes with standalone + middleware (next-auth).
- alexcloudstar (Mar 2026): safe path = `bun install` for packages, **node** for production runtime until validated; Bun best for plain API servers without native addons. (codeforreal: Claude Code ships as a Bun single-file executable — aspirational, not yet viable for Next.)

## Clerk on desktop
- `clerk-nextjs-tauri-example` (ryansteil-pl): uses `output:'export'` + Pages Router + client-only `ClerkProvider` with `allowedRedirectProtocols={['tauri:']}`. **README = a bug repro:** `pk_test` works in `tauri dev`; `pk_live` **fails** in `tauri build`.
- Clerk docs (native applications): native SDKs (iOS/Android/Expo) use token-in-`Authorization` header, not cookies. SDK `InstanceSetting.allowed_origins`: "for browser-like stacks such as browser extensions, **Electron**, or Capacitor.js... for Electron the default origin is `http://localhost:3000`."
- Clerk troubleshooting ("production keys in dev", May 2026): `pk_live` only works on the configured domain ("Production Keys are only allowed for domain ..."); **non-standard ports in the Origin header fail validation**; OAuth providers have their own redirect restrictions.
- Clerk deployment/production: `authorizedParties` allowlist on `clerkMiddleware`; a domain is required on the production instance (even for a Chrome-extension/native client with no web app); FAPI accepts any subdomain of the root by default.
- `Nipsuli/tauri-plugin-clerk` (listed in Clerk docs): patches global `fetch` through Tauri Rust HTTP to avoid the `origin_authorization_headers_conflict` (Clerk rejects requests with both `Origin` and `Authorization`).
- Clerk satellite domains: for multi-domain **web** SSO via CNAME — not needed for a native client.

## Signing / distribution / updates (Tauri v2, 2026)
- Tauri macOS/Linux bundle docs: GUI apps don't inherit `$PATH` from dotfiles → **`fix-path-env-rs`** crate (`fix_path_env::fix()` in `main.rs`). JS equiv: `shell-path`/`fix-path`. Tauri #4788: shell `Command` works in dev, fails post-build with os error 2 (the PATH issue).
- macOS: Gatekeeper requires sign+notarize (mandatory); Apple Dev Program + Developer ID Application cert; Tauri auto-notarizes via env (Apple ID + app-specific password, or App Store Connect API key); ~2–5 min/build; shell-out entitlements `allow-unsigned-executable-memory` + `disable-library-validation`.
- Windows: signing optional-to-run but avoids SmartScreen / enables Store; **Azure Trusted Signing** (cloud, no dongle); OV/EV certs.
- CI: GitHub Actions matrix (`windows-latest`, `macos-latest` Intel+ARM, `ubuntu-latest`) builds+signs each platform on its own runner → **no Windows machine needed** (e.g. Fortuna).
- Tauri updater plugin: `latest.json` endpoint (GitHub Releases / CrabNebula / own server); **separate signing keypair** (`tauri signer generate` → `TAURI_SIGNING_PRIVATE_KEY`); `createUpdaterArtifacts:true`; verifies signature, replaces binary, restarts; Windows can't replace a running binary. Full pipeline ≈ 11 GitHub secrets. Reference: dchuk/claude-code-tauri-skills `tauri-code-signing` skill.

## Pupila (FranRom/pupila, MIT)
- README + `filters.ts` (scoring + `_signals`) + `mcp/server.ts` (factory + register-per-tool + Zod + `safeHandler`) + `types.ts` read. Local-first: ~13 sources, config-driven weighted scoring, local CLI for AI layers, launchd/cron, Vite UI, 17-tool MCP. Portability ≈ 65% clean / 20% adapt / 15% discard. `ai-review-parse.ts` = tolerant CLI-output parser (reference for the desktop CLI transport's prompt-and-parse).
