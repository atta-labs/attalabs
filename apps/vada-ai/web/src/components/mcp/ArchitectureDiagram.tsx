export function ArchitectureDiagram() {
  const nodes = [
    { id: 'client', label: 'MCP Client', sub: 'Claude Desktop · Cursor · SDK' },
    { id: 'transport', label: 'stdio transport', sub: 'MCP protocol' },
    { id: 'server', label: 'Vāda MCP Server', sub: 'vada__consult · vada__deliberate' },
    { id: 'engine', label: 'Engine', sub: 'YAML → Plan → LangGraph' },
    { id: 'catalog', label: 'YAML Catalog', sub: 'sparring · crucible · war-room · …' }
  ]

  const nodeW = 148
  const nodeH = 52
  const gap = 20
  const totalW = nodes.length * nodeW + (nodes.length - 1) * gap
  const svgW = totalW + 48
  const svgH = 200
  const startX = 24
  const nodeY = 40
  const arrowY = nodeY + nodeH / 2
  const labelY = nodeY + nodeH + 24
  const returnY = labelY + 20

  function centerX(i: number): number {
    return startX + i * (nodeW + gap) + nodeW / 2
  }

  const firstCenter = centerX(0)
  const lastCenter = centerX(nodes.length - 1)

  return (
    <figure className='my-8 overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-4'>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width='100%'
        aria-label='Vāda MCP architecture: client to server to engine to catalog'
        role='img'
        className='min-w-[680px]'
      >
        <defs>
          <marker id='arr-fwd' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'>
            <path d='M0 0 L0 6 L8 3 z' className='fill-muted-foreground' style={{ fill: 'var(--muted-foreground)' }} />
          </marker>
          <marker id='arr-back' markerWidth='8' markerHeight='8' refX='2' refY='3' orient='auto-start-reverse'>
            <path d='M8 0 L8 6 L0 3 z' className='fill-muted-foreground' style={{ fill: 'var(--muted-foreground)' }} />
          </marker>
        </defs>

        {/* Forward arrows between adjacent nodes */}
        {nodes.slice(0, -1).map((_, i) => {
          const x1 = centerX(i) + nodeW / 2
          const x2 = centerX(i + 1) - nodeW / 2
          return (
            <line
              key={`fwd-${i}`}
              x1={x1}
              y1={arrowY}
              x2={x2 - 2}
              y2={arrowY}
              strokeWidth={1.5}
              markerEnd='url(#arr-fwd)'
              style={{ stroke: 'var(--muted-foreground)', opacity: 0.5 }}
            />
          )
        })}

        {/* Return path below nodes */}
        <path
          d={`M ${lastCenter} ${nodeY + nodeH + 8} L ${lastCenter} ${returnY} L ${firstCenter} ${returnY} L ${firstCenter} ${nodeY + nodeH + 8}`}
          fill='none'
          strokeWidth={1.5}
          strokeDasharray='4 3'
          markerEnd='url(#arr-back)'
          style={{ stroke: 'var(--primary)', opacity: 0.45 }}
        />
        <text
          x={(firstCenter + lastCenter) / 2}
          y={returnY + 14}
          textAnchor='middle'
          fontSize={10}
          style={{ fill: 'var(--muted-foreground)' }}
        >
          conclusion · session_url · cost_breakdown
        </text>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const cx = centerX(i)
          const x = cx - nodeW / 2
          const isServer = node.id === 'server'
          return (
            <g key={node.id}>
              <rect
                x={x}
                y={nodeY}
                width={nodeW}
                height={nodeH}
                rx={8}
                style={{
                  fill: isServer ? 'var(--primary)' : 'var(--card)',
                  stroke: isServer ? 'var(--primary)' : 'var(--border)',
                  strokeWidth: isServer ? 0 : 1,
                  opacity: isServer ? 0.15 : 1
                }}
              />
              <text
                x={cx}
                y={nodeY + 18}
                textAnchor='middle'
                fontSize={11}
                fontWeight={600}
                style={{ fill: 'var(--foreground)' }}
              >
                {node.label}
              </text>
              <text x={cx} y={nodeY + 33} textAnchor='middle' fontSize={9} style={{ fill: 'var(--muted-foreground)' }}>
                {node.sub}
              </text>
            </g>
          )
        })}

        {/* Step labels */}
        {nodes.map((node, i) => {
          const cx = centerX(i)
          return (
            <text
              key={`lbl-${node.id}`}
              x={cx}
              y={labelY}
              textAnchor='middle'
              fontSize={9}
              style={{ fill: 'var(--muted-foreground)', opacity: 0.7 }}
            >
              {i === 0 && 'tool call'}
              {i === 1 && 'validates + routes'}
              {i === 2 && 'compiles spec'}
              {i === 3 && 'auto-discovery'}
            </text>
          )
        })}
      </svg>
    </figure>
  )
}
