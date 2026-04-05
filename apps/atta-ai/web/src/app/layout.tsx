import type { ReactNode } from 'react'

export const metadata = {
  title: 'Atta AI',
  description: 'All your AI. One ecosystem.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
