import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { conductorId, oldPassword, newPassword } = await req.json()

    if (!conductorId || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Faltan campos: conductorId, oldPassword, newPassword' },
        { status: 400 }
      )
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const user = await prisma.conductores.findUnique({ where: { id: Number(conductorId) } })
    if (!user) return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })

    const ok = await bcrypt.compare(String(oldPassword), user.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'La contraseña actual no es válida' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(String(newPassword), 10)
    await prisma.conductores.update({
      where: { id: user.id },
      data: { password_hash: newHash }
    })

    return NextResponse.json({ message: 'Contraseña actualizada correctamente' }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
