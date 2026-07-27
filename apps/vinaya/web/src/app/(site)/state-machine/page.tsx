import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { StateMachineTables } from './_components/StateMachineTables'
import { loadStateMachineModel } from './_lib/load-state-machine'

export const metadata: Metadata = {
  title: 'State Machine — Vinaya',
  description:
    'What the harness reads, what it can conclude, and the ordered rules between the two — rendered from the model that performs the derivation, not transcribed from it.'
}

// A server component, and it stays one: `loadStateMachineModel` is
// `server-only` because `@atta/aeg-core`'s barrel reaches `node:child_process`.
// The model data is passed to `StateMachineTables` (also a server component),
// so nothing here is serialized and nothing crosses into the browser bundle.
export default function StateMachinePage() {
  const model = loadStateMachineModel()

  return (
    <main className='mx-auto flex max-w-6xl flex-col gap-12 px-8 py-8'>
      <section className='flex max-w-3xl flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          The state machine
        </Heading>
        <Text as='p' className='font-sans text-muted-foreground'>
          The forge is the source of truth. A task&rsquo;s status is never stored anywhere — it is derived, every time
          it is asked for, from what GitHub already knows: whether the Issue is open, whether a branch exists, whether a
          pull request is open or merged, what review decided. Labels carry only the facts the forge cannot express
          natively, one orthogonal fact each, and never status.
        </Text>
        <Text as='p' className='font-sans text-muted-foreground'>
          Every table below is rendered from the model that performs that derivation — the same list the deriver
          executes, not a copy of it. Add a fact, a label, a status or a rule in code and this page changes with it; no
          row here is maintained by hand.
        </Text>
      </section>

      <StateMachineTables model={model} />
    </main>
  )
}
