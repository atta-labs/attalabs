# Desktop — Backlog (held / future, out of the active flow)

- **Phase-2 composition:** extract product feature surfaces from `apps/*/web/src` into packages so one `apps/desktop` Next app mounts all products as routes (`/vada`, `/herald`, `/aeg`, `/pupila`). Size first by counting direct `@atta/auth` + DB usages in products.
- **Vāda-over-CLI at scale (spike S6):** validate heavy multi-reviewer deliberation + token accounting before making Vāda a flagship desktop surface.
- **Single-Bun-binary sidecar:** revisit if Bun fixes RSC/CommonJS `--compile` and the standalone+middleware crash. Would simplify packaging and align with the Bun stack.
- **`codex` adapter parity** with `claude` in the CLI transport.
- **Secure token storage** (Tauri Stronghold / OS keychain) design.
- **`tauri-plugin-clerk` internals audit:** confirm production-instance + App Router + single-Clerk-app support before depending on it.
- **Hosted Herald MCP** (`aggregate_jobs`/`score_jobs`/`audit_match`) as the orthogonal, on-thesis way to expose discovery+audit to users' own chat models (separate from the desktop; shares the engine).
- **Pupila shared `@atta/job-engine`** package (path B) — only if Fran co-develops.
- **AEG desktop UI** detailed spec (local filesystem + agent-spawn surface) — likely the first real desktop product after the spike.
- **Auto-update UX** (custom dialog vs built-in; release cadence; rollback).
- **Windows/Linux parity testing** for the CLI transport PATH resolution (fix-path-env across shells).
