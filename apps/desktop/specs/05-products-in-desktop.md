# 05 — Products in the Desktop

The desktop is a container for *existing* products. This doc records which products belong, **why each gains from being local**, and which are awkward fits. Final set depends on ratification + the Fran conversation (Pupila).

## AEG — the strongest fit (the reason that most needs the desktop)
**Agentic Execution Governance** is governance + orchestration of delegated AI execution. It is **inherently local**: it watches worktrees, dispatches agents, reads the repo, spawns processes. A **web app cannot touch the filesystem or spawn local agents; a desktop can.** AEG has wanted a UI and never had a natural home — the desktop is it. This is arguably the single strongest reason to build the shell at all. AEG's UI is a *view* over existing PM artifacts + local capability; it needs the native (Rust/Node) side for filesystem + agent-spawn, which Model B's sidecar + Tauri shell provide.

## Pupila — the strongest *economic/strategic* fit
Local-first by design (scrapes from the user's IP, reasons on the user's CLI, flat-file state). **Hosting it fights its nature; a desktop *is* its nature.** Every hosting problem (scraping IP/cache, LLM billing) evaporates locally. Fran's code embeds essentially unchanged. See `06-pupila.md`. (Core-vs-adjacent pending the Fran conversation.)

## Vāda — clean fit
Local agent / deliberation **sessions** launched in-app, running on the user's subscription via the CLI transport. Vāda's spec already imagined a desktop future. "MCP's economics with a real UI." Heavy multi-reviewer runs stress the CLI transport's token-accounting and per-call overhead (see `04`) — validate before leaning on Vāda as the flagship desktop surface.

## Vitakka — natural fit, can start small
The focus product (uses Vāda); longitudinal/accumulating. A long-lived desktop window is the right vessel for a focus tool. The desktop could be where Vitakka V1 begins.

## Herald (candidate mode) — the odd one out
Herald is fundamentally a **hosted, public-URL** product: recruiters visit a shareable link; the public profile + audit are web-native. In the desktop, Herald appears as a candidate's **workspace** (profile tuning, running audits on their own CLI, and — if Pupila is in — the discovery→audit funnel). **The public profile stays web.** So Herald is *partially* in the desktop, unlike the others. Herald also has its **own Clerk app** (`closing-blowfish-4`), so its desktop surface authenticates against Herald's instance, not the Atta-family instance.

## Composition phasing (from `01`)
- **Phase 1:** run one product's `standalone` server locally (Herald candidate or Vāda) — no product refactor.
- **Phase 2:** extract feature surfaces into packages, mount all as routes in one `apps/desktop` Next app (`/vada`, `/herald`, `/aeg`, `/pupila`). Touches products; deferred.

## The unifying picture
One desktop client holds: AEG's UI (finally), Vāda local sessions, Vitakka's focus surface, Herald's candidate workspace, and Pupila's native discovery — all riding the user's local subscription. That is the answer to the API-key problem, with full UI control.
