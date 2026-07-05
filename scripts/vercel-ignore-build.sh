#!/usr/bin/env bash
# Vercel "Ignored Build Step" for every app in this monorepo (task 35, #409).
# Usage (from an app's vercel.json): cd ../../.. && bash scripts/vercel-ignore-build.sh <package-name>
# Exit 0 = skip the build; exit 1 = proceed with the build.
#
# Why this shape — proven live inside Vercel's build container (task 35 diagnostic,
# 2026-07-05): Vercel's checkout is a shallow, single-branch clone whose only local
# ref is `refs/heads/master`, with ZERO git remotes configured and no ambient
# credentials (the repo is private, so URL fetches fail auth too). Any `git fetch`
# — named remote or URL — is therefore impossible here. The comparison base must be
# a ref that already exists locally:
#   - On any non-first push of a branch, Vercel sets VERCEL_GIT_PREVIOUS_SHA and
#     turbo-ignore diffs against it (built-in behavior, no fallback involved).
#   - On a branch's first push, VERCEL_GIT_PREVIOUS_SHA is empty and turbo-ignore
#     uses the fallback. `HEAD^1` is Vercel's own documented Ignored Build Step for
#     Turborepo and is always resolvable in the shallow clone. Known limit: a
#     multi-commit first push compares only the tip commit, so an app change buried
#     in a non-tip commit of a branch's very first push can be missed (preview-only;
#     fail direction is a skipped preview, never a wrongly-skipped production build
#     — production pushes to main carry a previous deployment SHA).
#   - If a provided ref cannot be resolved, turbo-ignore fails OPEN (builds).
#
# turbo-ignore prints a deprecation notice recommending Vercel's built-in project
# skipping. That feature cannot express this repo's main skip case: changes outside
# the workspace definition (e.g. aeg-root/**, docs-only PRs) are treated as global
# and deploy ALL apps, while turbo-ignore's package-graph diff correctly ignores
# them. We stay on turbo-ignore deliberately — see PR for task 35.
set -u
PKG="$1"
echo "vercel-ignore-build: pkg=${PKG} ref=${VERCEL_GIT_COMMIT_REF:-<unset>} prev_sha=${VERCEL_GIT_PREVIOUS_SHA:-<empty>}"
npx turbo-ignore "$PKG" --fallback=HEAD^1
