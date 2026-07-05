#!/usr/bin/env bash
# TEMPORARY DIAGNOSTIC (task 35, #409) — probes Vercel's build container to
# find out what git remote(s) its checkout configures. Replaced by the real
# ignore-build logic once evidence is collected. Exit 0 = skip the build.
set +e

echo '=== DIAG: remotes ==='
git remote -v 2>&1
echo "remote count: $(git remote | wc -l)"

echo '=== DIAG: git config (redacted) ==='
git config --list 2>/dev/null \
  | sed -E 's#(://)[^@/]+@#\1***@#g' \
  | sed -E '/[Aa]uthorization/s#=.*#=***#'

echo '=== DIAG: repo shape ==='
git rev-parse --is-shallow-repository 2>&1
git log --oneline -3 2>&1
git show-ref 2>&1 | head -20
git rev-parse -q --verify main >/dev/null 2>&1 && echo 'main: RESOLVABLE' || echo 'main: UNRESOLVABLE'

echo '=== DIAG: VERCEL_GIT env ==='
env | grep '^VERCEL_GIT' | sort

echo '=== DIAG: URL probes ==='
GIT_TERMINAL_PROMPT=0 git ls-remote https://github.com/daniboomerang/attalabs.git HEAD 2>&1 \
  && echo 'LS-REMOTE-URL: OK' || echo 'LS-REMOTE-URL: FAILED'
GIT_TERMINAL_PROMPT=0 git fetch --depth=50 https://github.com/daniboomerang/attalabs.git main:refs/tmp/diag-main 2>&1 \
  && echo 'FETCH-URL: OK' || echo 'FETCH-URL: FAILED'
git rev-parse -q --verify refs/tmp/diag-main 2>&1 || echo 'TMP-MAIN: ABSENT'

echo '=== DIAG: end ==='
exit 0
