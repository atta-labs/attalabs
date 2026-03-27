import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

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
  title: 'Herald — Forensic Engineering Audit',
  description: 'Evidence-based engineering match reports for recruiters and hiring managers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={`${playfair.variable} ${dmMono.variable} ${dmSans.variable}`}>
      <body className='bg-background text-foreground min-h-screen'>{children}</body>
    </html>
  )
}
