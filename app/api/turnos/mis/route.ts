import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId, incluirPasados = false } = await req.json()

    if (!conductorId) {
      return NextResponse.json(
        { error: 'Falta conductorId' },
        { status: 400 }
      )
    }

    const hoy = new Date()
    // Si no quieres pasados, filtramos desde hoy (00:00Z)
    const whereFecha: any = incluirPasados ? {} : { gte: new Date(hoy.toISOString().slice(0, 10)) }

    const turnos = await prisma.turnos.findMany({
      where: {
        conductor_id: Number(conductorId),
        fecha: whereFecha,
      },
      include: { conductores: true },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    })

    // ⬇️ Devolvemos también operacion y tipo_vehiculo_turno
    return NextResponse.json(
      turnos.map(t => ({
        id: t.id,
        fecha: t.fecha,
        hora: t.hora,
        estado: t.estado,
        tipo_turno: t.tipo_turno,
        operacion: t.operacion,                 // 👈 nuevo
        tipo_vehiculo_turno: t.tipo_vehiculo_turno, // 👈 nuevo
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
