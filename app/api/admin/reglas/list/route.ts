// app/api/admin/reglas/list/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Reglas numéricas (por ejemplo: cupo por franja 4h)
    const reglas = await prisma.reglas_agendamiento.findMany({
      orderBy: [{ id: 'asc' }],
    })

    // Parámetros tipo clave/valor (si tu UI los llega a mostrar más adelante)
    const parametros = await prisma.parametros_agendamiento.findMany({
      orderBy: [{ clave: 'asc' }],
    })

    return NextResponse.json(
      {
        ok: true,
        reglas: reglas.map(r => ({
          id: r.id,
          nombre: r.nombre,
          valor: r.valor,
          descripcion: r.descripcion,
        })),
        parametros: parametros.map(p => ({
          id: p.id,
          clave: p.clave,
          valor: p.valor,
          descripcion: p.descripcion,
        })),
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('reglas/list', e)
    return NextResponse.json({ ok: false, error: 'No se pudieron cargar las reglas' }, { status: 500 })
  }
}
