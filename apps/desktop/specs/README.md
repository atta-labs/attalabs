# AttaLabs Desktop — Spec Index

**Status:** draft
> **Status:** DRAFT / NOT RATIFIED. This is a Type 2 (vision + architecture) spec set authored by the Team Leader (Brief Author mode) during an extended research session. It exists to **preserve every finding** so a future coding agent (or future Dani) inherits the full reasoning instead of rediscovering it. Nothing here is committed to build until the Principal ratifies (see `desktop-decisions.md` in this folder + the global ratification queue).

## What this product is, in one sentence

A cross-platform **desktop client (Tauri)** that embeds AttaLabs' already-built web products **unchanged**, running them on a local Next.js server, and adds the one thing the web cannot: a **local LLM transport** that drives the user's installed `claude`/`codex` CLI — so the products run the user's reasoning on **their own subscription**, with **no API keys** and **full UI control**.

It is the third answer to the API-key problem Dani has chased since AttaLabs began: web = BYOK/API keys; MCP = the caller's chat is the model; **desktop = the user's local CLI is the model.** Same engine, three transports.

## Read in this order

| # | Doc | What it covers |
|---|-----|----------------|
| 00 | [`00-overview.md`](./00-overview.md) | Vision, the API-key throughline, the three-transport thesis, what's in the desktop, non-goals |
| 01 | [`01-architecture.md`](./01-architecture.md) | The three seams (engine / shell / auth), `DesktopShell`, runtime model (Model A vs B; B chosen), how products compose |
| 02 | [`02-runtime-and-packaging.md`](./02-runtime-and-packaging.md) | Next `standalone` output, monorepo tracing, the Tauri sidecar, Node-not-Bun, ports, process lifecycle, the macOS PATH problem |
| 03 | [`03-auth.md`](./03-auth.md) | Clerk on desktop: native-token mode, `allowed_origins`, the production-keys + port-origin landmines, single-Clerk-app model |
| 04 | [`04-cli-transport.md`](./04-cli-transport.md) | `createCliLlmCall` as a third `LlmCallFn`; structured-output-via-parse; binary discovery, auth preflight, permissions |
| 05 | [`05-products-in-desktop.md`](./05-products-in-desktop.md) | Which products live here and what each *gains* from being local (Vāda, AEG, Vitakka, Herald, Pupila) |
| 06 | [`06-pupila.md`](./06-pupila.md) | The Pupila study, the discovery→audit funnel, code portability, why the desktop is Pupila's natural home, the Fran question |
| 07 | [`07-distribution-signing-updates.md`](./07-distribution-signing-updates.md) | macOS notarization, Windows Azure signing, CI matrix (no Windows machine), entitlements, the Tauri updater |
| 08 | [`08-risks-and-open-questions.md`](./08-risks-and-open-questions.md) | The full risk register: resolved, resolved-with-fix, still-open. Ranked. |
| 09 | [`09-spike-plan.md`](./09-spike-plan.md) | The de-risking spike sequence — what proves what, in what order, before any product code |
| 10 | [`10-research-log.md`](./10-research-log.md) | The raw research trail with sources, so every external finding is re-verifiable |
| — | [`desktop-decisions.md`](./desktop-decisions.md) | Product-local decision log (desktop-scoped). Global ratification flagged in PR body. |
| — | [`desktop-backlog.md`](./desktop-backlog.md) | Held / future items out of the active flow |

## The honest one-paragraph meta-finding

The **core thesis holds and is well-evidenced**: the engine is already transport-agnostic, server-heavy Next apps run unchanged in a Node sidecar (proven in production by a third party on the same stack), Pupila's local-first engine becomes *native* in a desktop, and the CLI rides the user's subscription. **But** the research also established that AttaLabs Desktop is a *real product with a substantial build/runtime/distribution subsystem* — not "just scaffolding." Every hard piece is a known, trodden problem (standalone tracing quirks, Node-not-Bun, three-layer signing, macOS PATH, Clerk native mode), but there are a dozen of them, and together they are the difference between "a demo runs on my Mac" and "a shippable product." The spec is structured so that distinction is explicit.
