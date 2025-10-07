// app/api/turnos/agendar-caja-rapida/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { localDateToUTC, localTimeToUTC } from '@/app/lib/tz'

const prisma = new PrismaClient()

// Slots por defecto (2h) en hora local Bogotá.
// Si tienes ParametrosTurnos activos para 'caja_rapida', se aceptarán además esas horas.
const DEFAULT_SLOTS = [6, 8, 10, 12, 14, 16, 18]
const ESTADOS_OCUPAN = ['pendiente', 'confirmado', 'finalizado'] as const

export async function POST(req: Request) {
  try {
    const {
      conductorId,
      fecha,           // "YYYY-MM-DD" (local Bogotá)
      hora,            // "HH:mm" (local Bogotá, ej: "06:00","08:00"...)
      tipo_vehiculo,   // requerido: debe ser "SEN"
      operacion,       // requerido: "cargue" | "descargue"
      actualizarTipoVehiculo, // boolean opcional
      usuario          // opcional: para auditoría (ej: cedula)
    } = await req.json()

    // -------- Validaciones iniciales --------
    if (!conductorId || !fecha || !hora || !tipo_vehiculo || !operacion) {
      return NextResponse.json(
        { error: 'Faltan datos: conductorId, fecha, hora, tipo_vehiculo y operacion son obligatorios' },
        { status: 400 }
      )
    }

    const tipo = String(tipo_vehiculo).toUpperCase()
    if (tipo !== 'SEN') {
      return NextResponse.json({ error: 'Solo vehículo SEN puede usar caja rápida' }, { status: 400 })
    }

    const op = String(operacion).toLowerCase()
    if (!['cargue', 'descargue'].includes(op)) {
      return NextResponse.json({ error: 'operacion inválida (cargue | descargue)' }, { status: 400 })
    }

    // Conductor
    const conductor = await prisma.conductores.findUnique({ where: { id: Number(conductorId) } })
    if (!conductor) return NextResponse.json({ error: 'Conductor no existe' }, { status: 404 })

    // Actualizar tipo_vehiculo en su perfil si se pide y cambió
    if (actualizarTipoVehiculo && (conductor.tipo_vehiculo || '').toUpperCase() !== 'SEN') {
      await prisma.conductores.update({ where: { id: conductor.id }, data: { tipo_vehiculo: 'SEN' } })
    }

    // -------- Normalización de fecha/hora a UTC (Bogotá) --------
    const fechaUTC = localDateToUTC(fecha)          // 00:00 local -> instante UTC
    const hora1970UTC = localTimeToUTC(hora)        // 1970-01-01THH:mm local -> UTC, para comparar en columna 'hora' (anclada a 1970)

    // Validar slot permitido:
    // Aceptamos:
    //   - horas de DEFAULT_SLOTS
    //   - o bien horas definidas en ParametrosTurnos(tipo_turno='caja_rapida', activo=true)
    const hhNum = Number(String(hora).split(':')[0])
    const paramsCR = await prisma.parametrosTurnos.findMany({
      where: { tipo_turno: 'caja_rapida', activo: true }
    }).catch(() => [])

    const allowedFromParams = new Set<string>(paramsCR.map(p => p.hora)) // "HH:mm"
    const allowedDefault = new Set(DEFAULT_SLOTS.map(h => `${String(h).padStart(2,'0')}:00`))
    const isAllowed = allowedFromParams.size > 0
      ? allowedFromParams.has(hora)
      : allowedDefault.has(`${String(hhNum).padStart(2,'0')}:00`)

    if (!isAllowed) {
      return NextResponse.json({ error: 'Hora no válida para caja rápida' }, { status: 400 })
    }

    // -------- Validaciones de día: domingo, calendario, bloqueos --------
    const esDomingo = fechaUTC.getUTCDay() === 0
    if (esDomingo) {
      return NextResponse.json({ error: 'No se permiten turnos los domingos' }, { status: 400 })
    }

    const festivo = await prisma.calendario.findUnique({ where: { fecha: fechaUTC } })
    if (festivo && festivo.habilitado === false) {
      return NextResponse.json({ error: festivo.motivo || 'Día no habilitado para agendamiento' }, { status: 400 })
    }

    // Bloqueos por rango (si usas esta tabla)
    const bloqueoRango = await prisma.bloqueosFechas.findFirst({
      where: {
        activo: true,
        fecha_inicio: { lte: fechaUTC },
        fecha_fin: { gte: fechaUTC }
      }
    }).catch(() => null)
    if (bloqueoRango) {
      return NextResponse.json(
        { error: bloqueoRango.motivo || 'Fecha bloqueada por administración' },
        { status: 400 }
      )
    }

    // -------- Regla: 12 horas de anticipación --------
    // Construimos el instante real del slot (fechaLocal + horaLocal -> UTC)
    const inicioRealUTC = new Date(fechaUTC)
    inicioRealUTC.setUTCHours(hora1970UTC.getUTCHours(), hora1970UTC.getUTCMinutes(), 0, 0)
    const diffMs = inicioRealUTC.getTime() - Date.now()
    if (diffMs < 12 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Debes agendar con mínimo 12 horas de anticipación' }, { status: 400 })
    }

    // -------- Un turno por día por conductor --------
    const yaTieneHoy = await prisma.turnos.findFirst({
      where: {
        conductor_id: Number(conductorId),
        fecha: fechaUTC,
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] }
      }
    })
    if (yaTieneHoy) {
      return NextResponse.json({ error: 'Ya tienes un turno para ese día' }, { status: 400 })
    }

    // -------- Cupo del slot (ParametrosTurnos o fallback=1) --------
    const cupoMax = (() => {
      const p = paramsCR.find(p => p.hora === `${String(hhNum).padStart(2,'0')}:00`)
      return p?.cupo_maximo && Number.isFinite(Number(p.cupo_maximo)) ? Number(p.cupo_maximo) : 1
    })()

    const ocupados = await prisma.turnos.count({
      where: {
        fecha: fechaUTC,
        tipo_turno: 'caja_rapida',
        hora: hora1970UTC,
        estado: { in: ESTADOS_OCUPAN as any }
      }
    })
    if (ocupados >= cupoMax) {
      return NextResponse.json({ error: 'Slot lleno para caja rápida' }, { status: 400 })
    }

    // -------- Crear turno caja rápida --------
    const nuevo = await prisma.turnos.create({
      data: {
        conductor_id: Number(conductorId),
        fecha: fechaUTC,
        hora: hora1970UTC,
        tipo_turno: 'caja_rapida',
        estado: 'pendiente',
        operacion: op,               // snapshot operación
        tipo_vehiculo_turno: 'SEN'   // snapshot tipo vehículo
      }
    })

    // Auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: nuevo.id,
        accion: 'agendado_caja_rapida',
        usuario: usuario ?? conductor.cedula ?? 'sistema'
      }
    })

    return NextResponse.json({ message: 'OK', turno: nuevo }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
