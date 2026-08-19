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
#
# A third gap, found the moment attalabs deleted its local aeg-root/
# entirely (attalabs-remove-local-aeg-root task): three PATTERN_SCOPE
# entries (FORGE_NUMBER_PATTERN, TRANCHE_SLUG_VN_PATTERN, LEGACY_SLUG_PATTERN)
# hardcode 'aeg-root' as the (sole, for two of the three) directory to check
# these retired-vocabulary patterns are absent from — the suite's real intent
# there is "the portable doctrine text must not cite this source repo's own
# forge numbers/tranche slugs," which is vacuously true once there is no
# local doctrine copy left to check at all. `aeg-root` no longer exists in
# this repo, so grep exits 2 the same way the three cli-path entries above
# did. Unlike those three (safely dropped — other real scope entries
# remain), FORGE_NUMBER_PATTERN's and LEGACY_SLUG_PATTERN's scope is
# `['aeg-root']` alone: deleting the string outright would leave `[]`, which
# GNU grep's recursive mode silently reinterprets as "scan the whole repo
# from cwd" — and `#[0-9]{2,4}` matches nearly every legitimate `(task N,
# #issue)` citation this repo's own specs are full of, turning a vacuous
# pass into a real, unfixable flood of false positives. Point all three at a
# scratch directory that genuinely exists and is genuinely empty instead —
# preserves the check's real semantics (0 forbidden matches, verified
# against a real path, never a swallowed "missing path" error) without
# either silently skipping the check or widening its scope.
set -euo pipefail

SCRATCH=packages/aeg-core/src
EMPTY_SCOPE=packages/aeg-core/.aeg-root-gone
trap 'rm -rf packages/aeg-core' EXIT

mkdir -p "$SCRATCH/fixtures" "$EMPTY_SCOPE"
cp node_modules/@attalabs/aeg-core/src/retired-vocabulary.test.ts "$SCRATCH/"
cp node_modules/@attalabs/aeg-core/src/fixtures/legacy-tranche-slugs.txt "$SCRATCH/fixtures/"

sed -i.bak \
  -e "/^    'apps\/cli\/src',\$/d" \
  -e "/^    'apps\/cli\/README\.md',\$/d" \
  -e "/^    'packages\/sources\/README\.md'\$/d" \
  -e "s#'aeg-root'#'$EMPTY_SCOPE'#g" \
  "$SCRATCH/retired-vocabulary.test.ts"
rm -f "$SCRATCH/retired-vocabulary.test.ts.bak"

bunx vitest run "$SCRATCH/retired-vocabulary.test.ts"
