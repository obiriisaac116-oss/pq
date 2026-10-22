import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Past Questions',
  description: 'Browse, search and download past examination papers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
