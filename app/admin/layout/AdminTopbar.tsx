'use client'

import React from 'react'
import ThemeToggle from './ThemeToggle'

type Props = {
  title?: string
  right?: React.ReactNode
  className?: string
}

export default function AdminTopbar({ title = 'Panel administrativo', right, className }: Props) {
  return (
    <div className={`sticky top-0 z-40 bg-white dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 flex items-center gap-2 ${className||''}`}>
      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</div>
      <div className="ml-auto flex items-center gap-2">
        {right}
        {/* Fallback: si no pasan right, mostramos el ThemeToggle */}
        {!right && <ThemeToggle />}
      </div>
    </div>
  )
}
