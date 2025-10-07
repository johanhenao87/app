// app/app/api/turnos/dia/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { localDateToUTC, utcDateToLocalYMD, utcTimeToLocalHM } from '@/app/lib/tz'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { fecha } = await req.json() as { fecha?: string }

    if (!fecha) {
      return NextResponse.json(
        { error: 'Falta la fecha (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Interpretamos la fecha recibida como local Bogotá y la convertimos al instante UTC 00:00 local
    const fechaDia = localDateToUTC(fecha)

    // Listar turnos del día exacto
    const turnos = await prisma.turnos.findMany({
      where: { fecha: fechaDia },
      include: { conductores: true },
      orderBy: [{ hora: 'asc' }],
    })

    // Responder con strings locales: fecha 'YYYY-MM-DD' y hora 'HH:mm' (America/Bogota)
    const payload = turnos.map(t => ({
      id: t.id,
      fecha: utcDateToLocalYMD(t.fecha as unknown as Date),  // 'YYYY-MM-DD'
      hora:  utcTimeToLocalHM(t.hora as unknown as Date),     // 'HH:mm'
      estado: t.estado,
      tipo_turno: t.tipo_turno,
      operacion: t.operacion,
      tipo_vehiculo_turno: t.tipo_vehiculo_turno,
      conductor: {
        id: t.conductores?.id,
        cedula: t.conductores?.cedula,
        nombre: t.conductores?.nombre,
        telefono: t.conductores?.telefono,
      }
    }))

    return NextResponse.json(payload, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
