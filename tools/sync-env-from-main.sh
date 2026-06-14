#!/usr/bin/env bash
# Symlinks every .env*.local file from the main worktree into the current
# worktree at the same relative path. Idempotent — files that already exist
# (real or symlink) are left alone. Called from .husky/post-checkout so
# `git worktree add` inherits env files automatically.

set -euo pipefail

main_worktree=$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')
current_worktree=$(git rev-parse --show-toplevel)

if [[ "$main_worktree" == "$current_worktree" ]]; then
  exit 0
fi

if [[ ! -d "$main_worktree" ]]; then
  exit 0
fi

linked=0
while IFS= read -r -d '' src; do
  rel="${src#"$main_worktree/"}"
  dst="$current_worktree/$rel"
  if [[ -e "$dst" || -L "$dst" ]]; then
    continue
  fi
  mkdir -p "$(dirname "$dst")"
  ln -s "$src" "$dst"
  linked=$((linked + 1))
done < <(
  find "$main_worktree" \
    -type d \( -name node_modules -o -name .worktrees -o -name .next -o -name .git -o -name dist -o -name .turbo -o -name .claude \) -prune \
    -o -type f -name '.env*.local' -print0
)

if [[ $linked -gt 0 ]]; then
  echo "[sync-env] linked $linked env file(s) from $main_worktree"
fi
