import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json()

    if (!cedula || !password) {
      return NextResponse.json(
        { error: 'Cédula y contraseña son obligatorias' },
        { status: 400 }
      )
    }

    // Buscar conductor
    const conductor = await prisma.conductores.findUnique({
      where: { cedula },
    })

    if (!conductor) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' },
        { status: 404 }
      )
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, conductor.password_hash)

    if (!passwordValida) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      )
    }

    // ✅ Ahora devolvemos también tipo_vehiculo
    return NextResponse.json(
      {
        message: 'Login exitoso',
        conductor: {
          id: conductor.id,
          nombre: conductor.nombre,
          cedula: conductor.cedula,
          tipo_vehiculo: conductor.tipo_vehiculo, // 👈 agregado
        },
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
