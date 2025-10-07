import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const parametros = await prisma.parametrosTurnos.findMany({
      orderBy: [{ tipo_turno: 'asc' }, { hora: 'asc' }],
    })
    return NextResponse.json({ parametros }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error listando ParametrosTurnos' }, { status: 500 })
  }
}
