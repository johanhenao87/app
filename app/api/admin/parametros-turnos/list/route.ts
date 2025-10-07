// app/api/admin/parametros-turnos/list/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Lee todos los slots configurados (normal / caja_rapida)
    const items = await prisma.parametrosTurnos.findMany({
      orderBy: [{ tipo_turno: 'asc' }, { hora: 'asc' }],
    })

    // (opcional) adapta el shape si tu UI lo necesita
    const data = items.map(it => ({
      id: it.id,
      tipo_turno: it.tipo_turno,
      hora: it.hora,             // 'HH:mm'
      cupo_maximo: it.cupo_maximo,
      activo: it.activo,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }))

    return NextResponse.json({ ok: true, items: data }, { status: 200 })
  } catch (e) {
    console.error('parametros-turnos/list', e)
    return NextResponse.json({ ok: false, error: 'No se pudo cargar ParametrosTurnos' }, { status: 500 })
  }
}
