import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALLOWED_SLOTS = ['06:00','08:00','10:00','12:00','14:00','16:00']

function mkTime(hhmm: string) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`)
}
function combineUTC(fecha: string, hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number)
  const d = new Date(`${fecha}T00:00:00.000Z`)
  d.setUTCHours(hh, mm, 0, 0)
  return d
}

export async function POST(req: Request) {
  try {
    const { conductorId, fecha, hora, usuario } = await req.json() as {
      conductorId: number
      fecha: string      // YYYY-MM-DD
      hora: string       // HH:MM (uno de ALLOWED_SLOTS)
      usuario?: string
    }

    if (!conductorId || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan datos (conductorId, fecha, hora)' }, { status: 400 })
    }

    if (!ALLOWED_SLOTS.includes(hora)) {
      return NextResponse.json({ error: 'Hora inválida (usa 06:00, 08:00, 10:00, 12:00, 14:00 o 16:00)' }, { status: 400 })
    }

    // 1) Conductor y tipo de vehículo
    const conductor = await prisma.conductores.findUnique({ where: { id: Number(conductorId) } })
    if (!conductor) return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })

    // ✅ Validar TIPO DE VEHÍCULO = SEN
    if ((conductor.tipo_vehiculo ?? '').toUpperCase() !== 'SEN') {
      return NextResponse.json({ error: 'Solo vehículos tipo SEN pueden usar caja rápida' }, { status: 403 })
    }

    // 2) Regla de 12 horas
    const ahora = new Date()
    const inicioSlot = combineUTC(fecha, hora)
    const diffHoras = (inicioSlot.getTime() - ahora.getTime()) / (1000 * 60 * 60)
    if (diffHoras < 12) {
      return NextResponse.json({ error: 'Debes agendar con al menos 12 horas de anticipación' }, { status: 400 })
    }

    // 3) Día hábil (si está en calendario como no habilitado)
    const fechaDate = new Date(`${fecha}T00:00:00.000Z`)
    const cal = await prisma.calendario.findUnique({ where: { fecha: fechaDate } })
    if (cal && cal.habilitado === false) {
      return NextResponse.json({ error: cal.motivo || 'Día no hábil' }, { status: 400 })
    }

    // 4) Un turno por día por conductor (evitar duplicado)
    const yaTieneDia = await prisma.turnos.findFirst({
      where: {
        conductor_id: Number(conductorId),
        fecha: fechaDate,
        estado: { in: ['pendiente','confirmado','finalizado'] }
      }
    })
    if (yaTieneDia) {
      return NextResponse.json({ error: 'Ya tienes un turno para ese día' }, { status: 400 })
    }

    // 5) Verificar ocupación del slot (1 vehículo por slot)
    const horaInicio = mkTime(hora)
    const ocupado = await prisma.turnos.findFirst({
      where: {
        fecha: fechaDate,
        hora: horaInicio,
        tipo_turno: 'caja_rapida',
        estado: { in: ['pendiente','confirmado','finalizado'] }
      }
    })
    if (ocupado) {
      return NextResponse.json({ error: 'Ese slot ya está ocupado' }, { status: 400 })
    }

    // 6) Crear turno
    const nuevoTurno = await prisma.turnos.create({
      data: {
        conductor_id: Number(conductorId),
        fecha: fechaDate,
        hora: horaInicio,
        tipo_turno: 'caja_rapida',
        estado: 'pendiente'
      }
    })

    // 7) Auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: nuevoTurno.id,
        accion: 'agendado_caja_rapida',
        usuario: usuario ?? String(conductor.cedula)
      }
    })

    return NextResponse.json({ message: 'Turno de caja rápida agendado con éxito', turno: nuevoTurno }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}