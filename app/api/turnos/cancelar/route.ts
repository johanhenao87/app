import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { turnoId, usuario, override, motivo_admin } = await req.json() as {
      turnoId: number
      usuario?: string
      override?: boolean
      motivo_admin?: string
    }

    if (!turnoId) {
      return NextResponse.json({ error: 'Falta el ID del turno' }, { status: 400 })
    }

    // Buscar turno con datos de conductor
    const turno = await prisma.turnos.findUnique({
      where: { id: Number(turnoId) },
      include: { conductores: true },
    })

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    // Si ya estaba cancelado, devolvemos ok (idempotencia)
    if (turno.estado === 'cancelado') {
      return NextResponse.json(
        { message: 'El turno ya estaba cancelado', turno },
        { status: 200 }
      )
    }

    // 🔒 Regla de 12 horas SOLO si NO hay override
    if (!override) {
      const ahora = new Date()
      const fechaTurno = new Date(turno.fecha)   // yyyy-mm-dd
      const horaTurno = new Date(turno.hora)     // 1970-01-01THH:mm:ss.sssZ

      // Alinea fechaTurno con horaTurno (en UTC para evitar desfases)
      fechaTurno.setUTCHours(
        horaTurno.getUTCHours(),
        horaTurno.getUTCMinutes(),
        0, 0
      )

      const diffMs = fechaTurno.getTime() - ahora.getTime()
      const diffHoras = diffMs / (1000 * 60 * 60)

      if (diffHoras < 12) {
        return NextResponse.json(
          { error: 'No es posible cancelar: faltan menos de 12 horas para la cita' },
          { status: 400 }
        )
      }
    } else {
      // Con override exigimos motivo_admin por trazabilidad
      if (!motivo_admin || typeof motivo_admin !== 'string' || !motivo_admin.trim()) {
        return NextResponse.json(
          { error: 'Para cancelar con override debe enviar motivo_admin' },
          { status: 400 }
        )
      }
    }

    // Cambiar estado a cancelado (forzado o normal)
    const turnoCancelado = await prisma.turnos.update({
      where: { id: Number(turnoId) },
      data: {
        estado: 'cancelado',
        // Guardamos motivo_admin si viene (en normal es opcional, en override es obligatorio)
        ...(motivo_admin ? { motivo_admin } : {}),
      },
      include: { conductores: true },
    })

    // Auditoría — usar JSON válido (no enviar null)
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: Number(turnoId),
        accion: override ? 'cancelar-manual' : 'cancelar',
        usuario: usuario || turno.conductores?.cedula || 'sistema',
        ...(motivo_admin ? { motivo_admin } : {}),
        antes: turno,            // JSON ok
        despues: turnoCancelado  // JSON ok
      },
    })

    return NextResponse.json(
      { message: 'Turno cancelado con éxito', turno: turnoCancelado },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[cancelar] error:', error)
    return NextResponse.json({ error: 'Error interno del servidor', detalle: error?.message }, { status: 500 })
  }
}
