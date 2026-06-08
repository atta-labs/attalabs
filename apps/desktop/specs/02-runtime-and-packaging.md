# 02 — Runtime & Packaging

**Status:** draft
This is the heart of Model B feasibility. Everything here is evidenced in `10-research-log.md`.

## The proof point

A production app (**Beadbox**, Vercel discussion #90982, Mar 2026) runs **Next.js 16 + App Router + server components + server actions + a WebSocket server** by **bundling Node as a Tauri v2 sidecar**: Rust spawns `node server.js` (Next `standalone` output), finds ports, points the WebView at localhost — and "the web app doesn't know it's inside a native wrapper." That is our exact stack and our exact hard requirement, shipped.

## The mechanism

1. Build each app with **`output: 'standalone'`** → Next traces a minimal `server.js` + only the used `node_modules` into `.next/standalone`.
2. Tauri bundles a Node runtime + the standalone tree as a **sidecar** (`bundle.externalBin` in `tauri.conf.json`), and spawns it on launch.
3. WebView → `http://localhost:<fixed-port>`. The full server-side Next app runs locally.

## Monorepo standalone — four concrete gotchas

The app is a Turborepo workspace; standalone must bundle `@atta/*` workspace packages.

1. **`outputFileTracingRoot` must point at the monorepo root.** Without it, Next traces only the app dir and **fails to copy `@atta/*` deps**. Set it to the repo root (`path.join(__dirname, '../../../..')` from `apps/<app>/web`).
2. **🔴 `server.js` is NOT at `.next/standalone/server.js`.** With root tracing it **mirrors the app's workspace path** → e.g. `.next/standalone/apps/herald-ai/web/server.js`. The sidecar's spawn command must target that nested path. Verify with `find . -path "*/.next/standalone/*/server.js"`. (This silently breaks naive setups.)
3. **`.next/static` and `public/` are NOT auto-copied** into standalone. The build step must copy them into the nested location; `server.js` then serves them. *This also covers the dynamic UI-library chunks (see below).*
4. **`transpilePackages` must list every `@atta/*`** consumed (Herald already does). Native/Node-only deps (Neon driver in `@atta/db`, `@atta/crypto`) may need `serverExternalPackages`.

Also: do **not** use a custom server that `require('next')` — use the generated `server.js`, or standalone is bypassed.

## The dynamic UI library system — LOW risk (verified)

`@atta/ui/lib/library-loader.ts` uses a **static map of string-literal dynamic imports**:
```ts
const LIBRARY_IMPORTERS = {
  basic:   () => import('../libraries/basic/components'),
  animate: () => import('../libraries/animate/components'),
  retro:   () => import('../libraries/retro/components'),
  brutal:  () => import('../libraries/brutal/components'),
}
```
The runtime variable only *selects which importer to call*; every `import()` has a **literal** path. Webpack/Turbopack statically analyze literal `import()` calls → four async chunks built and traced. (The dangerous pattern would be a computed path like `` import(`../libraries/${lib}/components`) `` — this code does **not** do that.) The libraries are `'use client'`, live inside `@atta/ui` (in `transpilePackages`), and load as client chunks. **The only requirement is gotcha #3 (copy `.next/static`).** No `outputFileTracingIncludes` hack needed. Risk collapses into the already-known static-copy step.

## Runtime: Node, not Bun (decision + evidence)

The monorepo is Bun. It was tempting to compile the server into a single **Bun** executable (stack-aligned; Claude Code itself ships as a Bun single-file binary). **Deep research says: do not, yet.**

- `bun build --compile` on Next's standalone `server.js` **fails** to resolve RSC/CommonJS deps (Bun issue #26244, Jan 2026: "Could not resolve: react-server-dom-webpack/client"; Next discussion #80621: fails to resolve `require()` deps). The `@yao-pkg/pkg` route produces a binary that **fails at runtime** (chdir to a non-existent `/snapshot/...`).
- Bun-as-runtime (non-compiled) has **crashed with standalone Next + middleware** (Bun #14496) — relevant because we run `clerkMiddleware`.
- 2026 consensus: *bun install* for package management, **node for the production runtime** until explicitly validated.

**Decision:** ship the **Node** runtime and run `.next/standalone/.../server.js` with Node (the Beadbox-proven path). **Bun stays the package manager / monorepo tooling.** Revisit the single-Bun-binary idea only if Bun fixes RSC compile resolution (track in backlog).

## Ports & env baking (gotcha)

`NEXT_PUBLIC_*` env vars are **baked at build time** (Beadbox lesson). A dynamically-assigned runtime port will not match a client bundle compiled with a build-time port → silent breakage. **Use a fixed, known port** (or a build-time-stable scheme). `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is likewise baked (fine — per-environment).

## Process lifecycle (gotcha)

Node children (the sidecar server, spawned `claude` processes) can become **zombies on force-quit**. Manage with process groups + `killpg` (Unix) / Job Objects (Windows). The desktop owns clean teardown of both the server and any CLI subprocesses.

## 🔴 The macOS / Linux PATH problem (critical for the CLI transport)

Tauri's own docs: **GUI apps on macOS and Linux do not inherit `$PATH` from shell dotfiles.** A Finder/Dock-launched app sees a bare `PATH` (`/usr/bin:/bin:...`). The user's `claude`/`codex` (in `~/.bun/bin`, `/opt/homebrew/bin`, `~/.local/bin`) **won't be found** → the CLI transport silently dies (real bug: Tauri shell `Command` works in dev, fails after macOS build with "No such file or directory (os error 2)").

**Fix (first-party):** call **`fix_path_env::fix()`** (Tauri's `fix-path-env-rs` crate) as early as possible in `main.rs` — it reads the shell config to recover the real PATH and applies it. JS-side equivalents: `shell-path` / `fix-path`. **Plus** (because `fix-path` isn't bulletproof — aliases, shell functions, nvm/fnm shims): a **user-configurable binary path** setting and a **preflight existence + auth check**. See `04-cli-transport.md`.

## Bundle size

Beadbox: ~160MB total (~84MB Node). A bare Electron app starts ~200MB, so Model B + Tauri still wins on size while keeping native chrome and the system WebView.

## Tauri vs Electron (settled: Tauri)

Tauri is the modern, lean choice (OS WebView, ~MBs vs Electron's bundled Chromium, Rust core, better security defaults). The one Electron convenience — a bundled Node process — is *not* a capability ceiling for Tauri: Tauri's sidecar mechanism runs a Node binary, and its shell plugin spawns the user's CLI. The static-export-vs-server tradeoff is a **Next.js** reality that hits Electron identically; it is **not** a Tauri limitation. Stay on Tauri unless the Node-sidecar plumbing proves painful in the spike.
