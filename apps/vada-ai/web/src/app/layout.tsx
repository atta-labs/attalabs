import { AuthProvider } from '@atta/auth/provider'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
