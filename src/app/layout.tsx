import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { ViewTransitions } from 'next-view-transitions'
import { ToastProvider } from '@/components/ToastContext'
import { ProgressBar } from '@/components/ProgressBar'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'PastQuestions GH — TTU Past Exam Papers',
  description: 'Browse, search and download past examination papers for Takoradi Technical University.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-white text-gray-900">
        <ViewTransitions>
          <ToastProvider>
            <Suspense fallback={null}>
              <ProgressBar />
            </Suspense>
            {children}
          </ToastProvider>
        </ViewTransitions>
        <ServiceWorkerRegistration />
        <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300/60 select-none pointer-events-none z-50">
          ~hysterical
        </span>
      </body>
    </html>
  )
}
