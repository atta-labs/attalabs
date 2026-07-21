import { Footer } from '@atta/ui/footer'
import { Text } from '@atta/ui/shared'
import { CtaSection } from './_components/CtaSection'
import { FeatureGrid } from './_components/FeatureGrid'
import { HeroSection } from './_components/HeroSection'
import { ProtectedSection } from './_components/ProtectedSection'
import { VinayaHeroEmblem } from './_components/hero-canvas/VinayaHeroEmblem'

export default function HomePage() {
  return (
    <>
      {/* New harness hero on top — a scroll-space placeholder + a fixed canvas that fades
          out as it leaves view, so the sections below scroll normally in the same layer.
          "See More" jumps to the existing hero. */}
      <VinayaHeroEmblem />

      <div id='hero-classic'>
        <HeroSection />
      </div>

      {/* Every section past the hero is a full 100vh screen (no topbar to subtract — by the
          time a user scrolls here it's off-screen) with its content vertically centered. */}
      <section id='protected' className='flex min-h-screen w-full flex-col items-center justify-center px-6 py-8'>
        <div className='mx-auto w-full max-w-[1120px]'>
          <ProtectedSection />
        </div>
      </section>

      <main className='mx-auto flex max-w-[1120px] flex-col gap-12 px-6 pb-16 sm:gap-14'>
        <div className='flex flex-col gap-2'>
          <Text as='p' size='xl' weight='bold' className='text-center font-mono text-foreground'>
            Nothing reaches main without passing the same deterministic checks.
            <br />
            Human or Agent.
          </Text>
          <Text as='p' weight='bold' size='lg' className='text-center font-mono'>
            <span className='text-success'>full speed &middot; zero damage</span>
            <span className='text-muted-foreground'> &mdash; main is protected</span>
          </Text>
        </div>
        <FeatureGrid />
        <CtaSection />
      </main>

      <Footer
        product='vinaya'
        tagline='Discipline for the AI era'
        links={[{ label: 'The Harness', href: '/the-harness' }]}
      />
    </>
  )
}
