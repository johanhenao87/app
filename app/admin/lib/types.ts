export type TurnoAdmin = {
  id: number
  fecha: string | any
  hora: string | any
  estado: string
  tipo_turno: string | null
  operacion?: string | null
  tipo_vehiculo_turno?: string | null
  conductor?: {
    id?: number
    cedula?: string
    nombre?: string
    telefono?: string
  }
}

export const ESTADOS = ['todos', 'pendiente', 'confirmado', 'en_proceso', 'cancelado', 'finalizado'] as const
export const VEH_TYPES = ['SEN', 'TM', 'CB', 'DLL', 'XL', 'MM'] as const
