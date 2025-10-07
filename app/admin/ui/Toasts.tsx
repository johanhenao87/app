'use client'

import React, { useEffect, useState } from 'react'

type Toast = { id: string; type: 'success'|'error'|'info'; message: string }
const BUS = typeof window !== 'undefined' ? window : ({} as any)
const EVT = 'app:toast'

export function Toaster() {
  const [list, setList] = useState<Toast[]>([])

  useEffect(() => {
    function onToast(e: any) {
      const t: Toast = e.detail
      setList(prev => [...prev, t])
      setTimeout(() => {
        setList(prev => prev.filter(x => x.id !== t.id))
      }, 3200)
    }
    BUS.addEventListener?.(EVT, onToast)
    return () => BUS.removeEventListener?.(EVT, onToast)
  }, [])

  return (
    <div className="fixed bottom-3 right-3 z-[100] space-y-2">
      {list.map(t => (
        <div
          key={t.id}
          className={`min-w-[260px] max-w-[380px] rounded-xl px-3 py-2 shadow-lg border text-sm
            ${t.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
               t.type==='error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                                  'bg-slate-50 border-slate-200 text-slate-900'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
