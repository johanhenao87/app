import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { turnoId } = await req.json()

    if (!turnoId) {
      return NextResponse.json(
        { error: 'Falta el ID del turno' },
        { status: 400 }
      )
    }

    // Buscar turno
    const turno = await prisma.turnos.findUnique({
      where: { id: turnoId },
      include: { conductores: true },
    })

    if (!turno) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar estado a confirmado
    const turnoConfirmado = await prisma.turnos.update({
      where: { id: turnoId },
      data: { estado: "confirmado" },
      include: { conductores: true },
    })

    // Registrar auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: turnoId,
        accion: "confirmado",
        usuario: turno.conductores?.cedula || "sistema",
      }
    })

    return NextResponse.json(
      {
        message: "Llegada confirmada",
        turno: turnoConfirmado,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

