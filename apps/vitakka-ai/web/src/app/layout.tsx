import type { Metadata } from 'next'
import { DM_Mono, Playfair_Display } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Vitakka',
  description: 'Directed thought.',
  icons: { icon: '/favicon.ico' }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' className={`${dmMono.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
