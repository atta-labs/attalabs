import { AuthProvider } from '@atta/auth/provider'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { StudioShell } from './components/StudioShell'

export const metadata: Metadata = {
  title: 'AEG Studio',
  description: 'Local governance studio for AEG artifacts.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' data-theme='dark'>
      <body className='min-h-screen bg-background text-foreground'>
        <AuthProvider>
          <StudioShell>{children}</StudioShell>
        </AuthProvider>
      </body>
    </html>
  )
}
