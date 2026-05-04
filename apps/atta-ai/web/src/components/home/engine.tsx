import { Heading, Text } from '@atta/ui/shared'

export function Engine() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-2xl'>
        <Heading level={2} className='mb-8 font-serif text-2xl text-foreground'>
          The engine
        </Heading>
        <Text as='p' className='mb-12 text-base leading-relaxed text-muted-foreground'>
          Every Atta product is built on the same deliberation engine. The engine that runs Vāda's
          debates is the same engine that will run Vitakka's focused work — and Atta's composed
          self. One substrate, different surfaces.
        </Text>

        {/* Architecture diagram */}
        <div className='mb-6'>
          <svg
            viewBox='0 0 480 270'
            className='w-full text-foreground'
            aria-hidden='true'
            role='presentation'
          >
            {/* Product name labels */}
            <text
              x='95'
              y='15'
              textAnchor='middle'
              fontSize='13'
              fill='currentColor'
              fillOpacity={0.85}
              className='font-serif'
            >
              Vāda
            </text>
            <text
              x='240'
              y='15'
              textAnchor='middle'
              fontSize='13'
              fill='currentColor'
              fillOpacity={0.85}
              className='font-serif'
            >
              Vitakka
            </text>
            <text
              x='385'
              y='15'
              textAnchor='middle'
              fontSize='13'
              fill='currentColor'
              fillOpacity={0.85}
              className='font-serif'
            >
              Atta
            </text>

            {/* Vāda column — filled */}
            <rect
              x='35'
              y='28'
              width='120'
              height='182'
              fill='currentColor'
              fillOpacity={0.12}
              stroke='currentColor'
              strokeWidth={1}
              strokeOpacity={0.55}
            />

            {/* Vitakka column — outlined */}
            <rect
              x='180'
              y='50'
              width='120'
              height='160'
              fill='none'
              stroke='currentColor'
              strokeWidth={1}
              strokeOpacity={0.35}
            />

            {/* Atta column — outlined dashed, slightly larger */}
            <rect
              x='325'
              y='14'
              width='120'
              height='196'
              fill='none'
              stroke='currentColor'
              strokeWidth={1}
              strokeDasharray='5 3'
              strokeOpacity={0.3}
            />

            {/* Engine bar */}
            <rect
              x='15'
              y='212'
              width='450'
              height='22'
              fill='none'
              stroke='currentColor'
              strokeWidth={1}
              strokeOpacity={0.22}
            />

            {/* @atta/engine label */}
            <text
              x='240'
              y='227'
              textAnchor='middle'
              fontSize='11'
              fill='currentColor'
              fillOpacity={0.4}
              className='font-mono'
            >
              @atta/engine
            </text>

            {/* Column captions */}
            <text
              x='95'
              y='248'
              textAnchor='middle'
              fontSize='10'
              fill='currentColor'
              fillOpacity={0.3}
            >
              deliberation primitives
            </text>
            <text
              x='240'
              y='248'
              textAnchor='middle'
              fontSize='10'
              fill='currentColor'
              fillOpacity={0.3}
            >
              focus continuity
            </text>
            <text
              x='385'
              y='248'
              textAnchor='middle'
              fontSize='10'
              fill='currentColor'
              fillOpacity={0.3}
            >
              composed self
            </text>

            {/* Time / persistence arrow */}
            <text
              x='465'
              y='266'
              textAnchor='end'
              fontSize='9'
              fill='currentColor'
              fillOpacity={0.18}
            >
              time / persistence →
            </text>
          </svg>
        </div>

        <Text as='p' className='text-xs text-muted-foreground/50'>
          Available as a TypeScript package and as an MCP server.
        </Text>
      </div>
    </section>
  )
}
