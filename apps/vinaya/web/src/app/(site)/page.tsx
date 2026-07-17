import { ArrowDown } from 'lucide-react'
import { Footer } from '@atta/ui/footer'
import { Heading, Text } from '@atta/ui/shared'
import { loadDoctrineQuestions } from '@/lib/doctrine-questions'
import { CtaSection } from './_components/CtaSection'
import { FeatureGrid } from './_components/FeatureGrid'
import { HeroSection } from './_components/HeroSection'
import { ProtectedSection } from './_components/ProtectedSection'
import { RandomQuestionText } from './_components/RandomQuestionText'
import { ScrollButton } from './_components/ScrollButton'

export default async function HomePage() {
  const questions = await loadDoctrineQuestions()

  return (
    <>
      <HeroSection />

      {/* Every section past the hero is a full 100vh screen (no topbar to subtract —
          by the time a user scrolls here it's off-screen) with its content vertically
          centered, so "Show me more" / "What is Vinaya" always land on a fully-centered
          next screen, never a partial peek of it. The subtitle + animated doctrine
          questions used to live in the hero — moved here (not deleted) once the hero
          switched to showing the era-canvas diagrams instead. */}
      <section id='eras' className='flex min-h-screen w-full flex-col items-center justify-center gap-6 px-6 py-8'>
        <div className='mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6'>
          <Heading
            level={2}
            className='mx-auto max-w-[900px] text-balance text-center font-sans text-2xl font-bold text-foreground sm:text-3xl md:text-4xl'
          >
            Code generation is free.
            <br />
            Engineering oversight is priceless.
          </Heading>

          {/* displayCount=5 (not the default 2) — this section has real vertical room to
              fill (min-h-screen, only a short subtitle above), so it reveals a longer
              list once and stays, rather than cycling in small replacing pairs. The
              button is passed as `action` (not a separate sibling here) so its fade-in
              timing and its gap from the bullets are both owned by the component that
              actually knows when the reveal finishes and how tall the bullets really
              rendered. */}
          <RandomQuestionText
            questions={questions}
            displayCount={5}
            action={
              <ScrollButton targetId='protected'>
                Meet Vinaya
                <ArrowDown className='size-5' />
              </ScrollButton>
            }
          />
        </div>
      </section>

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
        links={[
          { label: 'Known Limits', href: '/known-limits' },
          { label: 'The Harness', href: '/the-harness' }
        ]}
      />
    </>
  )
}
