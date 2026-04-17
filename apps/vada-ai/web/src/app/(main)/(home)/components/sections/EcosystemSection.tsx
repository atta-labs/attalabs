'use client'

import type { CMSBranding } from '@atta/cms'
import { Button, Heading, Text } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { FlowArrow } from '../primitives/FlowArrow'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'

interface EcosystemBrandings {
  atta: CMSBranding | null
  vada: CMSBranding | null
  vitakka: CMSBranding | null
}

interface EcosystemSectionProps {
  brandings: EcosystemBrandings
}

interface GlyphProps {
  className?: string
}

function AttaGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M 6 26 L 16 6 L 26 26' />
      <path d='M 10 22 C 12 19, 20 19, 22 22 C 20 25, 12 25, 10 22 Z' />
      <circle cx={16} cy={22} r={1.3} fill='currentColor' />
    </svg>
  )
}

function VitakkaGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M 6 8 L 16 26 L 26 8' />
      <circle cx={16} cy={15} r={3.4} />
      <circle cx={16} cy={15} r={1.1} fill='currentColor' />
    </svg>
  )
}

function VadaGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M 6 8 L 16 26 L 26 8' />
      <line x1={11} y1={12} x2={21} y2={12} />
      <line x1={11} y1={12} x2={16} y2={19} />
      <line x1={21} y1={12} x2={16} y2={19} />
      <circle cx={11} cy={12} r={1.3} fill='currentColor' />
      <circle cx={21} cy={12} r={1.3} fill='currentColor' />
      <circle cx={16} cy={19} r={1.3} fill='currentColor' />
    </svg>
  )
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

interface ProductTileProps {
  branding: CMSBranding | null
  fallbackGlyph: ReactNode
  name: string
  tagline: string
}

function ProductTile({ branding, fallbackGlyph, name, tagline }: ProductTileProps) {
  return (
    <div className='flex h-full flex-col items-center gap-3 rounded-md border border-border bg-card p-6 text-center'>
      <div className='text-foreground'>
        <ProductLogo branding={branding} alt={name} fallback={fallbackGlyph} size={40} />
      </div>
      <Text as='small' className='font-mono uppercase tracking-widest text-xs text-foreground'>
        {name}
      </Text>
      <Text as='p' className='text-sm text-muted-foreground'>
        {tagline}
      </Text>
    </div>
  )
}

function AttaSubstrate({ brandings }: EcosystemSectionProps) {
  return (
    <div className='rounded-xl border border-border bg-card/20 p-6 md:p-10'>
      <div className='mb-10 flex flex-col items-center gap-2 text-center'>
        <div className='text-muted-foreground'>
          <ProductLogo branding={brandings.atta} alt='Attā' fallback={<AttaGlyph className='size-8' />} size={32} />
        </div>
        <Text as='small' className='font-mono uppercase tracking-widest text-xs text-muted-foreground'>
          Attā · Persistent Self
        </Text>
        <Text as='p' className='italic text-xs text-muted-foreground/80'>
          The substrate that makes memory possible.
        </Text>
      </div>

      <div className='grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6'>
        <ProductTile
          branding={brandings.vada}
          fallbackGlyph={<VadaGlyph className='size-10' />}
          name='Vāda · Deliberation Engine'
          tagline='Lateral — thinking in depth at a specific moment.'
        />
        <FlowArrow direction='responsive' />
        <ProductTile
          branding={brandings.vitakka}
          fallbackGlyph={<VitakkaGlyph className='size-10' />}
          name='Vitakka · Applied Focus'
          tagline='Longitudinal — thinking over time.'
        />
      </div>
    </div>
  )
}

function CTABlock() {
  const router = useRouter()
  return (
    <div className='flex flex-col items-center gap-8 py-10 text-center'>
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
      <div className='flex flex-col gap-24 md:gap-32'>
        <div className='flex flex-col gap-10'>
          <SectionLabel>05 / The Attā Ecosystem</SectionLabel>
          <Heading level={2} className='font-serif text-4xl md:text-6xl text-foreground leading-tight'>
            <span className='block'>Three products.</span>
            <span className='block'>One ecosystem.</span>
          </Heading>
          <Text as='p' className='max-w-xl text-muted-foreground leading-relaxed'>
            Vāda is a standalone product. It does not require any other product to work. But it belongs to a family.
          </Text>

          <div className='pt-4'>
            <AttaSubstrate brandings={brandings} />
          </div>
        </div>

        <CTABlock />
      </div>
    </SectionWrapper>
  )
}
