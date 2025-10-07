'use client'

import React from 'react'

const ESTADO_STYLES: Record<string, string> = {
  confirmado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  en_proceso: 'bg-sky-50 text-sky-700 ring-sky-200',
  cancelado: 'bg-rose-50 text-rose-700 ring-rose-200',
  finalizado: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
}

export default function BadgeEstado({ estado }: { estado?: string | null }) {
  const key = (estado ?? '').toLowerCase()
  const base = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1'
  const fallback = 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
  const label = key ? key.replace(/_/g, ' ') : ''

  return <span className={`${base} ${ESTADO_STYLES[key] ?? fallback}`}>{label ? label.charAt(0).toUpperCase() + label.slice(1) : ''}</span>
}
