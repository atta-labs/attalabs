import type { Plan } from '@atta/engine'
import type { FlowEvent, FlowEventSource } from './events'
import { planToVisualNodes } from './planToVisualNodes'
import type { RoundMeta } from './types'

export interface MockDriverOptions {
  speed?: number
  loop?: boolean
}

type WorkflowKind = 'solo' | 'brokered' | 'rounds' | 'custom'

function inferKind(plan: Plan): WorkflowKind {
  const nodes = Object.values(plan.graph.nodes)
  if (nodes.some((n) => n.role === 'round')) return 'rounds'
  if (nodes.some((n) => n.role === 'custom-step')) return 'custom'
  if (nodes.some((n) => n.id.startsWith('reviewer-'))) return 'brokered'
  return 'solo'
}

function delay(ms: number, cancelled: { value: boolean }): Promise<void> {
  return new Promise((resolve) => {
    if (cancelled.value) {
      resolve()
      return
    }
    const id = setTimeout(resolve, ms)
    const check = setInterval(() => {
      if (cancelled.value) {
        clearTimeout(id)
        clearInterval(check)
        resolve()
      }
    }, 50)
    setTimeout(() => clearInterval(check), ms + 100)
  })
}

async function fireNode(
  nodeId: string,
  emit: (e: FlowEvent) => void,
  ms: (base: number) => number,
  cancelled: { value: boolean }
): Promise<void> {
  if (cancelled.value) return
  emit({ type: 'node:queued', nodeId })
  await delay(ms(180), cancelled)
  if (cancelled.value) return
  emit({ type: 'node:start', nodeId })
  const thinkMs = ms(900 + Math.random() * 700)
  await delay(thinkMs * 0.45, cancelled)
  if (cancelled.value) return
  emit({ type: 'node:streaming', nodeId })
  await delay(thinkMs * 0.55, cancelled)
  if (cancelled.value) return
  emit({ type: 'node:complete', nodeId })
}

async function fireParallel(
  nodeIds: string[],
  jitterMs: number,
  emit: (e: FlowEvent) => void,
  ms: (base: number) => number,
  cancelled: { value: boolean }
): Promise<void> {
  await Promise.all(
    nodeIds.map(async (nodeId) => {
      if (jitterMs > 0) await delay(ms(Math.random() * jitterMs), cancelled)
      await fireNode(nodeId, emit, ms, cancelled)
    })
  )
}

async function runRounds(
  plan: Plan,
  rounds: RoundMeta[],
  emit: (e: FlowEvent) => void,
  ms: (base: number) => number,
  cancelled: { value: boolean }
): Promise<void> {
  const roundNodeIds = new Set(rounds.flatMap((r) => [...r.agentNodeIds, ...(r.synthNodeId ? [r.synthNodeId] : [])]))

  for (const round of rounds) {
    if (cancelled.value) break
    emit({ type: 'round:start', round: round.id })
    await delay(ms(200), cancelled)

    // All agents fire in parallel with up to 400ms jitter
    await fireParallel(round.agentNodeIds, 400, emit, ms, cancelled)
    if (cancelled.value) break

    // Round synthesizer fires after agents
    if (round.synthNodeId) {
      await delay(ms(250), cancelled)
      if (!cancelled.value) await fireNode(round.synthNodeId, emit, ms, cancelled)
    }

    if (!cancelled.value) {
      emit({ type: 'round:complete', round: round.id })
      await delay(ms(350), cancelled)
    }
  }

  // Fire any global terminal node (conclusion, not a round synth)
  const terminalNode = Object.values(plan.graph.nodes).find((n) => n.role === 'terminal' && !roundNodeIds.has(n.id))
  if (terminalNode && !cancelled.value) {
    await delay(ms(200), cancelled)
    await fireNode(terminalNode.id, emit, ms, cancelled)
  }
}

async function runBrokered(
  plan: Plan,
  emit: (e: FlowEvent) => void,
  ms: (base: number) => number,
  cancelled: { value: boolean }
): Promise<void> {
  const nodes = Object.values(plan.graph.nodes)
  const reviewerIds = nodes.filter((n) => n.id.startsWith('reviewer-')).map((n) => n.id)
  const terminalNode = nodes.find((n) => n.role === 'terminal')

  // All reviewers fire in parallel with up to 400ms jitter
  await fireParallel(reviewerIds, 400, emit, ms, cancelled)

  if (terminalNode && !cancelled.value) {
    await delay(ms(350), cancelled)
    await fireNode(terminalNode.id, emit, ms, cancelled)
  }
}

async function runSequential(
  plan: Plan,
  emit: (e: FlowEvent) => void,
  ms: (base: number) => number,
  cancelled: { value: boolean }
): Promise<void> {
  const { nodes, edges, conditionalEdges, entryNode } = plan.graph

  const nextMap = new Map<string, string>()
  for (const edge of edges) {
    nextMap.set(edge.from, edge.to)
  }

  const conditionalMap = new Map<string, { ifTrue: string; ifFalse: string }>()
  for (const ce of conditionalEdges) {
    conditionalMap.set(ce.from, { ifTrue: ce.ifTrue, ifFalse: ce.ifFalse })
  }

  let currentId: string | null = entryNode

  while (currentId && !cancelled.value) {
    const node = nodes[currentId]
    if (!node) break

    await fireNode(currentId, emit, ms, cancelled)
    if (cancelled.value) break

    const conditional = conditionalMap.get(currentId)
    let nextId: string | null = null
    if (conditional) {
      // Mock always takes the clean path (no revision triggered)
      nextId = conditional.ifFalse === '__END__' ? null : conditional.ifFalse
    } else {
      nextId = nextMap.get(currentId) ?? null
    }

    if (nextId && !cancelled.value) {
      emit({ type: 'edge:activate', from: currentId, to: nextId })
      await delay(ms(200 + Math.random() * 200), cancelled)
    }

    currentId = nextId
  }
}

async function run(
  plan: Plan,
  emit: (e: FlowEvent) => void,
  options: MockDriverOptions,
  cancelled: { value: boolean }
): Promise<void> {
  const speed = options.speed ?? 1
  function ms(base: number): number {
    return Math.round(base / speed)
  }

  const kind = inferKind(plan)

  if (kind === 'rounds') {
    const viz = planToVisualNodes(plan)
    await runRounds(plan, viz.rounds ?? [], emit, ms, cancelled)
  } else if (kind === 'brokered') {
    await runBrokered(plan, emit, ms, cancelled)
  } else {
    await runSequential(plan, emit, ms, cancelled)
  }

  if (!cancelled.value) {
    emit({ type: 'flow:complete' })
    if (options.loop && !cancelled.value) {
      await delay(ms(1200), cancelled)
      await run(plan, emit, options, cancelled)
    }
  }
}

export function mockEventDriver(plan: Plan, options: MockDriverOptions = {}): FlowEventSource {
  return {
    subscribe(handler) {
      const cancelled = { value: false }

      function emit(event: FlowEvent) {
        if (!cancelled.value) handler(event)
      }

      run(plan, emit, options, cancelled).catch(() => {
        // swallow cancellation
      })

      return () => {
        cancelled.value = true
      }
    }
  }
}
