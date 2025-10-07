import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/turnos/finalizar  { turnoId: number }
export async function POST(req: Request) {
  try {
    const { turnoId } = await req.json()

    if (!turnoId) {
      return NextResponse.json({ error: 'Falta el ID del turno' }, { status: 400 })
    }

    // Buscar turno con conductor (para auditoría / notificaciones)
    const turno = await prisma.turnos.findUnique({
      where: { id: turnoId },
      include: { conductores: true },
    })

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    // Idempotencia
    if (turno.estado === 'finalizado') {
      return NextResponse.json(
        { message: 'El turno ya estaba finalizado', turno },
        { status: 200 }
      )
    }

    // Validaciones de transición
    if (turno.estado === 'pendiente' || turno.estado === 'programado') {
      return NextResponse.json(
        { error: 'Debes registrar la llegada e iniciar el proceso antes de finalizar' },
        { status: 409 }
      )
    }

    if (turno.estado === 'confirmado') {
      return NextResponse.json(
        { error: 'Debes iniciar el proceso antes de finalizar' },
        { status: 409 }
      )
    }

    if (turno.estado === 'cancelado') {
      return NextResponse.json(
        { error: 'No se puede finalizar un turno cancelado' },
        { status: 409 }
      )
    }

    if (turno.estado !== 'en_proceso') {
      return NextResponse.json(
        { error: `Transición inválida desde "${turno.estado}"` },
        { status: 409 }
      )
    }

    // Transacción: actualizar estado + auditoría
    const [turnoActualizado] = await prisma.$transaction([
      prisma.turnos.update({
        where: { id: turnoId },
        data: { estado: 'finalizado' }, // Próxima iteración: hora_fin: new Date()
        include: { conductores: true },
      }),
      prisma.auditoriaTurnos.create({
        data: {
          turno_id: turnoId,
          accion: 'finalizar',
          usuario: turno.conductores?.cedula || 'sistema',
        },
      }),
    ])

    return NextResponse.json(
      { message: 'Turno finalizado', turno: turnoActualizado },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
