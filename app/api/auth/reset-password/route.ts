import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { cedula, code, newPassword } = await req.json()
    if (!cedula || !code || !newPassword) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const conductor = await prisma.conductores.findUnique({ where: { cedula } })
    if (!conductor) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const rc = await prisma.resetCodes.findFirst({
      where: {
        conductor_id: conductor.id,
        code,
        used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: { id: 'desc' }
    })

    if (!rc) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.conductores.update({
      where: { id: conductor.id },
      data: { password_hash: hash }
    })

    await prisma.resetCodes.update({
      where: { id: rc.id },
      data: { used: true }
    })

    return NextResponse.json({ message: 'Contraseña actualizada' }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

