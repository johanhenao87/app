import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { turnoId } = await req.json()

    if (!turnoId) {
      return NextResponse.json({ error: 'Falta el ID del turno' }, { status: 400 })
    }

    // Buscar turno con datos de conductor (para auditoría / notificaciones)
    const turno = await prisma.turnos.findUnique({
      where: { id: turnoId },
      include: { conductores: true },
    })

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    // ⚠️ Normalizamos el estado porque en el schema puede ser `string | null`
    const estadoActual: string = turno.estado ?? '' // '' = sin estado definido

    // Idempotencia: si ya está confirmado, no hacer doble cambio
    if (estadoActual === 'confirmado') {
      return NextResponse.json(
        { message: 'Llegada ya estaba registrada', turno },
        { status: 200 }
      )
    }

    // Validación de transición de estado
    const permitidos = new Set(['pendiente', 'programado'])
    if (!permitidos.has(estadoActual)) {
      return NextResponse.json(
        { error: `No se puede registrar llegada desde estado "${estadoActual || 'sin_estado'}"` },
        { status: 409 }
      )
    }

    // Transacción: actualizar turno + auditoría
    const [turnoActualizado] = await prisma.$transaction([
      prisma.turnos.update({
        where: { id: turnoId },
        data: { estado: 'confirmado' }, // Próxima iteración: hora_llegada: new Date()
        include: { conductores: true },
      }),
      prisma.auditoriaTurnos.create({
        data: {
          turno_id: turnoId,
          accion: 'registrar_llegada',
          usuario: turno.conductores?.cedula || 'sistema',
        },
      }),
    ])

    return NextResponse.json(
      { message: 'Llegada registrada', turno: turnoActualizado },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
