import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpec, compileSpec } from '@atta/engine'
import { TeamsClient } from './TeamsClient'

// All current specs are experimental, so listPublicSpecs() returns empty.
// Load all 9 by ID directly.
const SPEC_IDS = [
  'a0-baseline',
  'a1-baseline',
  'brokered-trio',
  'brokered-quartet',
  'vada-reviewers',
  'vada-reviewers-synthesis',
  'sparring',
  'crucible',
  'war-room'
]

// Placeholder question — only affects template rendering, not graph structure.
const PLACEHOLDER_QUESTION = 'What is the best approach for this challenge?'

function deriveShapeLabel(spec: ReturnType<typeof loadSpec>): string {
  if (spec.reviewers && spec.reviewers.length > 0) {
    const hasSynth = spec.response?.mode === 'synthesize'
    return `${spec.reviewers.length} reviewers · ${hasSynth ? 'with synthesis' : 'no synthesis'}`
  }
  if (spec.flow?.rounds) {
    const { count, agents } = spec.flow.rounds
    return `${agents.length} agents · ${count} rounds`
  }
  return 'single agent'
}

export default function TeamsPage() {
  // process.cwd() in Next.js = apps/vada-ai/web/ at dev time
  // yamls live at apps/vada-ai/yamls/, one directory up
  const yamlsDir = join(process.cwd(), '..', 'yamls')

  const specs = SPEC_IDS.map((id) => {
    const yaml = readFileSync(join(yamlsDir, `${id}.yaml`), 'utf-8')
    const spec = loadSpec(yaml)
    const plan = compileSpec(spec, PLACEHOLDER_QUESTION)
    return {
      spec,
      plan,
      agentCount: spec.agents.length,
      shapeLabel: deriveShapeLabel(spec)
    }
  })

  return <TeamsClient specs={specs} />
}
