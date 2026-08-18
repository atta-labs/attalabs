#!/usr/bin/env bash
# Wrapper for the published @attalabs/aeg-core's verify-dispatch.ts, run
# against the registry copy instead of the now-deleted local
# packages/aeg-core/bin/verify-dispatch.ts.
#
# Same REPO_ROOT off-by-one as scripts/verify-docs.sh (see that script for
# the full explanation): the bin computes its own repo root as
# `join(import.meta.dirname, '../../..')`, which lands one level short when
# run from node_modules/@attalabs/aeg-core/bin/ instead of the old
# packages/aeg-core/bin/. Same fix: materialize a scratch copy of the whole
# installed package at the original three-deep nesting
# (packages/aeg-core/), run the bin from there, delete it on exit. Guarded
# to refuse if packages/aeg-core already exists for real.
set -euo pipefail

if [ -e packages/aeg-core ]; then
  echo "verify-dispatch.sh: packages/aeg-core already exists on disk — refusing to" >&2
  echo "overwrite it. This wrapper assumes the local copy has been deleted." >&2
  exit 1
fi

trap 'rm -rf packages/aeg-core' EXIT
cp -r node_modules/@attalabs/aeg-core packages/aeg-core

bun packages/aeg-core/bin/verify-dispatch.ts "$@"
