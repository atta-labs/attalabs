# 01 — Architecture

**Status:** draft
## The governing principle

> **The web products must not know their execution context.** A product should run identically whether wrapped by a Next web server or a desktop shell. Context-specific concerns (how the LLM is reached, how auth is obtained, where data lives) are **injected at the boundary**, never imported inside product code.

The engine already honors this for the model (`LlmCallFn`). The desktop work is to **finish the same pattern** for the remaining boundaries (auth, and where needed, data), by making the *shell* the single context boundary.

## The three seams that make this feasible

The architecture is ~70% context-agnostic today — unusually well-prepared, because three seams already exist:

### Seam 1 — The engine is transport-agnostic (the hardest seam, already solved)
Everything calls models via `LlmCallFn` (defined in `@atta/engine`). `packages/adapter-langgraph/src/llm.ts` `createMultiVendorLlmCall` is **one** implementation (SDK-shape dispatch: anthropic / google-genai / openai-compat). The desktop adds **another** implementation, `createCliLlmCall`, that shells out to the user's CLI. Orchestration above the seam is unchanged. This is the seam usually impossible to retrofit; it was built in from the start.

### Seam 2 — `NextWebShell` centralizes web wiring (the shell seam)
`packages/ui/lib/next-web-shell.tsx` is a single shell that renders `<html>`, reads cookies via `next/headers`, and mounts `AuthProvider` (Clerk) + `LibraryProvider` (from `config.userInterface.library.id`) + `CookieNameProvider` + `ToastProvider`. Products do **not** wire Next/Clerk themselves — the shell does. **The desktop adds a sibling `DesktopShell`** that provides the same providers but obtains auth differently (native-token, see `03-auth.md`) and injects the CLI transport. Products inside don't change.

### Seam 3 — `next-link` abstraction (the portability instinct)
`packages/ui/lib/next-link.tsx` wraps Next's `<Link>`. Evidence the codebase already avoids hardcoding framework primitives — exactly the instinct context-portability needs.

Supporting: the **UI library system** (`@atta/ui/libraries/{basic,retro,animate,brutal}/components` + `library-loader.ts` + `library-provider.tsx`) is package-level, dynamically loadable, and context-flexible. `next` is a **peer** dependency of `@atta/ui`, not a hard one.

## The 30% gap

The shell exists but only in a **web** implementation, and two concerns still leak the web context into products:

1. **Auth is Clerk/Next-coupled.** `@atta/auth` is `clerkMiddleware`, `ClerkProvider` (`provider.tsx` wraps `@clerk/nextjs`), server `auth()` (`hooks.ts`). Products call `import { auth } from '@atta/auth/hooks'` directly — so today products *do* know they are on the web, via auth. Note `@atta/auth` already ships `api-key-auth.ts` alongside the Clerk path → the package already understands "more than one auth mode," which is the seam the desktop extends.
2. **Data/route-handlers live in the apps.** Product flows (Herald's `/api/match`, Vāda's `/api/keys/...`) are in `apps/*/web/src`, calling Next route handlers + DB directly.

**The clean path = finish the pattern:** make `DesktopShell` the single context boundary, injecting an `AuthContext` and (where needed) a data client per context, mirroring how the engine injects `LlmCallFn`.

## Runtime model — the central decision

A desktop shell (Tauri/Electron) is a native window wrapping a webview + a native backend. The whole architecture question is: **what does the webview load, and where does the server run?** Three options:

### Model 0 — Webview points at the live hosted sites — REJECTED
Loads `https://vada.attalabs.dev` etc. Zero new infra, but **defeats the entire purpose**: LLM still runs server-side on API keys (no local CLI), and **Pupila cannot work** (no local scraping/CLI). This is the "it's just a browser" trap.

### Model A — Static export (SPA) — viable but lossy
Next `output: 'export'`; Tauri serves static files; client-only Clerk. This is the *canonical, easy* Tauri+Next pattern (the official `clerk-nextjs-tauri-example` uses it). **But static export removes everything the apps depend on server-side:** route handlers, server `auth()`, `next/headers` `cookies()` (used by `NextWebShell`), RSC server data-fetching, middleware. Adopting it would force server logic to a hosted API or to Tauri Rust commands, and a client-rendered shell — i.e., it *changes the apps*, violating "don't touch."

### Model B — Next `standalone` server as a Tauri sidecar — **CHOSEN**
Tauri spawns a local Node process running Next's `standalone` `server.js`; the webview points at `http://localhost:<port>`. **The apps run unchanged** — SSR, route handlers, server `auth()`, the shell — because it is a *real Next server*, just local. This is the old-Electron "launch the web server and render it" pattern, on Tauri via the sidecar mechanism. **Proven in production** by a third-party app (Beadbox) on Next 16 + App Router + RSC + server actions. (See `02-runtime-and-packaging.md`.)

**Model B is chosen because it is the only model that honors "don't touch the web products," and it is proven on our exact stack.** Its costs (Node runtime ~ +84MB, standalone tracing quirks, fixed-port discipline, the macOS PATH issue, process lifecycle) are documented in `02`.

> Auth nuance that favors Model B: because the sidecar is a real server on `localhost:<port>`, **server-side Clerk runs** (`clerkMiddleware`, `auth()`) — which static export kills. But the *client* still uses Clerk **native-token** mode, not cookies, to dodge the production-keys/port-origin problem. See `03-auth.md`.

## How products compose (phasing)

Product flows currently live in `apps/*/web/src`, not in feature packages. So:
- **Phase 1 (minimal touch):** the desktop runs an existing app's `standalone` server locally (one product first — Herald candidate or Vāda). No product refactor.
- **Phase 2 (elegant, later):** extract product feature surfaces into packages so a single `apps/desktop` Next app mounts them all as routes (`/vada`, `/herald`, `/aeg`, `/pupila`). This *does* touch products and is deferred; it is the long-term "one server, compose everything" shape.

## Diagram (textual)

```
┌─ AttaLabs Desktop (Tauri) ──────────────────────────────┐
│  Native (Rust) core                                      │
│   • fix_path_env::fix()  → real $PATH for CLI discovery   │
│   • spawns sidecar: node .next/standalone/.../server.js   │
│   • spawns user CLI: `claude` / `codex` (shell plugin)    │
│   • updater plugin, window chrome, secure token storage   │
│                                                          │
│  WebView → http://localhost:<fixed-port>                 │
│   └─ Next standalone server (UNCHANGED app)              │
│        • DesktopShell (sibling of NextWebShell)          │
│        • injects AuthContext (Clerk native-token)        │
│        • injects LlmCallFn = createCliLlmCall            │
│        • @atta/ui, @atta/engine, product routes as-is    │
└──────────────────────────────────────────────────────────┘
        │ only AUTH + shared hosted data leave the machine
        ▼
   attalabs.dev  (Clerk instance; shared/hosted data APIs)
```

Compute + UI are local; only **identity + shared hosted data** reach `attalabs.dev`.
