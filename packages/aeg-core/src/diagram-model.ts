/**
 * diagram-model.ts — the pure derivation at the heart of one library
 * turns doctrine (`enforcement.md` rings/gates/checks + role/contract
 * frontmatter + the canonical `ACTIONS` set) plus declarative config plus
 * live status into a renderer-agnostic `DiagramModel`. Every diagram consumer
 * (Studio, the Vinaya portal, a CLI visualizer) reads THIS model; none
 * re-implements the governance logic. Zero I/O, zero `fs`/`node:`
 * imports — doctrine arrives already-read through `DoctrineContent`;
 * the file reads live behind `DoctrineSource` in `@atta/vinaya-sources`.
 *
 * What is NOT here: geometry. Radius, angle, colour, coordinates are the
 * renderer's job (a ring index and a render-state are structural facts; a
 * pixel is not). Render-state is DERIVED, never authored: `disabled` when
 * config disables it, else `active`.
 */

import matter from 'gray-matter'
import { ACTIONS, CROSSING_KEYWORDS } from './actions'
import type { DoctrineContent } from './doctrine-source'
import { findHeadingLine, findTable } from './markdown-table'
import { parseEnforcementRegistry } from './registry-parse'
import type { Iteration } from './types'

export type DiagramNodeKind = 'ring' | 'gate' | 'check' | 'action' | 'role' | 'contract'
export type RenderState = 'active' | 'disabled'

export type DiagramNode = {
  id: string
  kind: DiagramNodeKind
  label: string
  ringIndex?: 0 | 1 | 2
  renderState: RenderState
  sourceLine?: number
  summary?: string
  /** What this node actually does, in one plain sentence — every kind carries
   * one, each from its own source's `description`: the enforcement table's
   * Description column for `gate`/`check`, `description:` frontmatter for
   * `role`/`contract`, the `ACTIONS` entry's field for `action`. One register
   * for every kind, because a reader cannot see what kind of node they
   * clicked. Never `GateRow.spec` — that column is written to enforce, not to
   * read (38% of rows cite a decision id, an issue number or a file path;
   * longest is 2650 chars), and rendering it here is the bug this field
   * exists to prevent. `summary` asks the question, this answers it, and
   * "Read more" carries the spec. Optional because a source may omit it,
   * never because a kind structurally lacks one. */
  detail?: string
  category?: 'ci' | 'hook' | 'event'
  actorType?: 'agent' | 'human' | 'either'
  /** Whether this action reaches GitHub — `action` nodes only, straight from
   * its `ACTIONS` entry (the canonical set). On the node because a
   * renderer cannot get it any other way: `ACTIONS` is a value export, and
   * importing it into a client component drags `@atta/aeg-forge-state`'s
   * `node:child_process` into the browser bundle. The distinction is
   * doctrine-load-bearing — ring-0 gates guard exactly the crossings, and
   * G3 exists to prove there is no unguarded one — so it must survive to the
   * render rather than being implied by which ring a node was filed under. */
  crosses?: 'into-github' | 'none'
  /** The node's name **for a reader**, when its `label` is an identifier rather
   * than words. `role`/`contract` nodes label themselves with their doctrine id
   * (`brief-author`, `archivist-iteration-archivist`) because that id is the
   * node's identity — routes, doc paths and edge endpoints all key off it, so
   * it cannot be prettified in place. This carries the doc's own `title:`
   * frontmatter instead, and every renderer showing a name to a person prefers
   * it, falling back to `label` when absent.
   *
   * Deliberately NOT `sidebar_title`: that field is the docs nav's own caption,
   * and sourcing a doctrine node's name from a nav hint would let a caption
   * edit silently rename the node. `title:` is the document's own name, which
   * is what a display name should be. */
  displayLabel?: string
  /** Where this node sits in the process, from its doc's `order:` frontmatter
   * — `role`/`contract` nodes only. Doctrine files are read in filename order,
   * which is alphabetical and therefore meaningless to a reader; the process
   * runs plan → brief → build → review → verify → merge → archive, and that is
   * the order every surface listing these nodes should present them in. Kept on
   * the node rather than re-derived per renderer so the docs nav and the map
   * cannot disagree about the sequence. Absent means unordered — a renderer
   * sorting by it must treat that as "last", never as zero. */
  order?: number
}

export type DiagramEdge = {
  id: string
  kind: 'guards' | 'performs' | 'produces' | 'consumes'
  from: string
  to: string
}

export type DiagramFinding = { configKey?: string; reason: string }

export type DiagramConfig = {
  rings?: { ring1_forgeWriteInterception?: boolean; ring2_asyncAudits?: boolean }
  gates?: Record<string, boolean>
}

export type DiagramModel = {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  findings: DiagramFinding[]
  iteration: Iteration | null
}

/** Deterministic slug from a table row's first cell: lowercase, drop
 * backticks/bold/markdown-link chrome, collapse non-alphanumerics to `-`. */
function slugify(cell: string): string {
  return cell
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The three ring summary labels, keyed by ring index, from `enforcement.md`'s
 * `## The model:` summary table (the same table `loadRings` reads). Throws on a
 * malformed doctrine — same contract as `parseEnforcementRegistry`.
 *
 * Keyed by row POSITION (row 0 = ring 0, row 1 = ring 1, row 2 = ring 2),
 * not by a "0 —"/"1 —"/"2 —" text prefix on the cell — the labels
 * themselves carry no numeric prefix (round-3 fix: dropped per Issue #508),
 * so a prefix match would no longer find anything. The 3-row length check
 * above is what actually guarantees the ring-0/1/2 order; position is a
 * reliable key once that's enforced. */
function ringLabels(enforcement: string): Record<0 | 1 | 2, string> {
  const lines = enforcement.split('\n')
  const summaryHeadingLine = findHeadingLine(lines, /^##\s*The model:/)
  if (!summaryHeadingLine) throw new Error('enforcement.md: could not find "## The model:" heading')
  const summaryTable = findTable(lines, summaryHeadingLine, false)
  if (summaryTable?.rows.length !== 3) {
    throw new Error('enforcement.md: summary table does not have exactly 3 rows (Ring 0/1/2)')
  }
  const byRow = summaryTable.rows.map((row) => (row.cells[0] ?? '').replace(/\*\*/g, '').trim())
  return { 0: byRow[0] ?? '', 1: byRow[1] ?? '', 2: byRow[2] ?? '' }
}

type RoleFrontmatter = {
  roleId: string
  title?: string
  order?: number
  description?: string
  summary?: string
  actorType?: 'agent' | 'human' | 'either'
}

function extractRole(content: string): RoleFrontmatter | null {
  const { data } = matter(content)
  if (typeof data.role_id !== 'string') return null
  return {
    roleId: data.role_id,
    title: typeof data.title === 'string' ? data.title : undefined,
    order: typeof data.order === 'number' ? data.order : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    actorType: data.actor === 'agent' || data.actor === 'human' || data.actor === 'either' ? data.actor : undefined
  }
}

type ContractFrontmatter = {
  contractId: string
  title?: string
  order?: number
  description?: string
  producer?: string
  consumer?: string
  summary?: string
}

function extractContract(content: string): ContractFrontmatter | null {
  const { data } = matter(content)
  if (typeof data.contract_id !== 'string') return null
  return {
    contractId: data.contract_id,
    title: typeof data.title === 'string' ? data.title : undefined,
    order: typeof data.order === 'number' ? data.order : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    producer: typeof data.producer === 'string' ? data.producer : undefined,
    consumer: typeof data.consumer === 'string' ? data.consumer : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined
  }
}

/**
 * The pure derivation. `doctrine` is already-read raw markdown; `config` is the
 * declarative enable/disable input (null = nothing disabled); `iteration` is
 * StateSource live context, passed through verbatim and never used to compute
 * render-state.
 */
export function deriveDiagramModel(
  doctrine: DoctrineContent,
  config: DiagramConfig | null,
  iteration: Iteration | null
): DiagramModel {
  const nodes: DiagramNode[] = []
  const edges: DiagramEdge[] = []
  const findings: DiagramFinding[] = []

  const labels = ringLabels(doctrine.enforcement)
  const ring1Disabled = config?.rings?.ring1_forgeWriteInterception === false
  const ring2Disabled = config?.rings?.ring2_asyncAudits === false

  // --- Ring nodes (Ring 0 has no ring-level switch) ---
  nodes.push({ id: 'ring:0', kind: 'ring', label: labels[0], ringIndex: 0, renderState: 'active' })
  nodes.push({
    id: 'ring:1',
    kind: 'ring',
    label: labels[1],
    ringIndex: 1,
    renderState: ring1Disabled ? 'disabled' : 'active'
  })
  nodes.push({
    id: 'ring:2',
    kind: 'ring',
    label: labels[2],
    ringIndex: 2,
    renderState: ring2Disabled ? 'disabled' : 'active'
  })

  // --- Gate (Ring 0) and check (Ring 1/2) nodes from the detail tables ---
  const gateRows = parseEnforcementRegistry(doctrine.enforcement)
  const usedSlugs = new Set<string>()
  const gateCheckSlugs = new Set<string>()
  // Track ring-0 gate nodes (label + id) for the `guards` keyword match.
  const ring0Gates: Array<{ id: string; label: string }> = []

  for (const row of gateRows) {
    const ringIndex: 0 | 1 | 2 = row.ring === 'ring0' ? 0 : row.ring === 'ring1' ? 1 : 2
    const kind: DiagramNodeKind = ringIndex === 0 ? 'gate' : 'check'
    const base = slugify(row.action)
    const slug = usedSlugs.has(base) ? `${base}-${row.line}` : base
    usedSlugs.add(slug)
    gateCheckSlugs.add(slug)
    const id = `${kind}:${slug}`

    let renderState: RenderState
    if (config?.gates?.[slug] === false) {
      renderState = 'disabled'
    } else if (ringIndex === 1 && ring1Disabled) {
      renderState = 'disabled'
    } else if (ringIndex === 2 && ring2Disabled) {
      renderState = 'disabled'
    } else {
      renderState = 'active'
    }

    nodes.push({
      id,
      kind,
      label: row.action,
      ringIndex,
      renderState,
      sourceLine: row.line,
      summary: row.summary,
      detail: row.description,
      category: row.category
    })
    if (ringIndex === 0) ring0Gates.push({ id, label: row.action })
  }

  // --- Action nodes (always active in v1) ---
  for (const action of ACTIONS) {
    nodes.push({
      id: `action:${action.id}`,
      kind: 'action',
      label: action.label,
      renderState: 'active',
      summary: action.summary,
      detail: action.description,
      crosses: action.crosses
    })
  }

  // --- Role nodes from roles/*.md frontmatter (skip files without role_id) ---
  const roleIds = new Set<string>()
  for (const file of doctrine.roles) {
    const role = extractRole(file.content)
    if (role === null) continue
    if (roleIds.has(role.roleId)) continue
    roleIds.add(role.roleId)
    nodes.push({
      id: `role:${role.roleId}`,
      kind: 'role',
      label: role.roleId,
      displayLabel: role.title,
      order: role.order,
      renderState: 'active',
      summary: role.summary,
      detail: role.description,
      actorType: role.actorType
    })
  }

  // --- Contract nodes from contracts/*.md frontmatter (skip without id) ---
  const contracts: ContractFrontmatter[] = []
  for (const file of doctrine.contracts) {
    const contract = extractContract(file.content)
    if (contract === null) continue
    contracts.push(contract)
    nodes.push({
      id: `contract:${contract.contractId}`,
      kind: 'contract',
      label: contract.contractId,
      displayLabel: contract.title,
      order: contract.order,
      renderState: 'active',
      summary: contract.summary,
      detail: contract.description
    })
  }

  // --- Edges ---
  // guards: ring-0 gate → into-github action, matched by CROSSING_KEYWORDS
  // (case-insensitive substring on the gate row label; one edge per match).
  for (const action of ACTIONS) {
    if (action.crosses !== 'into-github') continue
    const keyword = (CROSSING_KEYWORDS[action.id] ?? '').toLowerCase()
    if (keyword === '') continue
    for (const gate of ring0Gates) {
      if (!gate.label.toLowerCase().includes(keyword)) continue
      edges.push({
        id: `guards:${gate.id}:action:${action.id}`,
        kind: 'guards',
        from: gate.id,
        to: `action:${action.id}`
      })
    }
  }

  // performs: role → action for every ACTIONS.performedBy entry (the canonical
  // single source — the role's own `performs` frontmatter is intentionally not
  // re-read, so the two lists can never drift).
  for (const action of ACTIONS) {
    for (const roleId of action.performedBy) {
      edges.push({
        id: `performs:role:${roleId}:action:${action.id}`,
        kind: 'performs',
        from: `role:${roleId}`,
        to: `action:${action.id}`
      })
    }
  }

  // produces / consumes: role → contract from each contract's producer/consumer.
  for (const contract of contracts) {
    if (contract.producer !== undefined) {
      edges.push({
        id: `produces:role:${contract.producer}:contract:${contract.contractId}`,
        kind: 'produces',
        from: `role:${contract.producer}`,
        to: `contract:${contract.contractId}`
      })
    }
    if (contract.consumer !== undefined) {
      edges.push({
        id: `consumes:role:${contract.consumer}:contract:${contract.contractId}`,
        kind: 'consumes',
        from: `role:${contract.consumer}`,
        to: `contract:${contract.contractId}`
      })
    }
  }

  // --- Findings: config keys that reference no real gate/check slug. Config
  // references, never invents — surface the drift, don't silently drop it. ---
  for (const key of Object.keys(config?.gates ?? {})) {
    if (!gateCheckSlugs.has(key)) {
      findings.push({ configKey: key, reason: `config gates["${key}"] references no gate or check in doctrine` })
    }
  }

  return { nodes, edges, findings, iteration }
}
