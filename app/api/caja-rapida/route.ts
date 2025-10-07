import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId } = await req.json()

    if (!conductorId) {
      return NextResponse.json({ error: 'Falta conductorId' }, { status: 400 })
    }

    // Verificar si ya tiene asignación en caja rápida
    const existente = await prisma.caja_rapida.findFirst({
      where: { conductor_id: conductorId, activo: true }
    })

    if (existente) {
      return NextResponse.json({ 
        message: 'Ya tienes acceso a caja rápida',
        caja: existente
      }, { status: 200 })
    }

    // Si no existe, crear nuevo registro de caja rápida
    const nuevo = await prisma.caja_rapida.create({
      data: {
        conductor_id: conductorId,
        activo: true,
        motivo: null
      }
    })

    return NextResponse.json({ 
      message: 'Caja rápida asignada con éxito',
      caja: nuevo
    }, { status: 201 })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
