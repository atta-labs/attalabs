import type { ReactNode } from 'react'

export const metadata = {
  title: 'Vitakka AI',
  description: 'Focus and applied thought.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
