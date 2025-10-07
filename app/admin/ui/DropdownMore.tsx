'use client'

import React, { useEffect, useRef, useState } from 'react'

export type DropdownItem = {
  label: string
  onClick: () => void
  disabled?: boolean
}

export type DropdownMoreProps = {
  items: DropdownItem[]
  title?: string
}

export default function DropdownMore({ items, title = 'Más acciones' }: DropdownMoreProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function handleToggle() {
    setOpen(value => !value)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl leading-none transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                setOpen(false)
                item.onClick()
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
