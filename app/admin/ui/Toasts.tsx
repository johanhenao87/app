'use client'

import React, { useEffect, useState } from 'react'
import { TOAST_EVENT, type ToastPayload } from '../hooks/useToasts'

const DURATION = 3200

export function Toaster() {
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  useEffect(() => {
    const bus = typeof window === 'undefined' ? null : window
    if (!bus) return

    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastPayload>).detail
      if (!detail) return
      setToasts(prev => [...prev, detail])
      setTimeout(() => {
        setToasts(prev => prev.filter(item => item.id !== detail.id))
      }, DURATION)
    }

    bus.addEventListener(TOAST_EVENT, onToast as EventListener)
    return () => bus.removeEventListener(TOAST_EVENT, onToast as EventListener)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:right-6">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
