import { Heading } from '@atta/ui/shared'
import { CtaSection } from './_components/CtaSection'
import { FeatureGrid } from './_components/FeatureGrid'
import { HeroSection } from './_components/HeroSection'
import { LandingFooter } from './_components/LandingFooter'
import { ProtectedSection } from './_components/ProtectedSection'
import { TwoErasSection } from './_components/TwoErasSection'

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <section id='eras' className='flex min-h-screen w-full flex-col items-center justify-center gap-10 px-6 py-16'>
        <div className='mx-auto flex w-full max-w-[1120px] flex-col gap-10'>
          <Heading
            level={2}
            className='mx-auto max-w-[900px] text-balance text-center font-sans text-2xl font-bold text-foreground sm:text-3xl md:text-4xl'
          >
            Your agents got faster.
            <br />
            Your main branch didn&rsquo;t get any tougher.
          </Heading>
          <TwoErasSection />
        </div>
      </section>

      <section id='protected' className='flex min-h-screen w-full flex-col items-center justify-center px-6 py-16'>
        <div className='mx-auto w-full max-w-[1120px]'>
          <ProtectedSection />
        </div>
      </section>

      <main className='mx-auto flex max-w-[1120px] flex-col gap-12 px-6 pb-16 sm:gap-14'>
        <FeatureGrid />
        <CtaSection />
        <LandingFooter />
      </main>
    </>
  )
}
