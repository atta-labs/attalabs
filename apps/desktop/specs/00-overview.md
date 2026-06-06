# 00 — Overview & Vision

## The problem this product solves (the throughline)

Since AttaLabs began, Dani has fought the **API-key model**: it is annoying for users to paste API keys, annoying to manage, and a real adoption barrier. Many iterations across Vāda, Vitakka, and Atta circled this. **MCP** was the first structural answer: ship products as MCP servers so people use them *from their own Claude.ai / ChatGPT subscription* — the caller's frontier model does the reasoning, AttaLabs supplies tools and data. Vāda already ships a hosted MCP on this thesis.

MCP solved half the problem but has a ceiling: the user must *bring* their chat client and *connect* the server, and AttaLabs does not own the harness — it is a guest tool inside someone else's chat.

**AttaLabs Desktop is the other half of the same answer.** Instead of "come to your Claude and connect to me," it is "download my app; it quietly drives the `claude`/`codex` CLI you already pay for." Same economic win (rides the user's subscription, zero API keys, zero per-token cost to AttaLabs), but **AttaLabs owns the entire experience** — UI, flows, harness.

## The three-transport thesis (the unifying idea)

Everything in the engine calls models through a single function type, `LlmCallFn` (defined in `@atta/engine`). The orchestration above that seam does not know or care how the model is reached. That single abstraction yields **one engine, three transports**:

| Transport | Where | Who pays for the LLM |
|-----------|-------|----------------------|
| **API / BYOK** | Hosted web (today) | The user's API key, or AttaLabs |
| **MCP** | The user's Claude.ai / ChatGPT | The caller's subscription (their chat *is* the model) |
| **CLI** | **AttaLabs Desktop (this product)** | The user's `claude`/`codex` subscription, via their local CLI |

The desktop is "transport #3." The engine already has the socket for it. Adding the CLI transport is **one new `LlmCallFn` implementation**, not a rewrite. (See `04-cli-transport.md`.)

## What lives in the desktop

The desktop is a **container**, not a new application surface. The products inside it are the *existing web products*, embedded. (See `05-products-in-desktop.md` for what each gains.)

- **Vāda** — local agent / deliberation sessions on the user's subscription.
- **AEG** — a UI for Agentic Execution Governance. *Strongest fit:* AEG is inherently local (watches worktrees, dispatches agents, reads the repo) and a web app cannot touch the filesystem or spawn local agents. AEG has wanted a UI and never had a natural home; the desktop is it.
- **Vitakka** — the focus product (uses Vāda); a long-lived desktop window is the right vessel; can start small here.
- **Herald (candidate mode)** — a candidate's job-search *workspace*. Herald is the **odd one out** (fundamentally a hosted, public-URL product for recruiters); its public profile stays web, while the candidate workspace can live in the desktop.
- **Pupila** — Dani's friend Fran's local-first job aggregator. *The single strongest reason for the desktop to exist:* Pupila's local-first model (scrapes from the user's IP, reasons on the user's CLI) is a **liability when hosted but native in a desktop** — Fran's code embeds essentially unchanged. (See `06-pupila.md`.)

## Non-goals (explicit)

- **Not a rewrite of any product.** The hard constraint is: *the web products must not know whether they run in a Next web context, a desktop context, or (someday) mobile.* Context-knowledge is pushed into the shell and the injected transports, never into product code.
- **Not mobile-native.** Desktop ≈ web (it runs Next locally; `@atta/ui` works as-is). Mobile-native is a far bigger lift because `@atta/ui` is Tailwind + Radix + DOM React, none of which run in React Native. Do not conflate desktop and mobile.
- **Not "a branded browser pointing at the live hosted sites."** That defeats the purpose: it would still run the LLM server-side on API keys and Pupila could not work. (See `01-architecture.md`, Model rejection.)
- **Not building `createCliLlmCall` speculatively.** It is written when this product is real (post-ratification + spike), not before.

## Status & provenance

Authored during a long Team-Leader research session (transcripts: `2026-06-06-...herald-pupila-desktop-session`). Type 2. **Not ratified.** The build sequence, exact product set, and whether Pupila is core or adjacent all depend on (a) Principal ratification and (b) a conversation with Fran about Pupila's direction.
