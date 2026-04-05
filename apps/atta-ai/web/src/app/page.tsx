export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        position: 'relative'
      }}
    >
      {/* Ambient glow */}
      <div className='glow-orb' style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      {/* Mark */}
      <div
        className='fade-in'
        style={{
          fontSize: '4rem',
          fontWeight: 500,
          letterSpacing: '0.3em',
          textTransform: 'lowercase',
          color: 'var(--foreground)',
          position: 'relative',
          zIndex: 1
        }}
      >
        atta
      </div>

      {/* Pali meaning */}
      <div
        className='fade-in-slow delay-2'
        style={{
          fontSize: '0.75rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        self
      </div>

      {/* Subtle line */}
      <div
        className='fade-in-slow delay-3'
        style={{
          width: '40px',
          height: '1px',
          background: 'var(--muted)',
          marginTop: '3rem',
          opacity: 0.4,
          position: 'relative',
          zIndex: 1
        }}
      />
    </main>
  )
}
