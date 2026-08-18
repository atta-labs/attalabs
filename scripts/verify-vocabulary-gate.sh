#!/usr/bin/env bash
# Vocabulary gate — real port of the now-deleted local
# packages/aeg-core/src/retired-vocabulary.test.ts, run against the
# published @attalabs/aeg-core copy instead.
#
# That suite computes its own repo root as
# `join(dirname(fileURLToPath(import.meta.url)), '../../..')` — three
# directory levels up from wherever the file physically sits. From the old
# local copy (packages/aeg-core/src/) that landed on the real repo root by
# construction. From the INSTALLED copy
# (node_modules/@attalabs/aeg-core/src/) it lands one level short, at
# node_modules/, because the npm scope directory (@attalabs/) adds a
# nesting level `packages/` never had — a naive working-directory or
# path swap runs the suite against the wrong root, not a loud failure.
#
# There is no env override and no exported evaluator to import instead (the
# suite is a single self-contained vitest file, unlike vocabulary-citation.ts
# which IS exported and already wrapped by scripts/vinaya-checks/). The fix:
# materialize a scratch copy of the installed test — plus the one fixture
# file it reads relative to its own location — at the SAME three-deep
# nesting the original local copy had (packages/aeg-core/src/, a plain
# on-disk directory only for the duration of this script; not a workspace
# member once the root `workspaces` array is an explicit enumeration), so
# the repo-root computation resolves correctly. This also self-satisfies the
# suite's own hardcoded EXEMPT entries
# ('packages/aeg-core/src/retired-vocabulary.test.ts', '/fixtures/'), which
# would otherwise flag the copy's own embedded sample strings (e.g. the
# literal text "D-097") as violations of the very gate it defines.
#
# A second, distinct gap surfaced once REPO_ROOT resolved correctly: the
# suite's own TRANCHE_SLUG_VN_PATTERN scope hardcodes three paths
# ('apps/cli/src', 'apps/cli/README.md', 'packages/sources/README.md') by
# its own comment's admission specific to "this repo's layout" — meaning
# the standalone atta-labs/vinaya repo the suite ships from, not an adopter.
# None of those three paths exist in this (or any adopter) repo, so grep
# exits 2 ("No such file or directory") on each, which the suite's own
# grep() correctly treats as a real failure rather than "no matches" — this
# is not a false positive to route around, it is the suite assuming it is
# still running inside its source repo. Sed the three adopter-inapplicable
# entries out of the SCRATCH COPY only (never the installed package) before
# running it; every other pattern/scope is untouched.
set -euo pipefail

SCRATCH=packages/aeg-core/src
trap 'rm -rf packages/aeg-core' EXIT

mkdir -p "$SCRATCH/fixtures"
cp node_modules/@attalabs/aeg-core/src/retired-vocabulary.test.ts "$SCRATCH/"
cp node_modules/@attalabs/aeg-core/src/fixtures/legacy-tranche-slugs.txt "$SCRATCH/fixtures/"

sed -i.bak \
  -e "/^    'apps\/cli\/src',\$/d" \
  -e "/^    'apps\/cli\/README\.md',\$/d" \
  -e "/^    'packages\/sources\/README\.md'\$/d" \
  "$SCRATCH/retired-vocabulary.test.ts"
rm -f "$SCRATCH/retired-vocabulary.test.ts.bak"

bunx vitest run "$SCRATCH/retired-vocabulary.test.ts"
