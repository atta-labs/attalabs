Project: vinaya
Iteration: vinaya-cli-v1 · task 3

**Boundary** — The check engine: `vinaya check <name> | --all` with `--json` (versioned envelope), `--diff-only` (change-surface scope; the ring-1 default), `--parallel` (concurrency-capped); the error-output contract on ALL checks — structured JSON lines on stderr, exit 0/1, per-check timeout enforced by the RUNNER, no-network-by-default, every error carrying `agent_recovery_prompt` (D-100); the core AEG gates (doc coverage, brief shape, coherence, dispatch readiness) expressed through the SAME interface as custom checks — no privileged API (D-092/D-104); custom-check registration via `vinaya.config.json` (any executable honoring the contract; glob scoping allowed, conditionals forbidden — D-109); and `vinaya new check` scaffolding from a worked template. NOT: the CI workflow install (task 4's `vinaya.yml`); NOT edits to `packages/aeg-core/bin/*`; NOT the shim.

**Sizing** — Passes, at the top of the size range: one verification story (a fixture repo's checks all run through one interface — core and custom indistinguishable to the runner; contract violations surfaced by contract tests), bounded surface, one failure-mode family (runner/contract). If the Brief Author's dig shows the runner and the core-gate expression are separately verifiable, escalate a split rather than silently absorbing it.

**Project(s) + blast radius** — vinaya. Consumes `@atta/aeg-core` + `apps/vinaya/sources` read-only through their public exports; needs no edits there — task 2 delivered the seams. Needing a core edit is a stop condition, not scope creep.

**Dependency rationale** — `Depends-on: 1` (bin/config/envelope), `2` (StateSource — checks read state ONLY through it; "no check binary hardcodes a state path" is the ratified corollary).

**Traps to avoid** — `agent_recovery_prompt` is the corrective INSTRUCTION ("You modified X but not its owning doc Y. Read Y, apply your change, commit both."), never the diagnosis restated. Timeouts live in the runner, not in checks. The error schema is a versioned public surface (D-100/D-103) — additive evolution only. Do not let core checks grow a private fast path — no-privileged-API is the product's extensibility claim.

**Suggested agent-class** — high: contract design + runner semantics.

**Stop-and-escalate** — Any core gate that cannot be expressed through the public check interface without privilege → stop (`severity:strategy`; that is a contract gap). Any need to edit aeg-core → stop.

**Docs to keep coherent** — `apps/vinaya/specs/vinaya-spec.md` (check contract + error schema chapters — the doc plugins are written against). Surfaces: `apps/vinaya/cli/**`.
