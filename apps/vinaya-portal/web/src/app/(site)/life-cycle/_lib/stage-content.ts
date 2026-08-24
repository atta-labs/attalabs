import type { NounId } from '../_components/StageGlyph'
import type { StageId } from '../../start/_lib/stages'

/** One bold micro-headline + its supporting sentence — the per-stage bullet
 * shape every section uses. */
export type StageBullet = { title: string; body: string }

/** The copy this page adds on top of `_lib/stages.ts`'s doctrine-pinned
 * `role`/`receives`/`produces` — ring, GitHub object, plain-language framing,
 * headline and bullets. None of this is derivable from `stages.ts`; it is
 * this task's own authored content (Issue #918, design-input requirement
 * voided 2026-08-24 — the Developer designs the copy directly). */
export type StageCopy = {
  ring: string
  object: string
  youCallIt: string
  headline: string
  bullets: StageBullet[]
  /** `true` only for Security — it runs alongside Review, not after it, so
   * it has no outgoing contract edge (`contractFile: null` in `stages.ts`). */
  noContract?: boolean
}

export const STAGE_COPY: Record<StageId, StageCopy> = {
  plan: {
    ring: '0',
    object: 'Milestone',
    youCallIt: '"planning the feature."',
    headline: 'Short, reviewable PRs start here.',
    bullets: [
      {
        title: 'A junior can read the plan itself.',
        body: 'Planning is interactive and legible — before any code exists, not after.'
      },
      {
        title: 'Docs get read, not skipped.',
        body: 'The Planner reads your real docs and specs, so planning doubles as maintenance.'
      }
    ]
  },
  brief: {
    ring: '0',
    object: 'PR body',
    youCallIt: '"the spec, with acceptance criteria."',
    headline: 'The whole work order, before any code exists.',
    bullets: [
      {
        title: 'Exact files, exact tests.',
        body: 'And when to stop and ask — written down before an agent starts guessing.'
      },
      {
        title: 'Frozen at dispatch.',
        body: "The brief can't drift mid-task. Changing it is an event, not an edit."
      }
    ]
  },
  develop: {
    ring: '0 + 1',
    object: 'Branch + PR',
    youCallIt: '"implementation."',
    headline: 'Every commit checked before it lands.',
    bullets: [
      {
        title: 'Small enough to actually review.',
        body: 'One right-sized pull request per task — the failure this exists to prevent.'
      },
      {
        title: 'Nothing skips the gate for speed.',
        body: 'The hook on the laptop is the same code as the required check in CI.'
      }
    ]
  },
  review: {
    ring: '1',
    object: 'PR comment',
    youCallIt: '"code review."',
    headline: 'A verdict only counts from a verified reviewer.',
    bullets: [
      {
        title: 'Real reviewers only.',
        body: "Verdicts are author-verified against an allowlist — a forged or bot approval can't flip the gate."
      }
    ]
  },
  security: {
    ring: '1',
    object: 'PR comment',
    noContract: true,
    youCallIt: '"security sign-off."',
    headline: 'A second pass, on the same pull request.',
    bullets: [
      {
        title: 'Not a stage you can skip for speed.',
        body: "Security sits beside Review rather than after it, so it can't become the thing that gets dropped when a release is close."
      }
    ]
  },
  archive: {
    ring: '2',
    object: 'Issue closed',
    youCallIt: '"closing the ticket."',
    headline: 'Every task closes on its own.',
    bullets: [
      {
        title: 'Every merge, on the record.',
        body: 'Brief, checks and verdicts stay on the pull request — not in a wiki that goes stale.'
      },
      {
        title: 'Nobody writes the status.',
        body: 'It’s derived from the forge. There is no field to forget to update.'
      }
    ]
  },
  'wrap-up': {
    ring: '2',
    object: 'Milestone closed',
    youCallIt: '"the retro."',
    headline: 'The milestone closes once, cleanly.',
    bullets: [
      {
        title: 'Only when every task under it is actually done.',
        body: 'A closed Issue with no merged pull request holds the milestone open.'
      },
      {
        title: 'The retrospective feeds the next plan.',
        body: 'What the tranche learned is an input, not a document nobody opens again.'
      }
    ]
  }
}

/** What noun mark leads in and what noun mark comes out, per stage — pairs
 * `STAGE_COPY.stage-content.ts`'s own new content with `StageGlyph.tsx`'s
 * existing `NOUNS` labels/descriptions, so those aren't retyped either. */
export const STAGE_FLOW: Record<StageId, { in: NounId; out: NounId }> = {
  plan: { in: 'intent', out: 'tranche' },
  brief: { in: 'task', out: 'brief' },
  develop: { in: 'brief', out: 'pr' },
  review: { in: 'pr', out: 'verdict' },
  security: { in: 'pr', out: 'verdict' },
  archive: { in: 'pr', out: 'record' },
  'wrap-up': { in: 'tranche', out: 'retro' }
}

/** The outgoing contract edge per stage, as a stage-id pair — mirrors
 * `stages.ts`'s own `contractFile` pairing (`null` for Security, which has
 * none). Kept here rather than parsed out of the `contractFile` string
 * because Security breaks strict array adjacency (Review's contract target
 * is Archive, not Security) and Wrap up's wraps back to Plan. */
export const STAGE_CONTRACT_TARGET: Record<StageId, StageId | null> = {
  plan: 'brief',
  brief: 'develop',
  develop: 'review',
  review: 'archive',
  security: null,
  archive: 'wrap-up',
  'wrap-up': 'plan'
}

/** The hero's stepper-preview sub-line per stage — a short imperative,
 * cycled alongside `STAGES[i].label`. Only `plan`'s and `wrap-up`'s are
 * binding verbatim (Issue #918 §2's two worked examples); the other five
 * are authored in the same voice, since the stepper itself is an optional
 * condensed preview, not separately load-bearing. */
export const STAGE_STEPPER_SUBLINE: Record<StageId, string> = {
  plan: 'BREAK IT INTO TECH TASKS',
  brief: 'WRITE THE WORK ORDER',
  develop: 'OPEN THE PULL REQUEST',
  review: 'POST THE VERDICT',
  security: 'CHECK THE ATTACK SURFACE',
  archive: 'CLOSE THE ISSUE',
  'wrap-up': 'CHANGELOG'
}

/** Displayable role name derived from `stages.ts`'s role slug — "planner" →
 * "Planner", "brief-author" → "Brief Author", "tranche-archivist" →
 * "Tranche Archivist" — so the human-facing label is computed, not retyped. */
export function roleLabel(roleSlug: string): string {
  return roleSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
