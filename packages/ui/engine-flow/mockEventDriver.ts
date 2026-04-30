import type { Plan } from '@atta/engine'
import type { FlowEvent, FlowEventSource } from './events'

export interface MockDriverOptions {
  speed?: number
  loop?: boolean
}

function delay(ms: number, cancelled: { value: boolean }): Promise<void> {
  return new Promise((resolve) => {
    if (cancelled.value) {
      resolve()
      return
    }
    const id = setTimeout(resolve, ms)
    // Polling cleanup — if cancelled before timeout, resolve early
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

async function run(
  plan: Plan,
  emit: (event: FlowEvent) => void,
  options: MockDriverOptions,
  cancelled: { value: boolean }
): Promise<void> {
  const { nodes, edges, conditionalEdges, entryNode } = plan.graph
  const speed = options.speed ?? 1

  function ms(base: number): number {
    return Math.round(base / speed)
  }

  // Build adjacency maps
  const nextNodeMap = new Map<string, string>()
  for (const edge of edges) {
    nextNodeMap.set(edge.from, edge.to)
  }

  const conditionalMap = new Map<string, { ifTrue: string; ifFalse: string }>()
  for (const ce of conditionalEdges) {
    conditionalMap.set(ce.from, { ifTrue: ce.ifTrue, ifFalse: ce.ifFalse })
  }

  let currentId: string | null = entryNode
  let currentRound = -1

  while (currentId && !cancelled.value) {
    const node = nodes[currentId]
    if (!node) break

    // Round transition events
    const ri = node.metadata.roundIndex
    if (ri !== undefined && ri !== currentRound) {
      if (currentRound >= 0) {
        emit({ type: 'round:complete', round: currentRound })
        await delay(ms(250), cancelled)
      }
      currentRound = ri
      emit({ type: 'round:start', round: currentRound })
      await delay(ms(200), cancelled)
    }

    if (cancelled.value) break

    // Node lifecycle: queued → start → streaming → complete
    emit({ type: 'node:queued', nodeId: currentId })
    await delay(ms(180), cancelled)
    if (cancelled.value) break

    emit({ type: 'node:start', nodeId: currentId })

    // Running phase: 1–2s of "thinking"
    const thinkMs = ms(900 + Math.random() * 700)
    await delay(thinkMs * 0.45, cancelled)
    if (cancelled.value) break

    emit({ type: 'node:streaming', nodeId: currentId })
    await delay(thinkMs * 0.55, cancelled)
    if (cancelled.value) break

    emit({ type: 'node:complete', nodeId: currentId })

    // Determine next node
    const conditional = conditionalMap.get(currentId)
    let nextId: string | null = null

    if (conditional) {
      // Mock always takes ifFalse path (clean — no revision triggered)
      nextId = conditional.ifFalse === '__END__' ? null : conditional.ifFalse
    } else {
      nextId = nextNodeMap.get(currentId) ?? null
    }

    if (nextId && !cancelled.value) {
      emit({ type: 'edge:activate', from: currentId, to: nextId })
      // Small jitter between nodes (200–500ms) so parallel-feeling flows feel natural
      await delay(ms(200 + Math.random() * 200), cancelled)
    }

    currentId = nextId
  }

  if (!cancelled.value) {
    if (currentRound >= 0) {
      emit({ type: 'round:complete', round: currentRound })
      await delay(ms(200), cancelled)
    }
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
        // swallow cancellation rejections
      })

      return () => {
        cancelled.value = true
      }
    }
  }
}
