import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId } = await req.json()
    if (!conductorId) {
      return NextResponse.json({ error: 'Falta conductorId' }, { status: 400 })
    }

    const hoyISO = new Date().toISOString().slice(0,10) // YYYY-MM-DD
    const turnos = await prisma.turnos.findMany({
      where: {
        conductor_id: conductorId,
        estado: 'pendiente',
        fecha: { gte: new Date(hoyISO) },
      },
      include: { conductores: true },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    })

    return NextResponse.json(
      turnos.map(t => ({
        id: t.id,
        fecha: t.fecha,
        hora: t.hora,
        estado: t.estado,
        tipo_turno: t.tipo_turno,
        conductor: {
          id: t.conductores?.id,
          cedula: t.conductores?.cedula,
          nombre: t.conductores?.nombre,
        }
      })),
      { status: 200 }
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
