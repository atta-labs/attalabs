'use client'

import type { CMSBranding } from '@atta/cms'
import { Button, Heading, Text } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { SectionWrapper } from '../primitives/SectionWrapper'

interface EcosystemBrandings {
  atta: CMSBranding | null
  vada: CMSBranding | null
  vitakka: CMSBranding | null
}

interface EcosystemSectionProps {
  brandings: EcosystemBrandings
}

interface ProductLogoProps {
  branding: CMSBranding | null
  alt: string
  fallback: ReactNode
  size: number
  className?: string
}

function ProductLogo({ branding, alt, fallback, size, className }: ProductLogoProps) {
  const lightUrl = branding?.logoSolidLight?.url
  const darkUrl = branding?.logoSolidDark?.url

  if (!lightUrl && !darkUrl) {
    return <>{fallback}</>
  }

  if (lightUrl && darkUrl) {
    return (
      <>
        <Image
          src={lightUrl}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className={cn(className, 'block dark:hidden')}
        />
        <Image
          src={darkUrl}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className={cn(className, 'hidden dark:block')}
        />
      </>
    )
  }

  return (
    <Image
      src={(darkUrl ?? lightUrl) as string}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={className}
    />
  )
}

function CTABlock() {
  const router = useRouter()
  return (
    <div className='flex flex-col items-center gap-8 py-10 text-center mt-8'>
      <Heading level={2} className='font-serif text-5xl md:text-7xl text-foreground leading-tight'>
        Ready to think deeply.
      </Heading>
      <div className='flex flex-row flex-wrap items-center justify-center gap-4'>
        <Button variant='default' size='lg' onClick={() => router.push('/deliberate')}>
          Launch a team
        </Button>
        <Button variant='outline' size='lg' onClick={() => router.push('/trust')}>
          Learn More
        </Button>
      </div>
    </div>
  )
}

/**
 * Sibling node for the AttaLabs systems map (Vāda live, Vitakka concept, Sati concept).
 * Sati doesn't have CMS branding yet — uses a typographic fallback.
 */
function SystemNode({
  branding,
  alt,
  fallbackLetter,
  title,
  tagline,
  status,
  emphasized = false
}: {
  branding: CMSBranding | null
  alt: string
  fallbackLetter: string
  title: string
  tagline: string
  status: string
  emphasized?: boolean
}) {
  return (
    <div
      className={cn(
        'w-full border-[1.5px] p-5 sm:p-6 text-center z-10 flex flex-col h-full bg-background',
        emphasized
          ? 'border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]'
          : 'border-foreground/40 shadow-[3px_3px_0_0_hsl(var(--foreground)/0.4)]'
      )}
    >
      <div className='mb-3 flex justify-center text-foreground'>
        <ProductLogo
          branding={branding}
          alt={alt}
          fallback={<span className='font-serif italic text-[28px] leading-none'>{fallbackLetter}</span>}
          size={32}
        />
      </div>
      <div
        className={cn(
          'font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold mb-1.5',
          emphasized ? 'text-foreground' : 'text-foreground/70'
        )}
      >
        {title}
      </div>
      <div className='text-xs sm:text-[13px] text-muted-foreground leading-relaxed mb-4 flex-grow'>{tagline}</div>
      <div className='font-mono text-[8px] sm:text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase mt-auto'>
        {status}
      </div>
    </div>
  )
}

export function EcosystemSection({ brandings }: EcosystemSectionProps) {
  return (
    <SectionWrapper id='ecosystem'>
      <div className='relative w-full p-6 sm:p-10 md:p-14 overflow-hidden mb-16'>
        <div className='relative z-10 flex flex-col items-center w-full'>
          {/* Top Header Row */}
          <div className='flex items-baseline justify-between w-full mb-8 sm:mb-12'>
            <div className='font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-muted-foreground'>
              Schema-05 · Where Vāda Sits
            </div>
            <div className='font-serif text-sm sm:text-base font-medium text-foreground italic'>Vāda</div>
          </div>

          {/* Heading & Intro — Vāda-first */}
          <div className='w-full max-w-4xl flex flex-col gap-4 mb-14 md:mb-20'>
            <Heading
              level={2}
              className='font-serif text-4xl sm:text-5xl md:text-6xl text-foreground leading-tight tracking-tight'
            >
              <span className='block'>Vāda is one system from AttaLabs.</span>
              <span className='block text-muted-foreground'>More are on the way.</span>
            </Heading>
            <Text as='p' className='text-foreground/80 leading-relaxed text-sm sm:text-base max-w-2xl'>
              AttaLabs is the lab. Vāda is the first system to ship from it — built on the Atta Engine, the
              deliberation runtime the lab maintains. Two further systems are in design.
            </Text>
          </div>

          {/* ============================================================
              MAP: Vāda emphasized; siblings present but understated.
              No AttaLabs root node — the schema header carries that.
              No "Atta composition" trunk — that's lab-future material,
              not Vāda-home material.
              ============================================================ */}

          <div className='bg-background/80 border border-border flex flex-col items-center w-full p-6 sm:p-8'>
            <div className='w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6'>
              {/* Vāda — emphasized */}
              <SystemNode
                branding={brandings.vada}
                alt='Vāda'
                fallbackLetter='V'
                title='Vāda · Deep thinking'
                tagline='A team of agents, multiple models, structured engagement on one decision. Live today.'
                status='Live · vada.attalabs.dev'
                emphasized
              />

              {/* Vitakka — sibling, in design */}
              <SystemNode
                branding={brandings.vitakka}
                alt='Vitakka'
                fallbackLetter='V'
                title='Vitakka · Applied focus'
                tagline='Sustained focus on a goal over time. A different shape of thinking.'
                status='In design'
              />

              {/* Sati — sibling, in design */}
              <SystemNode
                branding={null}
                alt='Sati'
                fallbackLetter='S'
                title='Sati · Memory'
                tagline='The memory layer — what persists across thinking.'
                status='In design'
              />
            </div>

            {/* Footer Metadata */}
            <div className='w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 sm:mt-14 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60'>
              <div>Drawing · Eco-05-03</div>
              <div>Rev · 04</div>
              <div>Built on the Atta Engine · AttaLabs</div>
            </div>
          </div>
        </div>
      </div>
      <CTABlock />
    </SectionWrapper>
  )
}
