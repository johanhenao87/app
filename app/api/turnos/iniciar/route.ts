import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/turnos/iniciar  { turnoId: number }
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
    if (turno.estado === 'en_proceso') {
      return NextResponse.json(
        { message: 'El turno ya estaba en proceso', turno },
        { status: 200 }
      )
    }

    // Validación de transición
    if (turno.estado === 'pendiente' || turno.estado === 'programado') {
      return NextResponse.json(
        { error: 'Primero registra la llegada antes de iniciar el proceso' },
        { status: 409 }
      )
    }

    if (turno.estado === 'finalizado' || turno.estado === 'cancelado') {
      return NextResponse.json(
        { error: `No se puede iniciar un turno con estado "${turno.estado}"` },
        { status: 409 }
      )
    }

    if (turno.estado !== 'confirmado') {
      return NextResponse.json(
        { error: `Transición inválida desde "${turno.estado}"` },
        { status: 409 }
      )
    }

    // Transacción: actualizar estado + auditoría
    const [turnoActualizado] = await prisma.$transaction([
      prisma.turnos.update({
        where: { id: turnoId },
        data: { estado: 'en_proceso' }, // en una próxima iteración: hora_inicio: new Date()
        include: { conductores: true },
      }),
      prisma.auditoriaTurnos.create({
        data: {
          turno_id: turnoId,
          accion: 'iniciar_proceso',
          usuario: turno.conductores?.cedula || 'sistema',
        },
      }),
    ])

    return NextResponse.json(
      { message: 'Proceso iniciado', turno: turnoActualizado },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
