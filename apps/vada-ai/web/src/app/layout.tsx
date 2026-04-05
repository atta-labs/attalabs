import type { ReactNode } from 'react'

export const metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
