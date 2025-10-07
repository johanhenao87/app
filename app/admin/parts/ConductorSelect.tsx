'use client'

import { useEffect, useState } from 'react'

type Conductor = {
  id: number
  cedula?: string
  nombre?: string
  telefono?: string
  tipo_vehiculo?: string | null
}

type Props = {
  value: number | ''              // ID del conductor seleccionado
  onChange: (id: number | '') => void
  onSelected?: (c: Conductor) => void
  placeholder?: string
}

export default function ConductorSelect({ value, onChange, onSelected, placeholder }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/conductores/search?q=${encodeURIComponent(q)}&limit=10`)
        const data = await res.json()
        if (active) {
          if (Array.isArray(data)) setResults(data as Conductor[])
          else setResults([])
        }
      } catch (err) {
        if (active) setResults([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [q])

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={e=> setQ(e.target.value)}
        placeholder={placeholder || "Buscar conductor..."}
        className="w-full border rounded px-3 py-2"
      />

      {loading && <div className="absolute right-2 top-2 text-xs text-slate-400">⏳</div>}

      {results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-56 overflow-auto">
          {results.map(c => (
            <div
              key={c.id}
              className={`px-3 py-2 hover:bg-slate-100 cursor-pointer ${value===c.id ? 'bg-slate-50 font-medium' : ''}`}
              onClick={()=>{
                onChange(c.id)
                if (onSelected) onSelected(c)
                setQ(`${c.nombre || ''} (${c.cedula || ''})`)
                setResults([])
              }}
            >
              <div>{c.nombre || '—'}</div>
              <div className="text-xs text-slate-500">{c.cedula || ''} {c.telefono ? `· ${c.telefono}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
