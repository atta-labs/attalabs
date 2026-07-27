/**
 * labels.ts — the canonical, code-owned enumeration of every Vinaya label that
 * carries meaning to the mechanism. Pure data, zero I/O, zero imports beyond
 * its own types — the same discipline as `actions.ts` and `waiver-label.ts`
 * (one pure-data list, read by both the logic and the rendered docs, so the
 * two can never drift).
 *
 * ## The `vinaya/` namespace
 *
 * Every label the mechanism reads lives under the `vinaya/` product namespace.
 * The grammar is three separators, each with one job:
 *
 *   - `/` separates the **product** from everything it owns — `vinaya/…`
 *   - `:` separates the **namespace** from its value — `vinaya/tier:1`
 *   - `-` separates the **words** inside a name — `vinaya/needs:brief-correction`
 *
 * So `vinaya/tranche:state-machine-v1` reads as: the Vinaya product, the
 * `tranche` axis, the `state-machine-v1` value. The namespace makes every
 * Vinaya label sortable and filterable as one group in a repo it shares with
 * an adopter's own labels — the reason a product namespace exists at all.
 * The `aeg` name is retired in public, so no `aeg:*` label survives:
 * `aeg:blocked` became `vinaya/blocked`, and the forge's `aeg:incoherent` /
 * `aeg:stale-blocker` were renamed in place (history preserved).
 *
 * GitHub caps a label name at 50 characters. `vinaya/tranche:` spends 15 of
 * them before the slug starts — `trancheSlugLengthError` is the check that
 * keeps a Planner from cutting a slug the forge cannot hold.
 *
 * ## Why it lives here
 *
 * It lives in `@atta/aeg-forge-state`, not `@atta/aeg-core`, because the
 * dependency direction is `aeg-core → aeg-forge-state → aeg-types`: the
 * vocabulary's first consumer is `map-forge-facts.ts` (the mapper that turns
 * a raw GitHub label list into the `blockedLabel` fact), which sits in this
 * package and cannot import backward from `aeg-core`. This is the lowest
 * package every consumer already depends on. `@atta/aeg-core` re-exports the
 * whole helper surface, so consumers that only depend on `aeg-core` (the
 * Vinaya CLI) reach the same single source without a new dependency.
 *
 * ## The helpers are the contract
 *
 * No call site may write a label string as a literal. `label()`,
 * `trancheLabel()`, `matchesLabel()` and `trancheSlugOf()` are the only
 * sanctioned ways to construct or match one — a stray literal is a site the
 * next rename will silently miss, and a missed site is a broken gate.
 *
 * Each entry records the *orthogonal fact* the label carries — the one thing
 * the mechanism learns from its presence. Labels are orthogonal by design:
 * a task's tier, its tranche, what it is waiting on, and what has been
 * waived are independent axes, and no code should infer one from another.
 *
 * **Status is not in here, and must never be.** Execution status is derived
 * from forge objects (`state-machine-model.ts`), never written
 * as a label — a `status:*` label would recreate the racing status store the
 * derivation model exists to eliminate. **Project is not in here either**: a
 * task's project is a `**Project:**` field in its Issue body, never a label.
 */

/**
 * Which axis a label varies on. One category per orthogonal fact — see the
 * module header on why these must stay independent.
 */
export type LabelCategory =
  /** Execution is halted pending an external unblock. */
  | 'state'
  /** Governance weight of the change — drives the doc/decision gates. */
  | 'tier'
  /** Which tranche a task Issue belongs to. */
  | 'tranche'
  /** What the task is waiting on, and from whom. */
  | 'needs'
  /**
   * A gate deliberately excused for this one PR, by a principal. Covers both
   * the targeted waivers (one finding class) and the blunt `override:docs`
   * (the whole gate) — same axis, different blast radius.
   */
  | 'waiver'
  /**
   * An anomaly the mechanism DETECTED and is surfacing for a human. Never
   * auto-resolved and never a status: the forge shows what happened, not
   * whether it was legitimate, so a flag marks "a human must look at this".
   */
  | 'flag'
  /**
   * What an Issue *is*, rather than what state it is in — the one axis that
   * says "this object is not a unit of work at all", so every work-shaped
   * view must exclude it.
   */
  | 'kind'

/**
 * Whether `id` is the complete label string or the stable prefix of a family
 * whose suffix is open-ended. `vinaya/tranche:` is a prefix family — its
 * suffix is whatever slug the Planner cut — so no fixed list can enumerate it,
 * and code must match it by prefix rather than by equality.
 */
export type LabelForm = 'literal' | 'prefix'

/**
 * The stable, code-side name for a label. Call sites reference labels by key,
 * never by string, so a future rename touches `LABELS` and nothing else. Keys
 * deliberately do NOT encode the namespace — that is the `id`'s job.
 */
export type LabelKey =
  | 'blocked'
  | 'tier-0'
  | 'tier-1'
  | 'tier-3'
  | 'tranche'
  | 'needs-execution-input'
  | 'needs-strategy-input'
  | 'needs-principal-input'
  | 'needs-brief-correction'
  | 'waiver-docs'
  | 'waiver-review'
  | 'override-docs'
  | 'incoherent'
  | 'direct-main-push'
  | 'dead-branch-push'
  | 'state-object'

export type Label = {
  /** Stable code-side handle — what call sites pass to `label()`. */
  key: LabelKey
  /** The exact label string, or the prefix for a `form: 'prefix'` family. */
  id: string
  category: LabelCategory
  form: LabelForm
  /** The single orthogonal fact this label's presence tells the mechanism. */
  carries: string
}

/** The `vinaya/` product namespace every label in this vocabulary carries. */
export const LABEL_NAMESPACE = 'vinaya/'

/** GitHub's hard cap on a label name, in characters. */
export const LABEL_MAX_LENGTH = 50

export const LABELS: Label[] = [
  {
    key: 'blocked',
    id: 'vinaya/blocked',
    category: 'state',
    form: 'literal',
    carries: 'Execution is halted pending an external unblock; wins over every other derived status.'
  },
  {
    key: 'tier-0',
    id: 'vinaya/tier:0',
    category: 'tier',
    form: 'literal',
    carries: 'Lowest governance weight — typecheck, lint, tests, and a conforming PR body.'
  },
  {
    key: 'tier-1',
    id: 'vinaya/tier:1',
    category: 'tier',
    form: 'literal',
    carries: 'Tier 0 plus spec/skill coverage and a passing verify-docs run.'
  },
  {
    key: 'tier-3',
    id: 'vinaya/tier:3',
    category: 'tier',
    form: 'literal',
    carries: 'Tier 1 plus the reasoning for the change, stated in the pull request that makes it.'
  },
  {
    key: 'tranche',
    id: 'vinaya/tranche:',
    category: 'tranche',
    form: 'prefix',
    carries: "The tranche slug this task Issue belongs to — the forge's grouping key, matched by prefix."
  },
  {
    key: 'needs-execution-input',
    id: 'vinaya/needs:execution-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on a missing execution detail — a flag, a dependency, a value the brief did not carry.'
  },
  {
    key: 'needs-strategy-input',
    id: 'vinaya/needs:strategy-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on a strategy call — the brief assumes an approach the codebase has moved away from.'
  },
  {
    key: 'needs-principal-input',
    id: 'vinaya/needs:principal-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on the Principal — a product-level call no agent may make.'
  },
  {
    key: 'needs-brief-correction',
    id: 'vinaya/needs:brief-correction',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on the Brief Author — the brief contradicts the surface it describes.'
  },
  {
    key: 'waiver-docs',
    id: 'vinaya/waiver:docs',
    category: 'waiver',
    form: 'literal',
    carries: 'Doc-coverage gate excused for this PR — honored only when a principal applied it.'
  },
  {
    key: 'waiver-review',
    id: 'vinaya/waiver:review',
    category: 'waiver',
    form: 'literal',
    carries: 'Review gate excused for this PR — honored only when a principal applied it.'
  },
  {
    key: 'override-docs',
    id: 'vinaya/override:docs',
    category: 'waiver',
    form: 'literal',
    carries: 'The whole verify-docs gate suppressed for this PR — a Principal-only blunt override, wider than a waiver.'
  },
  {
    key: 'incoherent',
    id: 'vinaya/incoherent',
    category: 'flag',
    form: 'literal',
    carries: 'Closed COMPLETED with no merged-PR link — done-but-unprovable, surfaced for a human.'
  },
  {
    key: 'direct-main-push',
    id: 'vinaya/direct-main-push',
    category: 'flag',
    form: 'literal',
    carries: 'A commit reached main with no associated merged PR — ring-2 detection, never a mutation.'
  },
  {
    key: 'dead-branch-push',
    id: 'vinaya/dead-branch-push',
    category: 'flag',
    form: 'literal',
    carries: 'Commits landed on a branch after its PR had already resolved — daily-drift detection.'
  },
  {
    key: 'state-object',
    id: 'vinaya/state-object',
    category: 'kind',
    form: 'literal',
    carries: 'A permanent forge-native storage object, never actionable work — excluded from every backlog.'
  }
]

const BY_KEY = new Map<LabelKey, Label>(LABELS.map((l) => [l.key, l]))

function entry(key: LabelKey): Label {
  const found = BY_KEY.get(key)
  // Unreachable while `LabelKey` and `LABELS` agree — `labels.test.ts` asserts
  // the two stay in lockstep, so this is a type-narrowing guard, not a branch
  // any caller can reach.
  if (!found) throw new Error(`labels.ts: no LABELS entry for key '${key}'`)
  return found
}

/**
 * The label string for `key` — the complete name for a literal label, or the
 * bare prefix for a prefix family (use `trancheLabel` to build a full
 * `vinaya/tranche:<slug>`). The ONLY sanctioned way to construct one.
 */
export function label(key: LabelKey): string {
  return entry(key).id
}

/** The full `vinaya/tranche:<slug>` label for a tranche slug. */
export function trancheLabel(slug: string): string {
  return `${label('tranche')}${slug}`
}

/**
 * The full label `slug`'s Issues carry, wrapped in an array — the shape a
 * forge OR-query (`ghIssueListByAnyLabel`) expects.
 *
 * `trancheLabel()` is for CONSTRUCTION: the one name a new Issue is given.
 * This is for QUERYING; the two return the same string today, but stay
 * separate functions so a caller's intent — "build a label" vs. "query for
 * one" — is legible at the call site regardless of shape.
 */
export function trancheLabelsToQuery(slug: string): string[] {
  return [trancheLabel(slug)]
}

/**
 * Whether `name` is this label — exact match for a literal, prefix match for a
 * prefix family.
 */
export function matchesLabel(key: LabelKey, name: string): boolean {
  const l = entry(key)
  if (l.form === 'prefix') return name.startsWith(l.id)
  return name === l.id
}

/** Whether any label in `names` matches `key`. */
export function hasLabel(key: LabelKey, names: readonly string[]): boolean {
  return names.some((n) => matchesLabel(key, n))
}

/**
 * The tranche slug carried by `name`, or `null` when it is not a tranche
 * label.
 */
export function trancheSlugOf(name: string): string | null {
  const prefix = entry('tranche').id
  return name.startsWith(prefix) ? name.slice(prefix.length) : null
}

/** The first tranche slug in `names`, or `null` when none carries one. */
export function findTrancheSlug(names: readonly string[]): string | null {
  for (const n of names) {
    const slug = trancheSlugOf(n)
    if (slug !== null) return slug
  }
  return null
}

/**
 * Why `slug` cannot be used as a tranche label, or `null` when it can.
 * `vinaya/tranche:` spends 15 of GitHub's 50 characters before the slug
 * starts, so a slug the Planner is free to write in prose can still be one the
 * forge refuses to hold. Checked where a tranche label is first applied,
 * not where one is read — an over-long label cannot exist to be read.
 */
export function trancheSlugLengthError(slug: string): string | null {
  const full = trancheLabel(slug)
  if (full.length <= LABEL_MAX_LENGTH) return null
  return `tranche slug '${slug}' makes a ${full.length}-character label ('${full}') — GitHub caps a label name at ${LABEL_MAX_LENGTH}. Shorten the slug by ${full.length - LABEL_MAX_LENGTH} character(s).`
}

/**
 * The blocked-label string. Kept as a literal (not a `LABELS` lookup) so it
 * stays a compile-time constant with no possibly-undefined narrowing at every
 * call site; `labels.test.ts` asserts it equals its `LABELS` entry, so the two
 * cannot drift. Re-exported by `map-forge-facts.ts` (its original home) and by
 * this package's index, so every existing import path keeps resolving.
 *
 * The export name keeps its `AEG_` prefix on purpose: it is a code symbol, not
 * a label string, and renaming it is a consumer-wide churn this migration does
 * not need. What retires is the *label* — its value is `vinaya/blocked`.
 * Prefer `hasLabel('blocked', labels)` for matching; this constant is for
 * construction.
 */
export const AEG_BLOCKED_LABEL = 'vinaya/blocked'
