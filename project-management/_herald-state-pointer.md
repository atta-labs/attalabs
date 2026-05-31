### Herald — *standalone AttaLabs product; Phase 1 in progress — see `apps/herald-ai/project-management/state.md`*

**Full state:** `apps/herald-ai/project-management/state.md` — read that file for Herald detail.
**Current phase:** Phase 1 — candidate use case (Envoy end-to-end, match engine, deploy to `herald.attalabs.dev`).

Standalone forensic CV-to-JD match tool. Sibling product in AttaLabs, NOT part of Atta-the-product (D-025 reframed from prior "pluggable MCP tool" framing). Built by Dani.

Forensic CV/JD match tool that also exposes itself via MCP for integration. Herald can be invoked by Atta (or any MCP-compatible host) as one of many external tools — that makes Herald integratable, not a layer of Atta. English name (no longer carries the v1 "non-Pāli = plugs in" structural meaning — Pāli rule was demoted in v2).

Has its own auth (separate Clerk app — out of scope for the AttaLabs ecosystem auth migration).

**Domain:** `herald.attalabs.dev` (when deployed).
