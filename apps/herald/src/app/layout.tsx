import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Geist, Playfair_Display } from 'next/font/google'

import { DEFAULT_THEME_CSS } from '@/lib/default-theme'
import './globals.css'
import { cn } from '@/lib/utils'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Herald — Forensic Match Audit',
  description: 'Evidence-based match reports for recruiters and hiring managers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={cn(playfair.variable, dmMono.variable, dmSans.variable, 'font-sans', geist.variable)}>
      <head>
        <style id='herald-default-theme' dangerouslySetInnerHTML={{ __html: DEFAULT_THEME_CSS }} />
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  )
}
