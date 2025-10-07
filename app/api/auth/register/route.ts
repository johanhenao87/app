import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { cedula, nombre, telefono, correo, password, tipo_vehiculo } = await req.json()

    if (!cedula || !nombre || !password || !tipo_vehiculo) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (cédula, nombre, contraseña, tipo de vehículo)' },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const existe = await prisma.conductores.findUnique({
      where: { cedula },
    })

    if (existe) {
      return NextResponse.json(
        { error: 'El conductor ya está registrado' },
        { status: 400 }
      )
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear conductor con tipo de vehículo
    const nuevoConductor = await prisma.conductores.create({
      data: {
        cedula,
        nombre,
        telefono,
        correo,
        password_hash: hashedPassword,
        tipo_vehiculo, // 👈 Aquí lo añadimos
      },
    })

    return NextResponse.json(
      {
        message: 'Conductor registrado con éxito',
        conductor: {
          id: nuevoConductor.id,
          cedula: nuevoConductor.cedula,
          nombre: nuevoConductor.nombre,
          tipo_vehiculo: nuevoConductor.tipo_vehiculo,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
