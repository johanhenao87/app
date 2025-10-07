import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { cedula } = await req.json()
    if (!cedula) {
      return NextResponse.json({ error: 'Falta cédula' }, { status: 400 })
    }

    const conductor = await prisma.conductores.findUnique({ where: { cedula } })
    if (!conductor) {
      // No revelamos que no existe; respondemos OK para seguridad
      return NextResponse.json({ message: 'Si el usuario existe, se generó un código' }, { status: 200 })
    }

    const code = genCode()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 min
    await prisma.resetCodes.create({
      data: {
        conductor_id: conductor.id,
        code,
        expires_at: expires
      }
    })

    // 🔔 Por ahora devolvemos el código en la respuesta para pruebas.
    // Luego lo enviaremos por WhatsApp/email vía n8n/Power Automate.
    return NextResponse.json({ message: 'Código generado', code, expires_at: expires }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
