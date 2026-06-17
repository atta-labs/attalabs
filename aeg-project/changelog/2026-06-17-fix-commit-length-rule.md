---
title: Add 72-character commit header limit rule to Developer role
type: Fix
tier: 0
---

Added explicit 72-character header limit to Developer role documentation with verification command.

- Updated `## Commit conventions` section with expanded format rules, additional type options, and hardcoded 72-char limit with enforcement command
- Added item 0 to `## Verification before reporting done` with command to verify no commits exceed the limit before opening PR
- Makes the single most common CI failure (commitlint header length) explicit and preventable at development time
