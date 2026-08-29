#!/usr/bin/env bash
# Wrapper for the published @attalabs/aeg-core's verify-docs.ts, run against
# the registry copy instead of the now-deleted local
# packages/aeg-core/bin/verify-docs.ts.
#
# Same bug class the old scripts/verify-vocabulary-gate.sh hack also hit
# (since replaced by scripts/verify-vocabulary-gate.ts, which imports the
# evaluator directly and never chdir's): verify-docs.ts
# computes its own repo root as `join(import.meta.dir, '../../..')` — three
# directory levels up from wherever the file physically sits, then
# `process.chdir()`s there before reading aeg-root/enforcement.md. From the
# old local copy (packages/aeg-core/bin/) that landed on the real repo root
# by construction. From the INSTALLED copy
# (node_modules/@attalabs/aeg-core/bin/) it lands one level short, at
# node_modules/, because the npm scope directory (@attalabs/) adds a
# nesting level `packages/` never had — confirmed live: run directly, it
# throws `enforcement.md: could not find "## The model:" heading`, because
# it chdir'd into node_modules/ and read a nonexistent (or unrelated) file
# at that wrong root, not this repo's aeg-root/enforcement.md.
#
# There is no env override for the computed root. The fix: run the CLI
# against a scratch copy of the whole installed package, placed at the SAME
# three-deep nesting the original local copy had (packages/aeg-core/), so
# the repo-root computation resolves correctly; delete the scratch copy
# once the command exits. Guarded to refuse if packages/aeg-core already
# exists for real — this script assumes the attalabs-adoption tranche's
# deletion has landed, and must never overwrite a real directory.
set -euo pipefail

if [ -e packages/aeg-core ]; then
  echo "verify-docs.sh: packages/aeg-core already exists on disk — refusing to" >&2
  echo "overwrite it. This wrapper assumes the local copy has been deleted." >&2
  exit 1
fi

trap 'rm -rf packages/aeg-core' EXIT
cp -r node_modules/@attalabs/aeg-core packages/aeg-core

bun run packages/aeg-core/bin/verify-docs.ts "$@"
