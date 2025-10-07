'use client'

import React from 'react'
import ThemeToggle from './ThemeToggle'

export type AdminTopbarProps = {
  title?: string
  right?: React.ReactNode
  className?: string
}

export default function AdminTopbar({
  title = 'Panel administrativo',
  right,
  className = '',
}: AdminTopbarProps) {
  return (
    <header
      className={`sticky top-0 z-40 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 sm:px-4 ${className}`.trim()}
    >
      <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {right ?? <ThemeToggle />}
      </div>
    </header>
  )
}
