// app/api/turnos/disponibilidad/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { localDateToUTC, localTimeToUTC } from '@/app/lib/tz'

const prisma = new PrismaClient()

// Franjas fijas (inicio de cada franja en hora local Bogotá)
const SLOTS = [6, 10, 14, 18]

// Estados que cuentan como ocupación
const ESTADOS_OCUPAN = ['pendiente', 'confirmado', 'finalizado'] as const

export async function POST(req: Request) {
  try {
    const { fecha } = await req.json() as { fecha?: string }
    if (!fecha) {
      return NextResponse.json({ error: 'Falta la fecha (YYYY-MM-DD)' }, { status: 400 })
    }

    // Interpreta "fecha" como local Bogotá y la transforma al instante UTC 00:00 local
    const fechaUTC = localDateToUTC(fecha)

    // 1) Validaciones de día
    // 1.a) No domingos
    const esDomingo = fechaUTC.getUTCDay() === 0
    // 1.b) Festivos/bloqueos por tabla calendario (habilitado=false)
    const festivo = await prisma.calendario.findUnique({ where: { fecha: fechaUTC } })
    const diaHabil = !esDomingo && !(festivo && festivo.habilitado === false)
    const motivoNoHabil = festivo && festivo.habilitado === false ? (festivo.motivo || 'Día no habilitado') : (esDomingo ? 'Domingo no habilitado' : null)

    if (!diaHabil) {
      // si el día completo está bloqueado, devolvemos estructura estándar + bandera
      return NextResponse.json({
        fecha,
        bloqueada: true,
        motivo: motivoNoHabil,
        disponibilidad: SLOTS.map(hh => ({
          hora: `${String(hh).padStart(2, '0')}:00`,
          cupo: 0,
          ocupados: 0,
          disponibles: 0,
          lleno: true,
          habilitado: false,
          razones: { diaHabil: false, motivoNoHabil, habilitadoPorTiempo: false }
        }))
      }, { status: 200 })
    }

    // 2) Capacidad por franja (lee de reglas si existe; fallback 5)
    let cupoFranja = 5
    try {
      const regla = await prisma.reglas_agendamiento.findFirst({ where: { nombre: 'cupos_franja_4h' } })
      if (regla?.valor && Number.isFinite(Number(regla.valor))) {
        cupoFranja = Number(regla.valor)
      }
    } catch { /* fallback 5 */ }

    // 3) Construcción de la disponibilidad por slot
    const ahoraUTC = new Date() // instante actual (UTC)
    const items = await Promise.all(SLOTS.map(async (hh) => {
      const label = `${String(hh).padStart(2, '0')}:00`

      // slotStart/slotEnd: convertir la hora local (Bogotá) a UTC anclada a 1970, y usar ese rango para contar
      // OJO: la tabla guarda la hora como un Date anclado a 1970, por lo que comparar por rango [gte, lt) es correcto.
      const slotStart = localTimeToUTC(label)                 // 1970-01-01THH:00:00-05:00 en UTC
      const slotEnd = new Date(slotStart)
      slotEnd.setUTCHours(slotStart.getUTCHours() + 4)        // franja 4h

      // 12 horas de anticipación: comparamos el instante del inicio del slot (en el día solicitado).
      // Para esto, construimos el instante UTC real de inicio (día + hora local).
      // Tomamos la fecha local -> UTC (00:00 local) y le "inyectamos" la hora del slot en UTC (anclada a 1970):
      const inicioRealUTC = new Date(fechaUTC) // clone
      inicioRealUTC.setUTCHours(slotStart.getUTCHours(), slotStart.getUTCMinutes(), 0, 0)

      const diffMs = inicioRealUTC.getTime() - ahoraUTC.getTime()
      const habilitadoPorTiempo = diffMs >= 12 * 60 * 60 * 1000 // >= 12h

      // Conteo de ocupados en la franja para el día solicitado
      const ocupados = await prisma.turnos.count({
        where: {
          fecha: fechaUTC,
          tipo_turno: 'normal',
          hora: { gte: slotStart, lt: slotEnd },
          estado: { in: ESTADOS_OCUPAN as any }
        }
      })

      const disponibles = Math.max(0, cupoFranja - ocupados)
      const lleno = disponibles <= 0

      const habilitado = diaHabil && habilitadoPorTiempo && !lleno

      return {
        hora: label,
        cupo: cupoFranja,
        ocupados,
        disponibles,
        lleno,
        habilitado,
        razones: { diaHabil, motivoNoHabil: null as string | null, habilitadoPorTiempo }
      }
    }))

    // 4) Respuesta
    return NextResponse.json({
      fecha,
      disponibilidad: items
    }, { status: 200 })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
