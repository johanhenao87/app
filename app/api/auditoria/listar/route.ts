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

    const auditoria = await prisma.auditoriaTurnos.findMany({
      where: { turno_id: turnoId },
      orderBy: { fecha_hora: 'asc' }
    })

    return NextResponse.json(auditoria, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
