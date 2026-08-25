/**
 * Seed Sanity CMS with the five `roadmapMilestone` documents for vinaya-portal's
 * /roadmap page. `image` is intentionally left unset — there is nothing to
 * migrate an image from (the current five items are code-drawn SVGs, not
 * uploadable assets); a human uploads real images in Studio afterward.
 *
 * Usage (run from packages/cms/):
 *   SANITY_PROJECT_ID=o56nzgrr SANITY_API_TOKEN=<token> bun run scripts/seed-roadmap-milestones.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false
})

const MILESTONES = [
  {
    _id: 'roadmap-milestone-loop-engineering',
    _type: 'roadmapMilestone',
    title: 'Loop Engineering',
    description:
      'An optional external driver that runs the dispatch → verify → merge cycle for you. It sits on top of the harness, reads Vinaya’s task state, and advances work on its own — while you keep the go/no-go calls. Ships in rings: self-correction is live today, the full task loop comes next.',
    truth: 'Self-correction ships today; the full dispatch-to-merge loop is still being built.',
    status: 'shipping',
    order: 1
  },
  {
    _id: 'roadmap-milestone-studio-on-the-web',
    _type: 'roadmapMilestone',
    title: 'Studio on the web',
    description:
      'Vinaya Studio runs deployed, not just on your machine. Anyone can connect over the web — product folks, reviewers, non-coders — and watch the harness state live. The whole team sees what’s building, without cloning a repo or touching a terminal.',
    truth: 'Studio runs locally today; a deployed, web-reachable version has not shipped yet.',
    status: 'planned',
    order: 2
  },
  {
    _id: 'roadmap-milestone-linear-jira-support',
    _type: 'roadmapMilestone',
    title: 'Linear & Jira support',
    description:
      'A service layer that holds the issue state machine in Linear or Jira, not just GitHub. Same labels, same flow — Vinaya reads and edits issues wherever your team already tracks them. Bring the harness to your board instead of moving your board to the harness.',
    truth: 'GitHub is the only supported issue tracker today; Linear and Jira are not yet wired up.',
    status: 'planned',
    order: 3
  },
  {
    _id: 'roadmap-milestone-configurable-forge',
    _type: 'roadmapMilestone',
    title: 'Configurable forge',
    description:
      'Today Vinaya’s security gates — rationale checks, doc-coupling, scope guards — are always on. This adds a vinaya.settings.json where you switch each check on or off, at any level: whole repo, a project, or a single task. Loosen the gates on a throwaway repo, keep them strict on production.',
    truth: 'Every gate is always on today, repo-wide; there is no per-repo, per-project, or per-task override yet.',
    status: 'planned',
    order: 4
  },
  {
    _id: 'roadmap-milestone-configurable-roles',
    _type: 'roadmapMilestone',
    title: 'Configurable roles',
    description:
      'Vinaya ships fixed agent roles — Developer, Reviewer, and the rest — each with baked-in skills. This lets you pass your own: swap in a custom role, add domain skills, or override how an existing role behaves. The harness stays the same; the agents inside it become yours to shape.',
    truth: 'Roles are fixed and baked-in today; there is no mechanism yet to pass a custom role or skill.',
    status: 'planned',
    order: 5
  }
] as const

async function main() {
  console.log(`\nSeeding ${MILESTONES.length} roadmap milestones`)
  console.log(`Project: ${process.env.SANITY_PROJECT_ID}\n`)

  for (const doc of MILESTONES) {
    const result = await client.createOrReplace(doc as Parameters<typeof client.createOrReplace>[0])
    console.log(`✓ Saved: ${result._id}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
