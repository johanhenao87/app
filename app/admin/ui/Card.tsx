'use client'

import React from 'react'

export type CardProps = {
  title: string
  extra?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export default function Card({ title, extra, className = '', children }: CardProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`.trim()}
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h2>
        {extra && <div className="text-xs text-slate-500 dark:text-slate-400">{extra}</div>}
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  )
}
