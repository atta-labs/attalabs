import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { StateMachineDiagram } from './_components/StateMachineDiagram'
import { StateMachineTables } from './_components/StateMachineTables'
import { deriveDiagramGroups, loadStateMachineModel } from './_lib/load-state-machine'

export const metadata: Metadata = {
  title: 'State Machine — Vinaya',
  description:
    'What the harness reads, what it can conclude, and the ordered rules between the two — rendered from the model that performs the derivation, not transcribed from it.'
}

// A server component, and it stays one: `loadStateMachineModel` is
// `server-only` because `@attalabs/aeg-core`'s barrel reaches `node:child_process`.
// The model data is passed to `StateMachineTables` (also a server component),
// so nothing here is serialized and nothing crosses into the browser bundle.
export default function StateMachinePage() {
  const model = loadStateMachineModel()

  return (
    <main className='mx-auto flex max-w-6xl flex-col gap-12 px-8 py-8'>
      {/* Intro beside the diagram on `lg`+, stacked (diagram second) below it —
          the diagram is a summary of the intro, so it reads correctly in either
          order. `items-start` keeps the diagram card at its natural height
          instead of stretching to the taller prose column. */}
      <section className='grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]'>
        <div className='flex flex-col gap-4'>
          <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
            The state machine
          </Heading>
          <Text as='p' className='font-sans text-muted-foreground'>
            The forge is the source of truth. A task&rsquo;s status is never stored anywhere — it is derived, every time
            it is asked for, from what GitHub already knows: whether the Issue is open, whether a branch exists, whether
            a pull request is open or merged, what review decided. Labels carry only the facts the forge cannot express
            natively, one orthogonal fact each, and never status.
          </Text>
          <Text as='p' className='font-sans text-muted-foreground'>
            Every table below is rendered from the model that performs that derivation — the same list the deriver
            executes, not a copy of it. Add a fact, a label, a status or a rule in code and this page changes with it;
            no row here is maintained by hand.
          </Text>
          <Text as='p' className='font-sans text-muted-foreground'>
            Rendered in four tables below: the facts it reads (the source of truth), the labels and what each one
            carries, the statuses it derives, and the ordered rules that derive them.
          </Text>
        </div>

        <StateMachineDiagram groups={deriveDiagramGroups(model)} />
      </section>

      <StateMachineTables model={model} />
    </main>
  )
}
