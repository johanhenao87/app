'use client'

import React from 'react'

type Props = {
  title: string
  extra?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export default function Card({ title, extra, className, children }: Props) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className||''}`}>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {extra && <div className="text-xs text-slate-500 dark:text-slate-400">{extra}</div>}
      </div>
      <div className="p-2 sm:p-3">{children}</div>
    </div>
  )
}
