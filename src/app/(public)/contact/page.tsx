import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us | PastQuestions GH',
  description: 'Get in touch with the PastQuestions GH team.',
}

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+233592342667'
const PHONE = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? '+233592342667'
const EMAIL = 'obiriisaac116@gmail.com'

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Contact Us</h1>
      <p className="mb-8 text-gray-600">
        Have a question or want to report an issue? Reach us directly or send a message below.
      </p>

      {/* Contact cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center rounded-xl border border-green-100 bg-green-50 p-5 text-center hover:bg-green-100 transition-colors group"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
            <WhatsAppIcon />
          </span>
          <span className="text-sm font-semibold text-gray-800">WhatsApp</span>
          <span className="mt-1 text-sm text-green-700 group-hover:underline">{WHATSAPP}</span>
        </a>

        <a
          href={`tel:${PHONE}`}
          className="flex flex-col items-center rounded-xl border border-brand-primary/20 bg-blue-50 p-5 text-center hover:bg-blue-100 transition-colors group"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white">
            <PhoneIcon />
          </span>
          <span className="text-sm font-semibold text-gray-800">Phone</span>
          <span className="mt-1 text-sm text-brand-primary group-hover:underline">{PHONE}</span>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="flex flex-col items-center rounded-xl border border-purple-100 bg-purple-50 p-5 text-center hover:bg-purple-100 transition-colors group"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-white">
            <EmailIcon />
          </span>
          <span className="text-sm font-semibold text-gray-800">Email</span>
          <span className="mt-1 text-sm text-brand-accent group-hover:underline break-all">{EMAIL}</span>
        </a>
      </div>

      {/* Contact form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Send us a message</h2>
        <ContactForm />
      </div>
    </main>
  )
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.98-1.99a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,12 2,6"/>
    </svg>
  )
}
