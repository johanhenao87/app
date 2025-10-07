'use client'

import React from 'react'

type Props = {
  show: boolean
  text?: string
}

export default function LoadingOverlay({ show, text = 'Cargando…' }: Props) {
  if (!show) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 shadow-xl px-6 py-5 border border-gray-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        <p className="text-sm font-medium text-gray-800">{text}</p>
      </div>
    </div>
  )
}
