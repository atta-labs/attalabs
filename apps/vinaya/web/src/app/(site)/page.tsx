import { Footer } from '@atta/ui/footer'
import { CtaSection } from './_components/CtaSection'
import { EnergyFieldBg } from './_components/EnergyFieldBg'
import { HeroSection } from './_components/HeroSection'
import { ProtectedSection } from './_components/ProtectedSection'
import { WorkflowSection } from './_components/WorkflowSection'
import { HeroFabric } from './_components/hero-canvas/HeroFabric'
import { VinayaHeroEmblem } from './_components/hero-canvas/VinayaHeroEmblem'

// A three-chapter, full-viewport story built around the visual work. Only the Hero,
// Problem, and Solution are full-screen narrative sections; the lower content below flows
// normally.
//   1. Hero     — Promise + the harness animation
//   2. Problem  — ungoverned speed at human vs AI scale
//   3. Solution — governed execution, brief → merge (harness-wrapped main)
export default function HomePage() {
  return (
    <>
      {/* 1. Hero — "See how it works" jumps to the Problem section. */}
      <VinayaHeroEmblem />

      {/* 2. Problem — ungoverned speed at human vs AI scale. */}
      <div id='hero-classic'>
        <HeroSection />
      </div>

      {/* 3. Workflow — calm static breather: where Vinaya fits, plan → merge. */}
      <WorkflowSection />

      {/* 4. Solution — governed execution, brief → merge. */}
      <section
        id='protected'
        className='flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center px-6 py-8'
      >
        <div className='mx-auto w-full max-w-[1120px]'>
          <ProtectedSection />
        </div>
      </section>

      {/* 5. Final next-steps — sized to its content + padding, full width. The fabric layer
          is rendered at a FULL viewport height (same as the other sections) and clipped to
          this shorter section, so its squares read at the exact same scale instead of being
          squashed by the fixed grid into a short canvas. Footer stays plain (no fabric). */}
      <main
        id='next-steps'
        className='relative flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center overflow-hidden px-6 py-20'
      >
        <div className='pointer-events-none absolute inset-x-0 top-1/2 h-[calc(100vh-4rem)] -translate-y-1/2'>
          <HeroFabric />
          <EnergyFieldBg showGrid={false} />
        </div>
        <div className='relative z-10 mx-auto flex w-full max-w-[1120px] flex-col items-center'>
          <CtaSection />
        </div>
      </main>

      <Footer
        product='vinaya'
        tagline='Execution governance for software teams'
        links={[
          { label: 'The Harness', href: '/the-harness' },
          { label: 'Studio', href: '/the-studio' },
          { label: 'Start', href: '/start' },
          { label: 'CLI', href: '/cli' },
          { label: 'Docs', href: '/docs' }
        ]}
      />
    </>
  )
}
