import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId } = await req.json()

    if (!conductorId) {
      return NextResponse.json({ error: 'Falta conductorId' }, { status: 400 })
    }

    const c = await prisma.conductores.findUnique({
      where: { id: Number(conductorId) },
      select: {
        id: true,
        cedula: true,
        nombre: true,
        telefono: true,
        correo: true,
        tipo_vehiculo: true,
        fecha_registro: true,
      }
    })

    if (!c) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ perfil: c }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
