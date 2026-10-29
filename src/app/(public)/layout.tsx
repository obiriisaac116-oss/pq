import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+233592342667'
  const phoneNumber = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? '+233592342667'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-brand-primary font-bold text-lg hover:opacity-80"
          >
            <Image
              src="/ttu-logo.jpg"
              alt="TTU"
              width={32}
              height={32}
              className="rounded-md object-cover"
            />
            PastQuestions GH
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/courses"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Courses
            </Link>
            <Link
              href="/bookmarks"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Saved
            </Link>
            <Link
              href="/contact"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="flex-1">
        {children}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Image src="/ttu-logo.jpg" alt="TTU" width={32} height={32} className="rounded-md object-cover" />
                <p className="text-base font-bold text-brand-primary">PastQuestions GH</p>
              </div>
              <p className="mt-1 text-sm text-gray-500">Past exam papers for Takoradi Technical University students.</p>
              <p className="mt-2 text-sm text-gray-400">Built with ❤️ for TTU students</p>
            </div>
            {/* Quick links */}
            <div>
              <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick links</p>
              <ul className="mt-2 space-y-1">
                <li><Link href="/" className="text-sm text-gray-600 hover:text-brand-primary hover:underline">Home</Link></li>
                <li><Link href="/courses" className="text-sm text-gray-600 hover:text-brand-primary hover:underline">Courses</Link></li>
                <li><Link href="/bookmarks" className="text-sm text-gray-600 hover:text-brand-primary hover:underline">Bookmarks</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-600 hover:text-brand-primary hover:underline">Contact</Link></li>
              </ul>
            </div>
            {/* Contact info */}
            <div>
              <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact us</p>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600"
                  >
                    <WhatsAppIcon />
                    {whatsappNumber}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${phoneNumber}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-primary"
                  >
                    <PhoneIcon />
                    {phoneNumber}
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:obiriisaac116@gmail.com"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-primary"
                  >
                    <EmailIcon />
                    obiriisaac116@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/obiriisaac116-oss/pq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <GitHubIcon />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
            © 2026 PastQuestions GH. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.98-1.99a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,12 2,6"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
    </svg>
  )
}
