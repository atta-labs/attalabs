/**
 * Seed Sanity CMS with the seven `roadmapMilestone` documents for
 * vinaya-portal's /roadmap page — Vinaya's own version ladder toward
 * `1.0.0`. `image` is intentionally left unset by this script.
 *
 * `version` is a RECORD of what shipped, never a target/prediction (see the
 * schema's own field description) — so `MILESTONES_INPUT` below omits the
 * `version` key entirely for every not-yet-shipped entry. `patch().set()`
 * only writes the keys present in its payload, so an omitted key is never
 * asserted: re-running this script cannot reintroduce a predicted version
 * an earlier run wrote, and cannot clobber the real version an editor sets
 * by hand in Studio once the milestone actually ships. Add the key back
 * (with the real value) here only once it's true, mirroring what an editor
 * would otherwise do directly in Studio — this script and Studio write the
 * same field under the same rule, never a conflicting one.
 *
 * Safe to re-run at any time, including after images are attached via Studio:
 * each doc is created if missing (`createIfNotExists`, full payload, `image`
 * absent) and then updated via `patch().set()` rather than `createOrReplace`.
 * `set()` only touches the fields it's given — an `image` a document picked up
 * afterward is never in this script's payload, so it's never overwritten.
 *
 * `status` seeded here is a FALLBACK only — `/roadmap` derives `shipping`/
 * `planned` live from the published `@attalabs/vinaya` npm version
 * (`apps/vinaya-portal/web/src/app/(site)/roadmap/_lib/derive-status.ts`),
 * so nothing needs recomputing here as new versions ship. This field is only
 * read when that registry lookup is unreachable, or for `'dropped'` (an
 * editorial call no version comparison can derive) — seeded with what's true
 * as of writing, not something that must be kept in sync going forward.
 *
 * Usage (run from packages/cms/):
 *   SANITY_PROJECT_ID=o56nzgrr SANITY_API_TOKEN=<token> bun run scripts/seed-roadmap-milestones.ts
 */

import { createClient } from '@sanity/client'

// Derived from `title`, not hand-typed alongside it — two independent fields for the
// same identity can only drift if one is edited without the other.
function milestoneId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `roadmap-milestone-${slug}`
}

const MILESTONES_INPUT = [
  {
    title: 'Milestone layer',
    version: '0.19.0',
    description:
      'A milestone now holds a full release, not just one batch of work. It carries a target version and the list of what ships toward it, so you can see the whole release taking shape — not just the task in front of you.',
    truth: 'Shipped — targeted 0.19.0.',
    status: 'shipping',
    order: 1
  },
  {
    title: 'Determinism hardening',
    description:
      'Five things that used to rely on an agent following instructions become guarantees instead: task setup, evidence binding, write access to your repo, skill verification, and the readiness check before work starts. Less "the agent remembered to," more "the harness makes sure."',
    truth: 'Not released yet.',
    status: 'planned',
    order: 2
  },
  {
    title: 'Agentic interface',
    description:
      'One consistent way to run Vinaya, whichever AI coding agent you use. Claude, Gemini, Codex, Antigravity, Grok — same commands, same roles, kept current automatically as the harness updates.',
    truth: 'Not released yet.',
    status: 'planned',
    order: 3
  },
  {
    title: 'Review that answers itself',
    description:
      'Code and security review run every cycle without someone standing between rounds. Fresh reviewers each pass, judged against the latest commit, with a hard ceiling so the loop always reaches an end.',
    truth: 'Not released yet.',
    status: 'planned',
    order: 4
  },
  {
    title: 'A task finishes itself',
    description:
      "One task, start to merged pull request, with no one in the loop: brief, code, review, fix, merge. You decide up front what's pre-approved and what still needs a click — everything else queues instead of stalling the run.",
    truth: 'Not released yet.',
    status: 'planned',
    order: 5
  },
  {
    title: 'A tranche finishes itself',
    description:
      "A whole batch of tasks runs its own schedule: what's ready starts, what's blocked waits, the batch closes itself out once the last task lands. Planning happens against the code as it actually is when the batch begins.",
    truth: 'Not released yet.',
    status: 'planned',
    order: 6
  },
  {
    title: 'A milestone finishes itself',
    description:
      'Approve the goal once, come back to a shipped release. The full ladder — task, tranche, milestone — runs unattended, with anything undecidable queued rather than stopping the run. Not feature-complete. Walk-away complete.',
    truth: 'Not released yet.',
    status: 'planned',
    order: 7
  }
] as const

export const MILESTONES = MILESTONES_INPUT.map((m) => ({
  _id: milestoneId(m.title),
  _type: 'roadmapMilestone' as const,
  ...m
}))

async function main() {
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET ?? 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN!,
    useCdn: false
  })

  console.log(`\nSeeding ${MILESTONES.length} roadmap milestones`)
  console.log(`Project: ${process.env.SANITY_PROJECT_ID}\n`)

  for (const doc of MILESTONES) {
    await client.createIfNotExists(doc)
    const result = await client.patch(doc._id).set(doc).commit()
    console.log(`✓ Saved: ${result._id}`)
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
