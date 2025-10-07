'use client'

import React, { useEffect, useRef, useState } from 'react'

type Item = { label: string; onClick: ()=>void; disabled?: boolean }
type Props = { items: Item[]; title?: string }

export default function DropdownMore({ items, title='Más acciones' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        title={title}
        onClick={()=> setOpen(o=>!o)}
        className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-20">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={()=>{ if (!it.disabled) { setOpen(false); it.onClick() } }}
              disabled={it.disabled}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
