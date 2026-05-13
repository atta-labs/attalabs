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
        Ready to deliberate.
      </Heading>
      <div className='flex flex-row flex-wrap items-center justify-center gap-4'>
        <Button variant='default' size='lg' onClick={() => router.push('/deliberate')}>
          Deliberate
        </Button>
        <Button variant='outline' size='lg' onClick={() => router.push('/trust')}>
          Learn More
        </Button>
      </div>
    </div>
  )
}

/**
 * Sibling product node for AttaLabs ecosystem (Vāda live, Vitakka concept, Sati concept).
 * Sati doesn't have CMS branding yet — uses a typographic fallback.
 */
function ProductNode({
  branding,
  alt,
  fallbackLetter,
  title,
  tagline,
  status
}: {
  branding: CMSBranding | null
  alt: string
  fallbackLetter: string
  title: string
  tagline: string
  status: string
}) {
  return (
    <div className='w-full border-[1.5px] border-foreground p-5 sm:p-6 text-center z-10 flex flex-col h-full shadow-[6px_6px_0_0_hsl(var(--foreground))] bg-background'>
      <div className='mb-3 flex justify-center text-foreground'>
        <ProductLogo
          branding={branding}
          alt={alt}
          fallback={<span className='font-serif italic text-[28px] leading-none'>{fallbackLetter}</span>}
          size={32}
        />
      </div>
      <div className='font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold text-foreground mb-1.5'>
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
              Schema-05 · The AttaLabs Ecosystem
            </div>
            <div className='font-serif text-sm sm:text-base font-medium text-foreground italic'>Vāda</div>
          </div>

          {/* Heading & Intro */}
          <div className='w-full max-w-4xl flex flex-col gap-4 mb-14 md:mb-20'>
            <Heading
              level={2}
              className='font-serif text-4xl sm:text-5xl md:text-6xl text-foreground leading-tight tracking-tight'
            >
              <span className='block'>Vāda is a product in AttaLabs.</span>
              <span className='block text-muted-foreground'>It also has a future role inside Atta.</span>
            </Heading>
            <Text as='p' className='text-foreground/80 leading-relaxed text-sm sm:text-base max-w-2xl'>
              AttaLabs is the lab — several products live here. Vāda is one of them, standalone today and accessible
              via the web app, MCP, and the API. A future product called Atta will compose Vāda with two other
              AttaLabs products into one deep-thinking AI.
            </Text>
          </div>

          {/* ============================================================
              TREE: AttaLabs root → sibling products → Atta composition
              ============================================================ */}

          <div className='bg-background/80 border border-border flex flex-col items-center w-full p-6'>
            {/* ROOT: AttaLabs (the lab, not a product) */}
            <div className='border-[2px] border-foreground p-5 sm:p-6 text-center w-full max-w-md z-10 shadow-[8px_8px_0_0_hsl(var(--foreground))] bg-background'>
              <div className='font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground mb-1.5'>
                AttaLabs · The lab
              </div>
              <div className='font-serif italic text-xs sm:text-sm text-muted-foreground leading-snug'>
                attalabs.dev — the home for everything we build.
              </div>
            </div>

            {/* TRUNK */}
            <div className='w-[2px] h-8 sm:h-12 bg-foreground z-10 relative'>
              <div className='absolute -bottom-[3px] -left-[3px] w-2 h-2 rounded-full bg-foreground hidden md:block' />
            </div>

            {/* SIBLING PRODUCTS: Vāda, Vitakka, Sati */}
            <div className='relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 pt-0 md:pt-10'>
              {/* Horizontal branch line (desktop) */}
              <div className='absolute top-0 left-[16.66%] right-[16.66%] h-[2px] bg-foreground hidden md:block z-0' />

              {/* Vāda */}
              <div className='relative flex justify-center'>
                <div className='absolute -top-10 left-1/2 w-[2px] h-10 bg-foreground hidden md:block z-0' />
                <div className='absolute -top-8 left-1/2 w-[2px] h-8 bg-foreground md:hidden z-0' />
                <ProductNode
                  branding={brandings.vada}
                  alt='Vāda'
                  fallbackLetter='V'
                  title='Vāda · Deliberation'
                  tagline='Multi-agent deliberation at a specific moment. Live today.'
                  status='Live · vada.attalabs.dev'
                />
              </div>

              {/* Vitakka */}
              <div className='relative flex justify-center'>
                <div className='absolute -top-10 left-1/2 w-[2px] h-10 bg-foreground hidden md:block z-0' />
                <div className='absolute -top-8 left-1/2 w-[2px] h-8 bg-foreground md:hidden z-0' />
                <ProductNode
                  branding={brandings.vitakka}
                  alt='Vitakka'
                  fallbackLetter='V'
                  title='Vitakka · Focus'
                  tagline='Applied focus — thinking with a goal over time.'
                  status='Concept · in design'
                />
              </div>

              {/* Sati */}
              <div className='relative flex justify-center'>
                <div className='absolute -top-10 left-1/2 w-[2px] h-10 bg-foreground hidden md:block z-0' />
                <div className='absolute -top-8 left-1/2 w-[2px] h-8 bg-foreground md:hidden z-0' />
                <ProductNode
                  branding={null}
                  alt='Sati'
                  fallbackLetter='S'
                  title='Sati · Memory'
                  tagline='The memory layer — what persists across thinking.'
                  status='Concept · in design'
                />
              </div>
            </div>

            {/* TRUNK DOWN to composition */}
            <div className='w-[2px] h-10 sm:h-14 bg-foreground/60 z-10 relative mt-12 md:mt-16' />

            {/* COMPOSITION: Atta = Vāda + Vitakka + Sati */}
            <div className='border-[1.5px] border-dashed border-foreground/70 p-5 sm:p-6 text-center w-full max-w-md z-10 bg-muted/20'>
              <div className='font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground mb-1.5'>
                Atta · Deep-thinking AI
              </div>
              <div className='font-serif italic text-xs sm:text-sm text-muted-foreground leading-snug mb-2'>
                A future product. Vāda + Vitakka + Sati, composed.
              </div>
              <div className='font-mono text-[8px] sm:text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase'>
                Not yet deployed
              </div>
            </div>

            {/* Footer Metadata */}
            <div className='w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 sm:mt-16 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60'>
              <div>Drawing · Eco-05-02</div>
              <div>Rev · 03</div>
              <div>Standalone today · Composable tomorrow</div>
            </div>
          </div>
        </div>
      </div>
      <CTABlock />
    </SectionWrapper>
  )
}
