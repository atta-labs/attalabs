# 09 — Spike Plan (de-risking sequence)

Goal: prove the foundation on the **smallest possible surface** before any product is built around it. Each step gates the next. Do **not** write product code or `createCliLlmCall` for real until the relevant step passes. Use a **development** Clerk instance throughout (avoids prod-key hardening until the end).

## Spike order (each step de-risks the highest remaining unknown)

### S1 — Standalone build of one app in the monorepo
**Prove:** `next build` with `output: 'standalone'` + `outputFileTracingRoot` (repo root) on **Herald** bundles the `@atta/*` workspace packages and runs via `node server.js`.
**Checks:** locate the **nested** `server.js` (`find . -path "*/.next/standalone/*/server.js"`); copy `.next/static` + `public/`; confirm the app renders locally with all four UI libraries (the dynamic-import chunks load).
**Fails if:** workspace deps missing, or library chunks 404 (→ revisit static copy / tracing).

### S2 — Run the standalone server under Node (confirm Bun is not needed)
**Prove:** `node .next/standalone/.../server.js` serves the full app (SSR, route handlers, server `auth()` against a dev Clerk instance). Confirm Bun-compile is *not* on the path.
**Fails if:** middleware/RSC issues (→ stay on Node, log specifics).

### S3 — Tauri sidecar wiring
**Prove:** a Tauri v2 shell spawns the Node standalone server as a sidecar on a **fixed port**, points the WebView at `http://localhost:<port>`, and the app renders. Add `fix_path_env::fix()` in `main.rs`. Handle clean shutdown (no zombie node).
**Fails if:** port/lifecycle/PATH issues (→ each has a known fix in `02`).

### S4 — Clerk native-mode sign-in (dev instance)
**Prove:** sign in inside the desktop using Clerk native-token mode (`tauri-plugin-clerk` pattern), and server `auth()` in the sidecar recognizes the user. Confirm `authorizedParties` includes the desktop origin.
**Fails if:** origin/header conflicts (→ the native-mode fix in `03`).

### S5 — `createCliLlmCall` on ONE Herald audit (the keystone)
**Prove:** a `createCliLlmCall` `LlmCallFn` impl shells out to the user's `claude` CLI (with PATH resolution + auth preflight + permission scoping), returns the `LlmCallFn` shape, and **produces a valid structured audit via prompt-and-parse** (reference: Pupila's `ai-review-parse.ts`). Run one real Herald forensic audit end-to-end on the user's subscription, zero API key.
**Fails if:** structured output unreliable (→ harden the parser; decide if native tool-use gap is acceptable per product).

### S6 — (optional, later) Vāda deliberation over CLI
**Prove:** a multi-reviewer Vāda run completes over the CLI transport; measure per-call overhead and token-accounting degradation.
**Decides:** whether Vāda is a flagship desktop surface or stays MCP/web-first.

## What the spike explicitly does NOT do
- No production Clerk hardening (`allowed_origins`/Native API) until after S1–S5 pass.
- No signing/notarization/updater until the app runs end-to-end (that's the distribution chapter, `07`).
- No Phase-2 product composition (that's a separate, larger effort).
- No Pupila embedding until the Fran conversation sets direction.

## Build-order summary
S1→S2→S3→S4→S5 proves: *apps run unchanged in a local sidecar, auth works natively, and the CLI transport produces real structured output on the user's subscription.* That is the entire foundation. Everything else (more products, distribution, Pupila) is additive and known.
