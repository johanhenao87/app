export type TurnoAdmin = {
  id: number
  fecha: string
  hora: string
  estado: string
  tipo_turno: string | null
  operacion?: string | null
  tipo_vehiculo_turno?: string | null
  conductor?: {
    id?: number
    cedula?: string
    nombre?: string
    telefono?: string
  } | null
}

export type TurnoFilters = {
  fecha: string
  estado?: typeof ESTADOS[number]
  tipoVehiculo?: typeof VEH_TYPES[number] | 'todos'
}

export type TurnoKpiResumen = {
  total: number
  confirmado: number
  pendiente: number
  cancelado: number
  finalizado: number
}

export const ESTADOS = ['todos', 'pendiente', 'confirmado', 'en_proceso', 'cancelado', 'finalizado'] as const
export const VEH_TYPES = ['todos', 'SEN', 'TM', 'CB', 'DLL', 'XL', 'MM'] as const
