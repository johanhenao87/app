import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const reglas = await prisma.reglas_agendamiento.findMany({
      orderBy: [{ nombre: 'asc' }],
    })
    const parametros = await prisma.parametros_agendamiento.findMany({
      orderBy: [{ clave: 'asc' }],
    })
    return NextResponse.json({ reglas, parametros }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error listando reglas/parametros' }, { status: 500 })
  }
}
