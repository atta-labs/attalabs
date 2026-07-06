# AttaLabs Desktop — Decision Log (product-local)

**Status:** draft

> Desktop-scoped decisions. **None are globally ratified yet.** Items marked `Lock:PROPOSED` await Principal ratification; on ratification, mirror into the global `packages/governance/decisions.md` (flagged in the PR body).

## D-DESK-001 — AttaLabs Desktop is a new product (Tauri shell embedding existing web products)

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
A cross-platform Tauri desktop client that embeds the existing AttaLabs web products **unchanged** and adds a local CLI transport. It is registered in `products.md` as `desktop` at `apps/desktop`. It is a *container*, not a new application surface. Rationale: the third structural answer to the API-key problem (web=BYOK, MCP=caller's chat, desktop=user's CLI) with full UI control.

## D-DESK-002 — Runtime model is Model B (Next `standalone` in a Tauri Node sidecar)

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
Reject Model 0 (point at hosted sites — defeats the purpose) and Model A (static export — kills route handlers/server auth/SSR shell, would change the apps). Choose Model B: spawn a local Node process running Next `standalone` `server.js`; WebView → `localhost:<fixed-port>`. Only model that keeps the apps unchanged; proven in production on the same stack (Beadbox).

## D-DESK-003 — Node runtime, not Bun, for the sidecar

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
`bun build --compile` of Next standalone fails (RSC/CommonJS); Bun-as-runtime has crashed with standalone+middleware. Ship Node + `node server.js`. Bun remains the package manager / monorepo tooling. Revisit if Bun fixes these (backlog).

## D-DESK-004 — Context is injected at the shell; products never know their context

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
Finish the `LlmCallFn` pattern at the shell: a `DesktopShell` sibling of `NextWebShell` injects auth (Clerk native-token) and the CLI transport. Products import nothing context-specific. The web products must run identically under web or desktop.

## D-DESK-005 — CLI transport is a third `LlmCallFn` implementation (`createCliLlmCall`)

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
Shell out to the user's `claude`/`codex` CLI (headless), prompt-and-parse for structured output (reference: Pupila `ai-review-parse.ts`). Not written speculatively — only after the spike (S5). Edges: PATH/binary-discovery, CLI-auth preflight, permission scoping, token accounting.

## D-DESK-006 — Desktop auth = Clerk native-token mode on the existing instance

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
Use Clerk native mode (token in `Authorization` header) + `allowed_origins` + Native API + `authorizedParties` on the **existing** production instance (Atta-family `summary-ladybird-76`; Herald surface uses `closing-blowfish-4`). No separate Clerk app, no satellite domain. Web↔desktop are independent sessions (no automatic SSO). Avoids the production-keys + non-standard-port origin-validation failures.

## D-DESK-007 — Pupila belongs in the desktop, embedded ~unchanged; direction is Fran's conversation

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
The desktop is the environment where Pupila's local-first model is native, not a liability. Integration path (fork / shared `@atta/job-engine` / seam) and core-vs-adjacent status are to be decided **with Fran**, not unilaterally. MIT permits a fork; the friendship and attribution do not.

## D-DESK-008 — Build gating: spike before product, distribution as its own chapter

**Status:** PENDING
**Type:** 2
`Lock:PROPOSED`
Prove S1–S5 (`09-spike-plan.md`) on a dev Clerk instance before building product surfaces or `createCliLlmCall` for real. Signing/notarization/updater (`07`) is a deliberate, separate workstream, not an afterthought.
