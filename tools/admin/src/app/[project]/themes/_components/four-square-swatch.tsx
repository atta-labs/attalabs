interface FourSquareSwatchProps {
  colors: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
  }
}

export function FourSquareSwatch({ colors }: FourSquareSwatchProps) {
  return (
    <div className='grid h-8 w-8 grid-cols-2 gap-0.5 overflow-hidden rounded'>
      <div className='rounded-sm' style={{ backgroundColor: colors.primary ?? '#888' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.secondary ?? '#666' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.accent ?? '#aaa' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.background ?? '#333' }} />
    </div>
  )
}
