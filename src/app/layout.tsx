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
      <body>
        {children}
        <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300 select-none pointer-events-none z-50">~hysterical</span>
      </body>
    </html>
  )
}
