import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PastQuestions GH — TTU Past Exam Papers',
  description: 'Browse, search and download past examination papers for Takoradi Technical University.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        {children}
        <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300/60 select-none pointer-events-none z-50">
          ~hysterical
        </span>
      </body>
    </html>
  )
}
