import { MergeSceneCanvas } from './MergeSceneCanvas'
import { SectionTitle } from './SectionHeading'

// 04 · The result. A 420vh runway around one sticky full-viewport stage; the merge scene reads
// the section's own scroll position, so this component needs no client code of its own. The title
// and the mono log line are driven letter by letter by the scene (`data-letter-reveal`,
// `data-sub-reveal`); under reduced motion the runway collapses and the scene shows its end state.
export function HarnessDiagramSection() {
  return (
    <section className='relative h-[420vh] bg-background text-foreground motion-reduce:h-auto'>
      <div className='sticky top-0 flex h-screen flex-col overflow-hidden'>
        <div className='flex flex-col items-center gap-[0.6rem] px-10 pt-[calc(3.5rem+clamp(0.5rem,3vh,2rem))] text-center'>
          <SectionTitle size='compact' letterReveal>
            Your GitHub, perfectly structured
          </SectionTitle>
          <p
            data-sub-reveal='1'
            className='inline-flex items-center gap-[0.6em] font-mono text-[clamp(1.1rem,1.9vw,1.6rem)] leading-tight tracking-[-0.01em] text-muted-foreground [clip-path:inset(-0.2em_100%_-0.2em_0)]'
          >
            <span className='text-success'>›</span>
            <span>Your process, completely logged.</span>
            <span aria-hidden='true' className='inline-block h-[1.05em] w-[0.55em] bg-current opacity-70' />
          </p>
        </div>
        <div className='relative min-h-0 flex-1'>
          <MergeSceneCanvas />
        </div>
        <div className='h-[clamp(1.25rem,5vh,3rem)]' />
      </div>
    </section>
  )
}
