import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const CAJA_SLOTS = [6, 8, 10, 12, 14, 16, 18]

// Interpreta "YYYY-MM-DD" + "HH:mm" como hora local de Bogotá y devuelve Date (UTC)
function bogotaLocalHmToUtcDate(hm: string): Date {
  if (!/^\d{2}:\d{2}$/.test(hm)) throw new Error('Hora debe ser HH:mm')
  // Colombia: offset fijo -05:00 (sin DST)
  const iso = `1970-01-01T${hm}:00-05:00`
  return new Date(iso) // → equivale a "esa hora local" convertida a UTC
}

export async function POST(req: Request) {
  try {
    const {
      turnoId,
      conductorId,
      nuevaFecha,
      nuevaHora,
      tipo_vehiculo,
      operacion,
      actualizarTipoVehiculo
    } = await req.json()

    if (!turnoId || !conductorId || !nuevaFecha || !nuevaHora || !tipo_vehiculo || !operacion) {
      return NextResponse.json(
        { error: 'Faltan datos: turnoId, conductorId, nuevaFecha, nuevaHora, tipo_vehiculo y operacion' },
        { status: 400 }
      )
    }

    const tipo = String(tipo_vehiculo).toUpperCase()
    const oper = String(operacion).toLowerCase()
    if (!['cargue','descargue'].includes(oper)) {
      return NextResponse.json({ error: 'operacion inválida (cargue | descargue)' }, { status: 400 })
    }

    // Turno original y pertenencia
    const original = await prisma.turnos.findUnique({
      where: { id: Number(turnoId) },
      include: { conductores: true }
    })
    if (!original) return NextResponse.json({ error: 'Turno a reprogramar no existe' }, { status: 404 })
    if (original.conductor_id !== Number(conductorId)) {
      return NextResponse.json({ error: 'No autorizado para reprogramar este turno' }, { status: 403 })
    }
    if (['cancelado','finalizado'].includes(String(original.estado))) {
      return NextResponse.json({ error: 'Este turno ya no puede reprogramarse' }, { status: 400 })
    }

    // Conductor
    const conductor = await prisma.conductores.findUnique({ where: { id: Number(conductorId) } })
    if (!conductor) return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })

    if (actualizarTipoVehiculo && (conductor.tipo_vehiculo || '').toUpperCase() !== tipo) {
      await prisma.conductores.update({ where: { id: conductor.id }, data: { tipo_vehiculo: tipo } })
    }

    // Nueva fecha/hora
    const fechaNueva = new Date(`${nuevaFecha}T00:00:00.000Z`) // mantenemos tu convención existente
    const [hhStr, mmStr = '00'] = String(nuevaHora).split(':')
    const hh = Number(hhStr)
    const mm = Number(mmStr || '0')

    // ⬇️ CLAVE: construir la hora como “HH:mm en Bogotá” → UTC
    const horaNueva = bogotaLocalHmToUtcDate(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`)

    // Reglas generales
    if (fechaNueva.getUTCDay() === 0) {
      return NextResponse.json({ error: 'No se permiten turnos los domingos' }, { status: 400 })
    }
    const festivo = await prisma.calendario.findUnique({ where: { fecha: fechaNueva } })
    if (festivo && festivo.habilitado === false) {
      return NextResponse.json({ error: festivo.motivo || 'Día no habilitado para agendamiento' }, { status: 400 })
    }

    const destinoEsCR = tipo === 'SEN'
    const tipo_turno_destino = destinoEsCR ? 'caja_rapida' : 'normal'

    if (destinoEsCR) {
      if (!CAJA_SLOTS.includes(hh)) {
        return NextResponse.json({ error: 'Hora no válida para caja rápida' }, { status: 400 })
      }
    } else {
      if (hh < 6 || hh >= 17) {
        return NextResponse.json({ error: 'El horario permitido es entre 06:00 y 17:00' }, { status: 400 })
      }
    }

    // Transacción: validar duplicado exacto y capacidad; luego UPDATE y auditoría
    const res = await prisma.$transaction(async (tx) => {
      // Evitar mismo slot con el mismo conductor
      const mismoSlot = await tx.turnos.findFirst({
        where: {
          id: { not: Number(turnoId) },
          conductor_id: Number(conductorId),
          fecha: fechaNueva,
          hora: horaNueva,
          estado: { in: ['pendiente','confirmado','finalizado'] }
        }
      })
      if (mismoSlot) throw new Error('DUPLICADO_MISMO_SLOT')

      // Capacidad por tipo (excluyendo el mismo turno)
      if (destinoEsCR) {
        const ocupado = await tx.turnos.findFirst({
          where: {
            id: { not: Number(turnoId) },
            fecha: fechaNueva,
            hora: horaNueva,
            tipo_turno: 'caja_rapida',
            estado: { in: ['pendiente','confirmado','finalizado'] }
          }
        })
        if (ocupado) throw new Error('SLOT_OCUPADO')
      } else {
        const inicio = new Date(horaNueva)
        const fin = new Date(horaNueva); fin.setUTCHours(inicio.getUTCHours() + 4)
        const count = await tx.turnos.count({
          where: {
            id: { not: Number(turnoId) },
            fecha: fechaNueva,
            tipo_turno: 'normal',
            hora: { gte: inicio, lt: fin },
            estado: { in: ['pendiente','confirmado','finalizado'] }
          }
        })
        if (count >= 5) throw new Error('FRANJA_LLENA')
      }

      // Si no hay cambios reales, evitar escribir
      if (
        original.fecha.getTime() === fechaNueva.getTime() &&
        original.hora.getTime() === horaNueva.getTime() &&
        (original.tipo_turno || 'normal') === tipo_turno_destino &&
        (original.operacion || '') === oper &&
        (original.tipo_vehiculo_turno || '') === tipo
      ) {
        throw new Error('SIN_CAMBIOS')
      }

      // UPDATE del turno
      const upd = await tx.turnos.update({
        where: { id: Number(turnoId) },
        data: {
          fecha: fechaNueva,
          hora: horaNueva,                   // ⬅ guarda la hora ya normalizada a UTC
          tipo_turno: tipo_turno_destino,
          estado: 'pendiente',
          operacion: oper,
          tipo_vehiculo_turno: tipo
        }
      })

      await tx.auditoriaTurnos.create({
        data: { turno_id: upd.id, accion: 'reprogramado_actualizado', usuario: conductor.cedula || 'sistema' }
      })

      return upd
    }).catch((e) => {
      if (e instanceof Error) {
        if (e.message === 'DUPLICADO_MISMO_SLOT') return { __error: 'Ya tienes un turno a esa misma hora.' }
        if (e.message === 'SLOT_OCUPADO') return { __error: 'Ese horario ya está ocupado.' }
        if (e.message === 'FRANJA_LLENA') return { __error: 'La franja horaria ya está llena.' }
        if (e.message === 'SIN_CAMBIOS') return { __error: 'No hay cambios para aplicar.' }
      }
      throw e
    })

    if ((res as any).__error) {
      return NextResponse.json({ error: (res as any).__error }, { status: 400 })
    }

    return NextResponse.json({ message: 'Turno reprogramado con éxito', turno: res }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
