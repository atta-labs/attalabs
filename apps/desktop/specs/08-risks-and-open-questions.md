# 08 — Risk Register & Open Questions

Ranked. "Resolved" means we found the answer in research; "resolved-with-fix" means there's a known, bounded fix that must be specced/implemented; "open" means genuinely unresolved.

## A. The core thesis — HOLDS
- Engine is transport-agnostic (`LlmCallFn`). ✅
- Server-heavy Next apps run **unchanged** in a Node sidecar — proven in production (Beadbox, Next 16 + App Router + RSC + server actions). ✅
- Pupila's local-first engine becomes **native** in a desktop; no rewrite. ✅
- CLI rides the user's subscription. ✅ (pending the spike for structured output.)

## B. Resolved — LOW risk
- **Dynamic UI library system** (`library-loader.ts`): string-literal `import()` map → bundler-safe → collapses into the "copy `.next/static`" step. Not the tracing landmine it looked like.
- **Tauri vs Electron:** Tauri is the right modern choice; the static-vs-server tradeoff is a Next.js reality, not a Tauri limit.
- **Windows-machine problem:** gone — CI matrix builds/signs Windows on `windows-latest`.

## C. Resolved-with-fix — must be specced/implemented
- **🔴 macOS/Linux PATH** (CLI transport can't find `claude`): fix = `fix_path_env::fix()` + configurable binary path + auth preflight. Highest-attention item — the CLI thesis runs through it.
- **🔴 Clerk production keys + non-standard-port origin validation:** fix = native-token mode + `allowed_origins` + Native API + `authorizedParties`; not the cookie/origin model. No separate Clerk app, no satellite domain.
- **Bun can't compile Next standalone:** fix = ship Node runtime, run `node server.js`; Bun stays package manager.
- **Monorepo standalone tracing:** fix = `outputFileTracingRoot` = repo root; target the **nested** `server.js` path; copy `.next/static` + `public/`.
- **`NEXT_PUBLIC_*` baked at build → dynamic port breaks client:** fix = fixed/known port.
- **Zombie processes on quit:** fix = process groups / killpg / Job Objects.
- **Shell-out blocked by Gatekeeper:** fix = macOS entitlements (`allow-unsigned-executable-memory`, `disable-library-validation`).
- **Signing/distribution/updates:** fix = Apple Dev account + Azure Trusted Signing + Tauri updater keypair + CI matrix (~11 secrets).
- **CORS would block Pupila scraping in the webview:** fix = run fetchers server-side in the Node sidecar (not renderer JS).

## D. Still OPEN — to close before/within the build
1. **Structured output over CLI at Vāda scale.** Prompt-and-parse is proven for one Herald audit (Pupila's `ai-review-parse.ts`), but heavy multi-reviewer Vāda deliberations + token accounting are unproven. → spike before betting Vāda on the desktop.
2. **Phase-2 composition cost.** "Compose all products as routes in one desktop Next app" requires extracting feature surfaces from `apps/*/web/src` into packages. Unmeasured. → count direct `@atta/auth` + DB usages in products to size the "inject auth/data at the shell" job.
3. **`tauri-plugin-clerk` production limits.** Does it handle a production instance + App Router + the single-Clerk-app model cleanly? → read plugin internals before relying on it.
4. **Secure token storage** across launches (Tauri Stronghold / OS keychain).
5. **`codex` parity** with `claude` for the transport adapter.
6. **Bun-runs-Next-standalone (non-compiled)** as a future simplification if Bun fixes middleware crashes + RSC compile.

## E. The meta-finding
AttaLabs Desktop is a **real product with a substantial build/runtime/distribution subsystem**, not "just scaffolding." The idea is sound and the architecture is unusually ready, but the spec must carry a full **distribution/runtime chapter** (this folder), not an "embed the apps" paragraph.
