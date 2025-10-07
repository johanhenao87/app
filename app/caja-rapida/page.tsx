'use client'

import { useEffect, useState } from 'react'
import { postJSON, loadSession } from '../lib/api'
import { useRouter } from 'next/navigation'

type Disponibilidad = {
  fecha: string
  cupoMax: number
  ocupados: number
  disponibles: number
  habilitado: boolean
}

export default function CajaRapidaPage() {
  const router = useRouter()
  const [disp, setDisp] = useState<Disponibilidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const u = loadSession()
    if (!u) return router.replace('/login')

    const hoy = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const fetchData = async () => {
      try {
        const d = await postJSON<Disponibilidad>('/api/caja-rapida/disponibilidad', { fecha: hoy })
        setDisp(d)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  async function agendar() {
    setError(null); setMsg(null)
    const u = loadSession()
    if (!u) return router.replace('/login')
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const r = await postJSON('/api/caja-rapida/agendar', {
        conductorId: u.id,
        fecha: hoy,
        usuario: u.cedula
      })
      setMsg(r.message || 'Agendado con éxito')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Caja Rápida</h1>

        {loading && <p className="text-gray-600">Cargando disponibilidad...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {msg && <p className="text-green-600">{msg}</p>}

        {disp && (
          <div className="space-y-4">
            <p className="text-gray-700">
              <span className="font-semibold">Fecha:</span> {disp.fecha}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Ocupados:</span> {disp.ocupados} / {disp.cupoMax}
            </p>
            <button
              disabled={!disp.habilitado}
              onClick={agendar}
              className={`w-full py-2 rounded-xl font-semibold transition-colors ${
                disp.habilitado
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              {disp.habilitado ? 'Agendar en Caja Rápida' : 'Sin disponibilidad'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
