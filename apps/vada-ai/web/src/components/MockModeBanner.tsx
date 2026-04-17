'use client'

// Always-visible banner when NEXT_PUBLIC_VADA_MOCK_MODE=true.
// Rationale: the old silent server-side mock masked the original BYOK bug.
// A visible banner makes it impossible to miss that no real provider call
// is happening. See /trust.

export function MockModeBanner() {
  if (process.env.NEXT_PUBLIC_VADA_MOCK_MODE !== 'true') return null
  return (
    <div className='w-full bg-warning/20 py-2 text-center font-mono text-xs uppercase tracking-[0.2em] text-warning-foreground'>
      DEV MODE — no real provider calls are being made
    </div>
  )
}
