export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        position: 'relative',
        padding: '4rem 2rem'
      }}
    >
      {/* Ambient glow */}
      <div className='glow-orb' style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      {/* Name — big serif */}
      <h1
        className='fade-in'
        style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: 'clamp(4rem, 10vw, 7rem)',
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: 'var(--foreground)',
          position: 'relative',
          zIndex: 1
        }}
      >
        Attā
      </h1>

      {/* Pali etymology — italic */}
      <p
        className='fade-in delay-1'
        style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '1.05rem',
          fontStyle: 'italic',
          color: 'var(--muted)',
          marginTop: '1rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        attā · from the Pāli, self
      </p>

      {/* Divider */}
      <div
        className='fade-in-slow delay-2'
        style={{
          width: '40px',
          height: '1px',
          background: 'var(--muted)',
          marginTop: '3rem',
          opacity: 0.5,
          position: 'relative',
          zIndex: 1
        }}
      />

      {/* Anchor word */}
      <p
        className='fade-in-slow delay-2'
        style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '1.25rem',
          color: 'var(--accent)',
          marginTop: '3rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        Awareness.
      </p>

      {/* Domain */}
      <p
        className='fade-in-slow delay-3'
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          position: 'absolute',
          bottom: '3rem',
          opacity: 0.4,
          zIndex: 1
        }}
      >
        atta.ai
      </p>
    </main>
  )
}
