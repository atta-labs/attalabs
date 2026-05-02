export function ConsumersDiagram() {
  const svgW = 480
  const svgH = 260

  // Central server node
  const cx = svgW / 2
  const cy = svgH / 2 - 10
  const serverW = 140
  const serverH = 52

  // Consumer nodes — left column: AI assistants, right column: Software clients
  const consumers = [
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      sub: 'macOS · Windows',
      x: 70,
      y: 60
    },
    {
      id: 'cursor',
      label: 'Cursor',
      sub: 'AI code editor',
      x: 70,
      y: 140
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      sub: 'CLI',
      x: 70,
      y: 220
    },
    {
      id: 'sdk',
      label: 'TypeScript SDK',
      sub: '@modelcontextprotocol/sdk',
      x: 410,
      y: 100
    },
    {
      id: 'custom',
      label: 'Custom software',
      sub: 'Any MCP client',
      x: 410,
      y: 190
    }
  ]

  const nodeW = 120
  const nodeH = 44

  // Connection endpoint: right edge of left nodes, left edge of right nodes
  function getEndpoints(consumer: (typeof consumers)[number]) {
    const isRight = consumer.x > cx
    const nx = consumer.x
    const ny = consumer.y + nodeH / 2
    if (isRight) {
      // right consumers connect from their left edge to the server right edge
      return {
        x1: nx - nodeW / 2,
        y1: ny,
        x2: cx + serverW / 2,
        y2: cy + serverH / 2
      }
    }
    // left consumers connect from their right edge to server left edge
    return {
      x1: nx + nodeW / 2,
      y1: ny,
      x2: cx - serverW / 2,
      y2: cy + serverH / 2
    }
  }

  return (
    <figure className='my-8 overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-4'>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width='100%'
        aria-label='Vāda MCP consumers: AI assistants and software clients connecting to the Vāda MCP server'
        role='img'
        className='min-w-[420px]'
      >
        <defs>
          <marker id='c-arr' markerWidth='7' markerHeight='7' refX='5' refY='3' orient='auto'>
            <path d='M0 0 L0 6 L7 3 z' style={{ fill: 'var(--muted-foreground)' }} />
          </marker>
        </defs>

        {/* Section labels */}
        <text
          x={70}
          y={28}
          textAnchor='middle'
          fontSize={10}
          fontWeight={600}
          style={{ fill: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          AI Assistants
        </text>
        <text
          x={410}
          y={60}
          textAnchor='middle'
          fontSize={10}
          fontWeight={600}
          style={{ fill: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Software
        </text>

        {/* Connection lines */}
        {consumers.map((consumer) => {
          const { x1, y1, x2, y2 } = getEndpoints(consumer)
          // Bezier curve for a smooth arc
          const dx = (x2 - x1) * 0.4
          const cp1x = x1 + dx
          const cp2x = x2 - dx
          return (
            <path
              key={`line-${consumer.id}`}
              d={`M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`}
              fill='none'
              strokeWidth={1.5}
              markerEnd='url(#c-arr)'
              style={{ stroke: 'var(--border)', opacity: 0.7 }}
            />
          )
        })}

        {/* Consumer nodes */}
        {consumers.map((consumer) => {
          const x = consumer.x - nodeW / 2
          const y = consumer.y
          return (
            <g key={consumer.id}>
              <rect
                x={x}
                y={y}
                width={nodeW}
                height={nodeH}
                rx={7}
                style={{ fill: 'var(--card)', stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <text
                x={consumer.x}
                y={y + 16}
                textAnchor='middle'
                fontSize={11}
                fontWeight={600}
                style={{ fill: 'var(--foreground)' }}
              >
                {consumer.label}
              </text>
              <text
                x={consumer.x}
                y={y + 30}
                textAnchor='middle'
                fontSize={9}
                style={{ fill: 'var(--muted-foreground)' }}
              >
                {consumer.sub}
              </text>
            </g>
          )
        })}

        {/* Central server node */}
        <rect
          x={cx - serverW / 2}
          y={cy}
          width={serverW}
          height={serverH}
          rx={10}
          style={{
            fill: 'var(--primary)',
            opacity: 0.12,
            stroke: 'var(--primary)',
            strokeWidth: 1.5,
            strokeOpacity: 0.4
          }}
        />
        <text
          x={cx}
          y={cy + 19}
          textAnchor='middle'
          fontSize={12}
          fontWeight={700}
          style={{ fill: 'var(--foreground)' }}
        >
          Vāda MCP Server
        </text>
        <text x={cx} y={cy + 34} textAnchor='middle' fontSize={9} style={{ fill: 'var(--muted-foreground)' }}>
          vada__consult · vada__deliberate
        </text>
      </svg>
    </figure>
  )
}
