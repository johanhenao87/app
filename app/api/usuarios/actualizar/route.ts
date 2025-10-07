import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId, telefono, correo, tipo_vehiculo } = await req.json()

    if (!conductorId) {
      return NextResponse.json({ error: 'Falta conductorId' }, { status: 400 })
    }

    const conductor = await prisma.conductores.findUnique({
      where: { id: Number(conductorId) }
    })

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    const actualizado = await prisma.conductores.update({
      where: { id: Number(conductorId) },
      data: {
        telefono: telefono ?? conductor.telefono,
        correo: correo ?? conductor.correo,
        tipo_vehiculo: tipo_vehiculo ?? conductor.tipo_vehiculo,
      },
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

    return NextResponse.json({ message: 'Perfil actualizado', perfil: actualizado }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
