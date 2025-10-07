import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function horaToTimeDate(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`)
}
function combineFechaHoraUTC(fecha: string, hhmm: string): Date {
  const d = new Date(`${fecha}T00:00:00.000Z`)
  const [hh, mm] = hhmm.split(':').map(Number)
  d.setUTCHours(hh, mm, 0, 0)
  return d
}
function getTanda(hh: number): 1 | 2 | 3 | 4 | null {
  if (hh >= 6 && hh < 10) return 1
  if (hh >= 10 && hh < 14) return 2
  if (hh >= 14 && hh < 18) return 3
  if (hh >= 18 && hh < 22) return 4
  return null
}
function getTandaInfo(hhmm: string): { start: Date; end: Date; cupo: number } | null {
  const [hh] = hhmm.split(':').map(Number)
  const t = getTanda(hh)
  const mk = (H: number) => new Date(`1970-01-01T${String(H).padStart(2,'0')}:00:00.000Z`)
  if (t === 1) return { start: mk(6),  end: mk(10), cupo: 6 }
  if (t === 2) return { start: mk(10), end: mk(14), cupo: 6 }
  if (t === 3) return { start: mk(14), end: mk(18), cupo: 5 }
  if (t === 4) return { start: mk(18), end: mk(22), cupo: 5 }
  return null
}

export async function POST(req: Request) {
  try {
    const { turnoId, conductorId, fechaNueva, horaNueva } = await req.json() as {
      turnoId: number
      conductorId: number
      fechaNueva: string // YYYY-MM-DD
      horaNueva: string  // HH:MM (solo 06:00 / 10:00 / 14:00 / 18:00)
    }

    if (!turnoId || !conductorId || !fechaNueva || !horaNueva) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // 0) Buscar turno y validar propiedad/estado
    const turno = await prisma.turnos.findUnique({ where: { id: turnoId } })
    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }
    if (turno.conductor_id !== conductorId) {
      return NextResponse.json({ error: 'No autorizado para modificar este turno' }, { status: 403 })
    }
    if (turno.estado !== 'pendiente') {
      return NextResponse.json({ error: 'Solo se pueden modificar turnos en estado pendiente' }, { status: 400 })
    }

    // 1) Regla de 12h respecto a la hora ORIGINAL
    const originalDT = combineFechaHoraUTC(turno.fecha.toISOString().slice(0,10), turno.hora.toISOString().slice(11,16))
    const ahora = new Date()
    const horasRestantes = (originalDT.getTime() - ahora.getTime()) / (1000 * 60 * 60)
    if (horasRestantes < 12) {
      return NextResponse.json({ error: 'Solo puedes modificar con mínimo 12 horas de anticipación' }, { status: 400 })
    }

    // 2) Validar horaNueva es una tanda válida
    const [hh, mm] = horaNueva.split(':').map(Number)
    if (mm !== 0 || ![6,10,14,18].includes(hh)) {
      return NextResponse.json({ error: 'Hora inválida: usa 06:00, 10:00, 14:00 o 18:00' }, { status: 400 })
    }

    // 3) Validar 12h respecto a la NUEVA fecha/hora (no permitir mover a <12h)
    const nuevaDT = combineFechaHoraUTC(fechaNueva, horaNueva)
    const horasAnticipacionNueva = (nuevaDT.getTime() - ahora.getTime()) / (1000 * 60 * 60)
    if (horasAnticipacionNueva < 12) {
      return NextResponse.json({ error: 'La nueva fecha/hora debe tener al menos 12 horas de anticipación' }, { status: 400 })
    }

    // 4) Día hábil (tabla calendario)
    const fechaNuevaDate = new Date(`${fechaNueva}T00:00:00.000Z`)
    const cal = await prisma.calendario.findUnique({ where: { fecha: fechaNuevaDate } })
    if (cal && cal.habilitado === false) {
      return NextResponse.json({ error: cal.motivo || 'Día no hábil' }, { status: 400 })
    }

    // 5) Un solo turno por día por conductor (evitar duplicado en otra cita)
    const existeMismoDia = await prisma.turnos.findFirst({
      where: {
        conductor_id: conductorId,
        fecha: fechaNuevaDate,
        NOT: { id: turnoId },
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] }
      }
    })
    if (existeMismoDia) {
      return NextResponse.json({ error: 'Ya tienes un turno para esa fecha' }, { status: 400 })
    }

    // 6) Cupo por tanda (contar en la nueva franja)
    const info = getTandaInfo(horaNueva)
    if (!info) {
      return NextResponse.json({ error: 'Hora fuera de tandas permitidas' }, { status: 400 })
    }
    const ocupados = await prisma.turnos.count({
      where: {
        fecha: fechaNuevaDate,
        hora: { gte: info.start, lt: info.end },
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] },
        NOT: { id: turnoId } // excluir el propio turno al moverlo
      }
    })
    if (ocupados >= info.cupo) {
      return NextResponse.json({ error: `La franja ${horaNueva} está llena (cupo ${info.cupo})` }, { status: 400 })
    }

    // 7) Actualizar turno
    const actualizado = await prisma.turnos.update({
      where: { id: turnoId },
      data: {
        fecha: fechaNuevaDate,
        hora: horaToTimeDate(horaNueva),
      }
    })

    // 8) Auditoría
    await prisma.auditoria_turnos.create({
      data: {
        turno_id: turnoId,
        accion: 'modificado',
        usuario: String(conductorId),
      }
    })

    return NextResponse.json({ message: 'Turno modificado con éxito', turno: actualizado }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
