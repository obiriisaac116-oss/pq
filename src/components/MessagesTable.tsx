'use client'

// src/components/MessagesTable.tsx
//
// Interactive messages table for the admin area.
// Mark read / unread via PATCH /api/messages/[id] (inline route).
// Uses an inline API route pattern — we call /api/messages directly.

import { useState } from 'react'

import type { ContactMessagesRow } from '@/types/database'
import { useToast } from '@/components/ToastContext'

type Props = {
  initialMessages: ContactMessagesRow[]
}

export function MessagesTable({ initialMessages }: Props) {
  const toast = useToast()
  const [messages, setMessages] =
    useState<ContactMessagesRow[]>(initialMessages)
  const [busy, setBusy] = useState<string | null>(null)

  async function toggleRead(msg: ContactMessagesRow) {
    setBusy(msg.id)
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !msg.read }),
      })
      if (!res.ok) throw new Error('Failed to update message')
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: !m.read } : m)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
        No messages yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <article
          key={msg.id}
          className={[
            'rounded-lg border p-4 shadow-sm',
            msg.read
              ? 'border-gray-200 bg-white'
              : 'border-brand-primary/30 bg-blue-50',
          ].join(' ')}
          aria-label={`Message from ${msg.name}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{msg.name}</span>
                {!msg.read && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-medium text-white">
                    New
                  </span>
                )}
              </div>
              <a
                href={`mailto:${msg.email}`}
                className="text-sm text-brand-primary hover:underline"
              >
                {msg.email}
              </a>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {msg.message}
              </p>
              <time
                dateTime={msg.created_at}
                className="mt-1 block text-xs text-gray-400"
              >
                {new Date(msg.created_at).toLocaleString()}
              </time>
            </div>

            <button
              onClick={() => toggleRead(msg)}
              disabled={busy === msg.id}
              className="shrink-0 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === msg.id ? '…' : msg.read ? 'Mark unread' : 'Mark read'}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
