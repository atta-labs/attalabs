import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin-shell'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Atta Admin',
  description: 'Atta AI developer tools'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' className='dark'>
      <body className='bg-background text-foreground antialiased'>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}
