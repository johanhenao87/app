'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { hmLocalToMinutes } from '../lib/date'
import type { TurnoAdmin, TurnoFilters, TurnoKpiResumen } from '../lib/types'
import { getTurnosDelDia } from '../lib/fetchers'

export function useTurnos(filters: TurnoFilters) {
  const { fecha, estado = 'todos', tipoVehiculo = 'todos' } = filters
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data = await getTurnosDelDia(fecha)
      if (estado !== 'todos') {
        data = data.filter(turno => (turno.estado ?? '').toLowerCase() === estado)
      }
      if (tipoVehiculo !== 'todos') {
        data = data.filter(turno => (turno.tipo_vehiculo_turno ?? '').toUpperCase() === tipoVehiculo)
      }
      data.sort((a, b) => hmLocalToMinutes(a.hora) - hmLocalToMinutes(b.hora))
      setTurnos(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible cargar los turnos.'
      setError(message)
      setTurnos([])
    } finally {
      setLoading(false)
    }
  }, [fecha, estado, tipoVehiculo])

  useEffect(() => {
    void load()
  }, [load])

  const kpis: TurnoKpiResumen = useMemo(() => {
    const total = turnos.length
    const confirmado = turnos.filter(t => (t.estado ?? '').toLowerCase() === 'confirmado').length
    const pendiente = turnos.filter(t => (t.estado ?? '').toLowerCase() === 'pendiente').length
    const cancelado = turnos.filter(t => (t.estado ?? '').toLowerCase() === 'cancelado').length
    const finalizado = turnos.filter(t => (t.estado ?? '').toLowerCase() === 'finalizado').length
    return { total, confirmado, pendiente, cancelado, finalizado }
  }, [turnos])

  return { turnos, loading, error, kpis, refetch: load }
}
