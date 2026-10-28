import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'PastQuestions GH — TTU Past Exam Papers',
  description: 'Browse, search and download past examination papers for Takoradi Technical University.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash: set class before first paint */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          try {
            var t = localStorage.getItem('theme');
            var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
          } catch(e){}
        `}</Script>
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        {children}
        <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300/60 select-none pointer-events-none z-50 dark:text-gray-600">
          ~hysterical
        </span>
      </body>
    </html>
  )
}
