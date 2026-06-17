# Fix: Husky activation in agent worktrees

**Tier:** 0

## Summary

Agents were bypassing commitlint on every worktree add because Husky hooks were not being activated in fresh worktrees. The `.husky/post-checkout` hook now runs `bun install --frozen-lockfile` to ensure Husky is properly initialized when a worktree is created, which enables the `commit-msg` hook to fire at commit time.

## Impact

- Agents will no longer bypass commitlint silently in worktrees
- All commits from worktrees will now be validated against the conventional commit format
- This improves code quality and consistency across agent workflows
