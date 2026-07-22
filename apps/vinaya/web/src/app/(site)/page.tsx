import { Footer } from '@atta/ui/footer'
import { CtaSection } from './_components/CtaSection'
import { HeroSection } from './_components/HeroSection'
import { ProtectedSection } from './_components/ProtectedSection'
import { WorkflowSection } from './_components/WorkflowSection'
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

      {/* 5. Final next-steps — the only conversion area after Solution; the Solution CTA
          ("Get started") scrolls straight here. */}
      <main
        id='next-steps'
        className='mx-auto flex w-full max-w-[1120px] flex-col items-center justify-center px-6 py-20'
      >
        <CtaSection />
      </main>

      <Footer
        product='vinaya'
        tagline='Execution governance for software teams'
        links={[
          { label: 'The Harness', href: '/the-harness' },
          { label: 'Studio', href: '/the-studio' },
          { label: 'Install', href: '/install' },
          { label: 'Docs', href: '/docs' }
        ]}
      />
    </>
  )
}
