'use client'

// src/components/ToastContext.tsx
//
// ToastProvider: wraps the app with a toast notification system and confirm dialog.
// Exports ToastProvider (context + UI) and useToast (hook for consumers).

import { createContext, useCallback, useContext, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastCtx = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  confirm: (message: string) => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Confirm dialog state
// ---------------------------------------------------------------------------

type ConfirmState = {
  message: string
  resolve: (value: boolean) => void
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timerRefs.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRefs.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), 4000)
      timerRefs.current.set(id, timer)
    },
    [dismiss],
  )

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve })
    })
  }, [])

  function handleConfirm(value: boolean) {
    if (confirmState) {
      confirmState.resolve(value)
      setConfirmState(null)
    }
  }

  return (
    <ToastContext.Provider value={{ success, error, info, confirm }}>
      {children}

      {/* Toast stack — fixed bottom-right */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={[
                'pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium',
                toast.variant === 'success' && 'bg-green-600 text-white',
                toast.variant === 'error' && 'bg-red-600 text-white',
                toast.variant === 'info' && 'bg-gray-800 text-white',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-message"
        >
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <p
              id="confirm-dialog-message"
              className="text-sm text-gray-800 leading-relaxed"
            >
              {confirmState.message}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
