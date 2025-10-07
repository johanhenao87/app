// app/admin/lib/turnoActions.ts
import { postJSON, loadSession } from '../../lib/api'

// -------------------- Tipos de respuesta --------------------
export type ApiOk<T = unknown> = {
  message?: string
  turno?: T
}
export type ApiErr = { error: string }
export type ApiRes<T = unknown> = ApiOk<T> | ApiErr

// Útil en la UI: type guard para saber si vino error
export function isErr<T>(r: ApiRes<T>): r is ApiErr {
  return typeof (r as any)?.error === 'string'
}

// -------------------- Utils --------------------
function usuarioActual() {
  const u = loadSession()
  return u?.cedula || 'admin'
}

// -------------------- Acciones --------------------

/** Registrar llegada (pendiente -> confirmado) */
export async function apiRegistrarLlegada(turnoId: number): Promise<ApiRes> {
  return postJSON<ApiRes>('/api/turnos/registrar-llegada', {
    turnoId,
    usuario: usuarioActual(),
  })
}

/** Iniciar proceso (confirmado -> en_proceso) */
export async function apiIniciarProceso(turnoId: number): Promise<ApiRes> {
  return postJSON<ApiRes>('/api/turnos/iniciar', {
    turnoId,
    usuario: usuarioActual(),
  })
}

/** Finalizar (en_proceso -> finalizado) */
export async function apiFinalizarTurno(turnoId: number): Promise<ApiRes> {
  return postJSON<ApiRes>('/api/turnos/finalizar', {
    turnoId,
    usuario: usuarioActual(),
  })
}

/** Cancelar turno (no terminal -> cancelado) */
export async function apiCancelarTurno(turnoId: number): Promise<ApiRes> {
  return postJSON<ApiRes>('/api/turnos/cancelar', {
    turnoId,
    usuario: usuarioActual(),
  })
}

/** Reprogramar turno (misma lógica de reglas del backend) */
export async function apiReprogramarTurno(args: {
  turnoId: number
  conductorId?: number
  nuevaFecha: string          // YYYY-MM-DD (zona Bogotá)
  nuevaHora: string           // HH:mm (zona Bogotá)
  tipo_vehiculo?: string | null
  operacion?: string | null   // 'cargue' | 'descargue'
  actualizarTipoVehiculo?: boolean
}): Promise<ApiRes> {
  return postJSON<ApiRes>('/api/turnos/reprogramar', {
    turnoId: args.turnoId,
    conductorId: args.conductorId,
    nuevaFecha: args.nuevaFecha,
    nuevaHora: args.nuevaHora,
    tipo_vehiculo: args.tipo_vehiculo,
    operacion: args.operacion,
    actualizarTipoVehiculo: !!args.actualizarTipoVehiculo,
    usuario: usuarioActual(),
  })
}

/** Intercambiar hora entre dos turnos del mismo día (swap atómico) */
export type SwapResult = { A: any; B: any }

export async function apiIntercambiarHora(
  turnoAId: number,
  turnoBId: number
): Promise<ApiRes<SwapResult>> {
  return postJSON<ApiRes<SwapResult>>('/api/turnos/intercambiar-hora', {
    turnoAId,
    turnoBId,
    usuario: usuarioActual(),
  })
}

// -------------------- Guards de botones --------------------

/** ¿Se puede arrastrar/soltar? — solo pendiente o confirmado */
export function canSwap(estado?: string | null) {
  const e = (estado || '').toLowerCase()
  return e === 'pendiente' || e === 'confirmado'
}

export function canRegistrarLlegada(estado?: string | null) {
  return (estado || '').toLowerCase() === 'pendiente'
}

export function canIniciar(estado?: string | null) {
  return (estado || '').toLowerCase() === 'confirmado'
}

export function canFinalizar(estado?: string | null) {
  return (estado || '').toLowerCase() === 'en_proceso'
}

export function canCancelar(estado?: string | null) {
  const e = (estado || '').toLowerCase()
  return e !== 'cancelado' && e !== 'finalizado'
}
