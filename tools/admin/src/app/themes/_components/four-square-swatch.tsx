interface FourSquareSwatchProps {
  colors: [string, string, string, string] // [primary, secondary, accent, background]
  size?: number // px, default 28
}

export function FourSquareSwatch({ colors, size = 28 }: FourSquareSwatchProps) {
  const half = size / 2
  return (
    <div
      className='rounded overflow-hidden shrink-0'
      style={{ width: size, height: size }} // runtime dimension — justified
    >
      <div className='flex flex-wrap' style={{ width: size, height: size }}>
        {colors.map((color, i) => (
          <div key={i} style={{ width: half, height: half, backgroundColor: color }} />
        ))}
      </div>
    </div>
  )
}
