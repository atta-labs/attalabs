import { AuthProvider } from '@atta/auth/provider'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { AegLogo } from './components/AegLogo'
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
          <TopBar
            logo={
              <div className='flex items-center gap-2 text-foreground'>
                <AegLogo className='h-6 w-6' />
                <span className='font-serif text-lg tracking-tight'>AEG</span>
              </div>
            }
            isSignedIn={false}
          />
          <StudioShell>{children}</StudioShell>
        </AuthProvider>
      </body>
    </html>
  )
}
