// app/api/caja-rapida/disponibilidad/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { localDateToUTC, localTimeToUTC } from '@/app/lib/tz'

const prisma = new PrismaClient()

// Slots de 2h en hora local Bogotá
const SLOTS = [6, 8, 10, 12, 14, 16, 18]
// Estados que ocupan cupo
const ESTADOS_OCUPAN = ['pendiente', 'confirmado', 'finalizado'] as const

export async function POST(req: Request) {
  try {
    const { fecha } = await req.json() as { fecha?: string }
    if (!fecha) {
      return NextResponse.json({ error: 'Falta la fecha (YYYY-MM-DD)' }, { status: 400 })
    }

    // Interpretar fecha local (Bogotá) -> Date UTC (00:00 local)
    const fechaUTC = localDateToUTC(fecha)

    // 1) Validaciones de día (domingo / festivo)
    const esDomingo = fechaUTC.getUTCDay() === 0
    const festivo = await prisma.calendario.findUnique({ where: { fecha: fechaUTC } })
    const diaHabil = !esDomingo && !(festivo && festivo.habilitado === false)
    const motivoNoHabil =
      festivo && festivo.habilitado === false
        ? (festivo.motivo || 'Día no habilitado')
        : (esDomingo ? 'Domingo no habilitado' : null)

    if (!diaHabil) {
      return NextResponse.json({
        fecha,
        bloqueada: true,
        motivo: motivoNoHabil,
        slots: SLOTS.map(hh => ({
          hora: `${String(hh).padStart(2,'0')}:00`,
          disponibles: 0,
          habilitado: false
        }))
      }, { status: 200 })
    }

    // 2) Cargar parámetros de cupo por hora si existen (ParametrosTurnos)
    //    clave: tipo_turno='caja_rapida' y hora='HH:mm'
    const parametros = await prisma.parametros_agendamiento.findMany().catch(() => [])
    // (No se usan por ahora en CR; mantenemos placeholder por futura ampliación)

    // Alternativa: leer ParametrosTurnos para CR
    const paramsCR = await prisma.parametrosTurnos.findMany({
      where: { tipo_turno: 'caja_rapida', activo: true }
    }).catch(() => [])

    const getCupoMax = (hhmm: string) => {
      const p = paramsCR.find(p => p.hora === hhmm)
      return p?.cupo_maximo && Number.isFinite(Number(p.cupo_maximo)) ? Number(p.cupo_maximo) : 1
    }

    // 3) Construcción de disponibilidad por slot
    const ahoraUTC = new Date()
    const slots = await Promise.all(SLOTS.map(async (hh) => {
      const label = `${String(hh).padStart(2,'0')}:00`
      const cupoMax = getCupoMax(label) // default 1

      // Slot CR ocupa exactamente esa hora (no franja 4h). Validamos ocupación exacta.
      const slotTime1970UTC = localTimeToUTC(label)   // 1970-01-01THH:00:00-05:00 -> UTC
      // Instante real de inicio del slot para esa fecha (12h anticipación):
      const inicioRealUTC = new Date(fechaUTC)
      inicioRealUTC.setUTCHours(slotTime1970UTC.getUTCHours(), slotTime1970UTC.getUTCMinutes(), 0, 0)

      const habilitadoPorTiempo = (inicioRealUTC.getTime() - ahoraUTC.getTime()) >= 12 * 60 * 60 * 1000

      // Conteo de ocupados exactos en el slot para ese día
      const ocupados = await prisma.turnos.count({
        where: {
          fecha: fechaUTC,
          tipo_turno: 'caja_rapida',
          hora: slotTime1970UTC,
          estado: { in: ESTADOS_OCUPAN as any }
        }
      })

      const disponibles = Math.max(0, cupoMax - ocupados)
      const habilitado = diaHabil && habilitadoPorTiempo && disponibles > 0

      return {
        hora: label,
        disponibles,
        habilitado
      }
    }))

    return NextResponse.json({ fecha, slots }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
