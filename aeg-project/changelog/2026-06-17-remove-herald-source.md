# 2026-06-17 — Remove herald-onto-engine duplicate

**Tier:** 0

**Change:** Removed `aeg-root/iterations/herald-onto-engine.md` (original file that was archived by moving a copy to `aeg-root/iterations/completed/herald-onto-engine.md` in PR #136).

**Why:** PR #136 created the archived version but left the original in place, causing the Studio to still show herald-onto-engine as an active iteration. Deleting the original completes the archival process.

**Verification:**
- Studio no longer displays herald-onto-engine as an active iteration
- `aeg-root/iterations/completed/herald-onto-engine.md` remains intact (canonical source)
