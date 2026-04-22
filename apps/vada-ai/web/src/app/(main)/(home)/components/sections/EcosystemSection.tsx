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
        <Button variant='outline' size='lg' onClick={() => router.push('/science')}>
          Read the Science
        </Button>
      </div>
    </div>
  )
}

export function EcosystemSection({ brandings }: EcosystemSectionProps) {
  return (
    <SectionWrapper id='ecosystem'>
      {/* The Master Blueprint Container */}
      <div className='relative w-full border border-border p-6 sm:p-10 md:p-14 overflow-hidden bg-background mb-16'>
        {/* Blueprint Grid Mask Layer */}
        <div
          className='absolute inset-0 pointer-events-none z-0 opacity-40'
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '-1px -1px',
            maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)'
          }}
        />

        <div className='relative z-10 flex flex-col items-center w-full'>
          {/* Top Header Row */}
          <div className='flex items-baseline justify-between w-full mb-8 sm:mb-12'>
            <div className='font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-muted-foreground'>
              Schema-05 · The Attā Ecosystem
            </div>
            <div className='font-serif text-sm sm:text-base font-medium text-foreground italic'>Vāda</div>
          </div>

          {/* Heading & Intro */}
          <div className='w-full max-w-4xl flex flex-col gap-4 mb-14 md:mb-20'>
            <Heading
              level={2}
              className='font-serif text-4xl sm:text-5xl md:text-6xl text-foreground leading-tight tracking-tight'
            >
              <span className='block'>Three products.</span>
              <span className='block'>One ecosystem.</span>
            </Heading>
            <Text as='p' className='text-foreground/80 leading-relaxed text-sm sm:text-base max-w-xl'>
              Vāda is a standalone product. It does not require any other product to work. But it belongs to a family.
            </Text>
          </div>

          {/* ============================================================
              THE TREE STRUCTURE 
              ============================================================ */}

          {/* ROOT NODE: Attā */}
          <div className='border-[2px] border-foreground bg-background p-6 sm:p-8 text-center w-full max-w-xs sm:max-w-md z-10 shadow-[8px_8px_0_0_hsl(var(--foreground))]'>
            <div className='mb-3 flex justify-center text-foreground'>
              <ProductLogo
                branding={brandings.atta}
                alt='Attā'
                fallback={<span className='font-serif italic text-[32px] leading-none'>A</span>}
                size={36}
              />
            </div>
            <div className='font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground mb-1.5'>
              Attā · Persistent Self
            </div>
            <div className='font-serif italic text-xs sm:text-sm text-muted-foreground leading-snug'>
              The substrate that makes memory possible.
            </div>
          </div>

          {/* TRUNK */}
          <div className='w-[2px] h-8 sm:h-12 bg-foreground z-10 relative'>
            {/* Center Joint (Desktop Only) */}
            <div className='absolute -bottom-[3px] -left-[3px] w-2 h-2 rounded-full bg-foreground hidden md:block' />
          </div>

          {/* BRANCHES & LEAVES */}
          <div className='relative w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-0 md:pt-10'>
            {/* Horizontal Branch Line (Desktop Only) */}
            <div className='absolute top-0 left-1/4 right-1/4 h-[2px] bg-foreground hidden md:block z-0' />

            {/* LEFT NODE: Vāda */}
            <div className='relative flex justify-center'>
              {/* Vertical Stem (Desktop Only) */}
              <div className='absolute -top-10 left-1/2 w-[2px] h-10 bg-foreground hidden md:block z-0' />
              {/* Mobile Fallback Stem */}
              <div className='absolute -top-8 left-1/2 w-[2px] h-8 bg-foreground md:hidden z-0' />

              <div className='w-full border-[1.5px] border-foreground bg-background p-6 sm:p-8 text-center z-10 flex flex-col h-full shadow-[8px_8px_0_0_hsl(var(--foreground))]'>
                <div className='mb-3 flex justify-center text-foreground'>
                  <ProductLogo
                    branding={brandings.vada}
                    alt='Vāda'
                    fallback={<span className='font-serif italic text-[28px] leading-none'>V</span>}
                    size={32}
                  />
                </div>
                <div className='font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold text-foreground mb-1.5'>
                  Vāda · Deliberation Engine
                </div>
                <div className='text-xs sm:text-[13px] text-muted-foreground leading-relaxed mb-4 flex-grow'>
                  Lateral — thinking in depth at a specific moment.
                </div>
                <div className='font-mono text-[8px] sm:text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase mt-auto'>
                  Standalone · Closed-Room
                </div>
              </div>
            </div>

            {/* RIGHT NODE: Vitakka */}
            <div className='relative flex justify-center'>
              {/* Vertical Stem (Desktop Only) */}
              <div className='absolute -top-10 left-1/2 w-[2px] h-10 bg-foreground hidden md:block z-0' />
              {/* Mobile Fallback Stem */}
              <div className='absolute -top-8 left-1/2 w-[2px] h-8 bg-foreground md:hidden z-0' />

              <div className='w-full border-[1.5px] border-foreground bg-background p-6 sm:p-8 text-center z-10 flex flex-col h-full shadow-[8px_8px_0_0_hsl(var(--foreground))]'>
                <div className='mb-3 flex justify-center text-foreground'>
                  <ProductLogo
                    branding={brandings.vitakka}
                    alt='Vitakka'
                    fallback={<span className='font-serif italic text-[28px] leading-none'>V</span>}
                    size={32}
                  />
                </div>
                <div className='font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold text-foreground mb-1.5'>
                  Vitakka · Applied Focus
                </div>
                <div className='text-xs sm:text-[13px] text-muted-foreground leading-relaxed mb-4 flex-grow'>
                  Longitudinal — thinking over time.
                </div>
                <div className='font-mono text-[8px] sm:text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase mt-auto'>
                  Standalone · Persistent
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className='w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-16 sm:mt-24 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60'>
            <div>Drawing · Eco-05-01</div>
            <div>Rev · 02</div>
            <div>Each Node Is Independent</div>
          </div>
        </div>
      </div>

      <CTABlock />
    </SectionWrapper>
  )
}
