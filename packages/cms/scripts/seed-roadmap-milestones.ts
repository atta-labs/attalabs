/**
 * Seed Sanity CMS with the seven `roadmapMilestone` documents for
 * vinaya-portal's /roadmap page — Vinaya's own version ladder toward
 * `1.0.0`. `image` is intentionally left unset on every item here.
 *
 * ONE-TIME ONLY — do not re-run once images are attached. This uses
 * `createOrReplace`, which overwrites the whole document; a document whose
 * `image` was set afterward (via Studio, or a script) will have it wiped by
 * a second run, since this seed data carries no `image` field at all.
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

export const MILESTONES = [
  {
    _id: 'roadmap-milestone-milestone-layer',
    _type: 'roadmapMilestone',
    title: 'Milestone layer',
    version: '0.19.0',
    description:
      'A milestone now holds a full release, not just one batch of work. It carries a target version and the list of what ships toward it, so you can see the whole release taking shape — not just the task in front of you.',
    truth: 'Shipped in 0.19.0; this repo runs @attalabs/vinaya 0.19.2, at or past it.',
    status: 'shipping',
    order: 1
  },
  {
    _id: 'roadmap-milestone-determinism-hardening',
    _type: 'roadmapMilestone',
    title: 'Determinism hardening',
    version: '0.20.0',
    description:
      'Five things that used to rely on an agent following instructions become guarantees instead: task setup, evidence binding, write access to your repo, skill verification, and the readiness check before work starts. Less "the agent remembered to," more "the harness makes sure."',
    truth: 'Not released yet — targets 0.20.0.',
    status: 'planned',
    order: 2
  },
  {
    _id: 'roadmap-milestone-agentic-interface',
    _type: 'roadmapMilestone',
    title: 'Agentic interface',
    version: '0.21.0',
    description:
      'One consistent way to run Vinaya, whichever AI coding agent you use. Claude, Gemini, Codex, Antigravity, Grok — same commands, same roles, kept current automatically as the harness updates.',
    truth: 'Not released yet — targets 0.21.0.',
    status: 'planned',
    order: 3
  },
  {
    _id: 'roadmap-milestone-review-that-answers-itself',
    _type: 'roadmapMilestone',
    title: 'Review that answers itself',
    version: '0.22.0',
    description:
      'Code and security review run every cycle without someone standing between rounds. Fresh reviewers each pass, judged against the latest commit, with a hard ceiling so the loop always reaches an end.',
    truth: 'Not released yet — targets 0.22.0.',
    status: 'planned',
    order: 4
  },
  {
    _id: 'roadmap-milestone-a-task-finishes-itself',
    _type: 'roadmapMilestone',
    title: 'A task finishes itself',
    version: '0.23.0',
    description:
      "One task, start to merged pull request, with no one in the loop: brief, code, review, fix, merge. You decide up front what's pre-approved and what still needs a click — everything else queues instead of stalling the run.",
    truth: 'Not released yet — targets 0.23.0.',
    status: 'planned',
    order: 5
  },
  {
    _id: 'roadmap-milestone-a-tranche-finishes-itself',
    _type: 'roadmapMilestone',
    title: 'A tranche finishes itself',
    version: '0.24.0',
    description:
      "A whole batch of tasks runs its own schedule: what's ready starts, what's blocked waits, the batch closes itself out once the last task lands. Planning happens against the code as it actually is when the batch begins.",
    truth: 'Not released yet — targets 0.24.0.',
    status: 'planned',
    order: 6
  },
  {
    _id: 'roadmap-milestone-a-milestone-finishes-itself',
    _type: 'roadmapMilestone',
    title: 'A milestone finishes itself',
    version: '1.0.0',
    description:
      'Approve the goal once, come back to a shipped release. The full ladder — task, tranche, milestone — runs unattended, with anything undecidable queued rather than stopping the run. Not feature-complete. Walk-away complete.',
    truth: 'Not released yet — targets 1.0.0.',
    status: 'planned',
    order: 7
  }
] as const

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
    const result = await client.createOrReplace(doc as Parameters<typeof client.createOrReplace>[0])
    console.log(`✓ Saved: ${result._id}`)
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
