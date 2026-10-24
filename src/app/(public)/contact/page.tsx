import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us | Past Questions',
  description: 'Get in touch with the Past Questions team.',
}

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Contact Us</h1>
      <p className="mb-8 text-gray-600">
        Have a question or want to report an issue? Send us a message.
      </p>
      <ContactForm />
    </main>
  )
}
