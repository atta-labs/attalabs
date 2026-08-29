---
name: vinaya-architecture
description: Vinaya product architecture — the portal/studio split (the extracted CLI/engine's canonical home is now the standalone atta-labs/vinaya repo; attalabs holds no local copy), the check-engine contract (CheckSpec/CheckError, core registry, custom checks), the install lifecycle (init/eject/doctor/upgrade), the StateSource/DoctrineSource seams, and the renderer-never-derives rule. Load when working inside apps/vinaya-portal/** or apps/vinaya-studio/**. Do NOT load for the doctrine the gates ship (aeg-root) — attalabs carries no local aeg-root skill or copy of any kind; resolve the doctrine's own front door with `npx --yes @attalabs/vinaya doctrine`.
---
Read `.claude/skills/vinaya-architecture/SKILL.md` and follow it as your operating instructions for this task.
