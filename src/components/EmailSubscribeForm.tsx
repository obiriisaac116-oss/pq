'use client'

// src/components/EmailSubscribeForm.tsx
//
// A compact email subscription form that POSTs to /api/subscribe.
// Shown on the home page between the hero and the filters.

import { useState } from 'react'
import type { FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function EmailSubscribeForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const json = (await res.json()) as { message?: string; error?: string }

      if (res.ok) {
        setStatus('success')
        setMessage(json.message ?? 'Subscribed successfully!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(json.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">Stay updated</p>
      <p className="mt-0.5 text-xs text-gray-500">
        Get notified when new papers are added
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="subscribe-email" className="sr-only">
          Email address
        </label>
        <input
          id="subscribe-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === 'loading' || status === 'success'}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>

      {message && (
        <p
          className={[
            'mt-2 text-xs font-medium',
            status === 'success' ? 'text-green-600' : 'text-red-600',
          ].join(' ')}
        >
          {message}
        </p>
      )}
    </div>
  )
}
