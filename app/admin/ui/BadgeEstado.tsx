'use client'

import React from 'react'

export default function BadgeEstado({ estado }: { estado?: string | null }) {
  const e = (estado || '').toLowerCase()
  let cls = 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
  if (e === 'confirmado')  cls = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (e === 'pendiente')   cls = 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (e === 'en_proceso')  cls = 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
  if (e === 'cancelado')   cls = 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  if (e === 'finalizado')  cls = 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{e ? e.charAt(0).toUpperCase()+e.slice(1) : ''}</span>
}
