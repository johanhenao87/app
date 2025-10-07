import { postJSON } from '../../lib/api'
import type { TurnoAdmin } from './types'

export async function getTurnosDelDia(fecha: string): Promise<TurnoAdmin[]> {
  return postJSON<TurnoAdmin[]>('/api/turnos/dia', { fecha })
}

export type CrearTurnoPayload = {
  fecha: string
  hora: string
  conductorId?: number
  tipo_turno?: string | null
  tipo_vehiculo_turno?: string | null
  operacion?: string | null
}

export async function crearTurnoManual(payload: CrearTurnoPayload) {
  return postJSON('/api/turnos/crear-manual', payload)
}

export type ActualizarTurnoPayload = {
  turnoId: number
  fecha?: string
  hora?: string
  estado?: string
  tipo_turno?: string | null
  tipo_vehiculo_turno?: string | null
  operacion?: string | null
}

export async function actualizarTurno(payload: ActualizarTurnoPayload) {
  return postJSON('/api/turnos/modificar', payload)
}

export async function cancelarTurno(turnoId: number) {
  return postJSON('/api/turnos/cancelar', { turnoId })
}
