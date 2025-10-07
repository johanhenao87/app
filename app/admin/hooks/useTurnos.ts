'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { TurnoAdmin } from '../lib/types'
import { hmLocalToMinutes } from '../lib/date'
import { postJSON } from '../../lib/api'

export function useTurnos(fecha: string, estado: string, vehType: string) {
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const data = await postJSON<TurnoAdmin[]>('/api/turnos/dia', { fecha })
      let lista = data
      if (estado !== 'todos') lista = lista.filter(t => (t.estado || '').toLowerCase() === estado)
      if (vehType !== 'todos') lista = lista.filter(t => (t.tipo_vehiculo_turno || '').toUpperCase() === vehType)
      lista.sort((a, b) => hmLocalToMinutes(a.hora) - hmLocalToMinutes(b.hora))
      setTurnos(lista)
    } catch (e:any) {
      setError(e.message || 'No fue posible cargar los turnos.')
      setTurnos([])
    } finally { setLoading(false) }
  }, [fecha, estado, vehType])

  useEffect(() => { cargar() }, [cargar])

  const kpis = useMemo(() => {
    const total        = turnos.length
    const confirmado   = turnos.filter(t => (t.estado||'').toLowerCase()==='confirmado').length
    const pendiente    = turnos.filter(t => (t.estado||'').toLowerCase()==='pendiente').length
    const cancelado    = turnos.filter(t => (t.estado||'').toLowerCase()==='cancelado').length
    const finalizado   = turnos.filter(t => (t.estado||'').toLowerCase()==='finalizado').length
    return { total, confirmado, pendiente, cancelado, finalizado }
  }, [turnos])

  return { turnos, loading, error, kpis, refetch: cargar }
}
