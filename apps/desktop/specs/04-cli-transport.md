# 04 — The CLI Transport (`createCliLlmCall`)

This is the feature that makes the desktop economically different from the hosted web: the LLM runs on the **user's own `claude`/`codex` subscription** via their installed CLI, with no API key and no per-token cost to AttaLabs. It is exactly Pupila's mechanism, generalized into a transport for the whole ecosystem.

## The core fact that makes it cheap

The engine reaches every model through `LlmCallFn` (in `@atta/engine`). `createMultiVendorLlmCall` (in `packages/adapter-langgraph/src/llm.ts`) is *one* implementation (SDK dispatch). The desktop adds a **second implementation** with the same signature and return shape (`{ content, structured?, tokensInput, tokensOutput }`). Orchestration above the seam — Vāda's deliberation, routing, prompts, teams — is **unchanged**.

```
LlmCallFn  (interface, @atta/engine)
 ├─ createMultiVendorLlmCall   // web/hosted: Anthropic/Google/OpenAI SDKs (exists)
 └─ createCliLlmCall           // desktop: shell out to `claude`/`codex` (new)
```

## How `createCliLlmCall` works

1. Receives the same `{ systemPrompt, userPrompt, ... }` the SDK impl receives.
2. Spawns the user's CLI in headless/print mode (e.g. `claude -p`), piping the prompt in.
3. Reads stdout, maps it back into the `LlmCallFn` return shape.

In Model B the spawn happens **server-side in the Node sidecar** (natural — it's Node on the user's machine, like Pupila). Alternatively it can be a Tauri Rust command exposed to JS via `invoke`. Either way the transport is **TS calling a native bridge**, not pure TS — note this when implementing.

## 🔴 The four edges that must be designed (not optional)

1. **Structured output / tool use.** The SDK path uses native `tool_choice` to force JSON (reviewer schemas, deliberation outputs). The CLI returns **text**, not a guaranteed tool-call object. So the CLI impl must get structure via **prompt-and-parse** — instruct the model to return JSON, then parse tolerantly (strip fences, recover bad fields). **Reference:** Pupila's `ai-review-parse.ts` is a working tolerant-parser. This is the main thing to design; it is solved, not novel.
2. **Binary discovery + PATH.** GUI apps don't inherit shell `$PATH` (see `02`). Use `fix_path_env::fix()` **plus** a user-configurable "path to `claude`/`codex`" setting **plus** a preflight existence check. Don't rely on PATH alone (aliases, shell functions, nvm/fnm shims defeat it).
3. **CLI auth preflight.** Spawning `claude` assumes the user is logged into the CLI. If not, it may block on an interactive prompt and **hang**. Detect "present *and* authenticated" before use; surface a clear "log into your Claude CLI" message on failure.
4. **Permission scoping.** Tauri v2 requires granting the shell capability (`shell:allow-execute` / `shell:allow-spawn`) for the CLI binary. "Find it" and "be allowed to spawn it" are separate config steps.

## Secondary considerations

- **Token accounting.** The CLI may not report token counts → return `0` or estimates for `tokensInput/Output`. Fine for Herald's single audit; matters for Vāda's heavy multi-reviewer runs (cost telemetry degrades). Decide per product whether estimates are acceptable.
- **Per-call vs session.** A subprocess per agent-call works (Pupila does this) but has overhead in a large multi-agent Vāda deliberation. Consider a persistent session / batching for heavy flows; fine as per-call for Herald.
- **`codex` parity.** Keep the transport CLI-agnostic (a small adapter per CLI) so `claude` and `codex` are interchangeable — the "agnostic" goal Dani stated.

## Do not build speculatively

`createCliLlmCall` is written when the desktop product is **real** (post-ratification), validated first by the spike in `09-spike-plan.md` (prove the transport + prompt-and-parse on **one** Herald audit before anything else depends on it).
