#!/usr/bin/env bun

// V0.7 stub — exits 0 unconditionally.
//
// V1 will check:
//   - Every spec file has a Status: metadata block (draft/target/ratified/retired)
//   - Every D-### entry in decisions logs has Status, Type, and Decision fields
//   - Every file added/removed/renamed has a corresponding docs-index.md update
//   - --pr mode: brief has tier field; Tier 3 brief has decision log entry in this PR
//
// Until V1 is implemented, run this to confirm the scaffold is wired correctly.

const args = process.argv.slice(2)
const mode = args.includes('--pr') ? 'pr' : 'full'

console.log(`verify-docs V0.7 stub — mode: ${mode} — all checks skipped`)
process.exit(0)
