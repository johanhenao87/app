import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const CAJA_SLOTS = [6, 8, 10, 12, 14, 16, 18]
const ESTADOS_PERMITIDOS = new Set(['pendiente', 'confirmado'])

function isHourAllowedCajaRapida(hh: number) { return CAJA_SLOTS.includes(hh) }
function isHourAllowedNormal(hh: number) { return hh >= 6 && hh < 17 }
function getSlotHour(date: Date) { return date.getUTCHours() }

async function findTempHourFor(
  tx: Prisma.TransactionClient,
  conductorId: number,
  fecha: Date,
  base: Date
) {
  for (let add = 1; add <= 59; add++) {
    const temp = new Date(base.getTime() + add * 60_000)
    const conflict = await tx.turnos.findFirst({
      where: {
        conductor_id: conductorId,
        fecha,
        hora: temp,
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] },
      },
      select: { id: true }
    })
    if (!conflict) return temp
  }
  throw new Error('NO_TEMP_SLOT')
}

export async function POST(req: Request) {
  try {
    const { turnoAId, turnoBId, usuario } = await req.json()

    if (!turnoAId || !turnoBId) {
      return NextResponse.json({ error: 'Faltan datos: turnoAId y turnoBId' }, { status: 400 })
    }
    if (turnoAId === turnoBId) {
      return NextResponse.json({ error: 'No se puede intercambiar el mismo turno' }, { status: 400 })
    }

    const [A, B] = await Promise.all([
      prisma.turnos.findUnique({ where: { id: Number(turnoAId) }, include: { conductores: true } }),
      prisma.turnos.findUnique({ where: { id: Number(turnoBId) }, include: { conductores: true } }),
    ])
    if (!A || !B) return NextResponse.json({ error: 'Alguno de los turnos no existe' }, { status: 404 })

    // ✅ Ambos turnos deben tener conductor asignado
    if (A.conductor_id == null || B.conductor_id == null) {
      return NextResponse.json({ error: 'No se puede intercambiar: hay turnos sin conductor asignado' }, { status: 409 })
    }

    const estA = (A.estado || '').toLowerCase()
    const estB = (B.estado || '').toLowerCase()
    if (!ESTADOS_PERMITIDOS.has(estA) || !ESTADOS_PERMITIDOS.has(estB)) {
      return NextResponse.json(
        { error: 'Solo se pueden intercambiar turnos en estados pendiente o confirmado' },
        { status: 409 }
      )
    }
    if (A.fecha.getTime() !== B.fecha.getTime()) {
      return NextResponse.json({ error: 'El intercambio solo está permitido dentro del mismo día' }, { status: 409 })
    }

    const hhA_dest = getSlotHour(B.hora) // A tomará la hora de B
    const hhB_dest = getSlotHour(A.hora) // B tomará la hora de A

    const A_esCR = (A.tipo_turno === 'caja_rapida') || ((A.tipo_vehiculo_turno || '').toUpperCase() === 'SEN')
    const B_esCR = (B.tipo_turno === 'caja_rapida') || ((B.tipo_vehiculo_turno || '').toUpperCase() === 'SEN')

    if (A_esCR && !isHourAllowedCajaRapida(hhA_dest)) {
      return NextResponse.json({ error: `El turno #${A.id} (caja rápida) no puede moverse a las ${String(hhA_dest).padStart(2,'0')}:00` }, { status: 409 })
    }
    if (!A_esCR && !isHourAllowedNormal(hhA_dest)) {
      return NextResponse.json({ error: `El turno #${A.id} (normal) no puede moverse a las ${String(hhA_dest).padStart(2,'0')}:00` }, { status: 409 })
    }
    if (B_esCR && !isHourAllowedCajaRapida(hhB_dest)) {
      return NextResponse.json({ error: `El turno #${B.id} (caja rápida) no puede moverse a las ${String(hhB_dest).padStart(2,'0')}:00` }, { status: 409 })
    }
    if (!B_esCR && !isHourAllowedNormal(hhB_dest)) {
      return NextResponse.json({ error: `El turno #${B.id} (normal) no puede moverse a las ${String(hhB_dest).padStart(2,'0')}:00` }, { status: 409 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Evitar mismo slot para el mismo conductor
      const dupA = await tx.turnos.findFirst({
        where: {
          id: { not: A.id },
          conductor_id: A.conductor_id!,     // 👈 ya validado arriba
          fecha: A.fecha,
          hora: B.hora,
          estado: { in: ['pendiente','confirmado','finalizado'] },
        },
        select: { id: true }
      })
      if (dupA) throw new Error('DUPLICADO_A')

      const dupB = await tx.turnos.findFirst({
        where: {
          id: { not: B.id },
          conductor_id: B.conductor_id!,     // 👈 ya validado arriba
          fecha: B.fecha,
          hora: A.hora,
          estado: { in: ['pendiente','confirmado','finalizado'] },
        },
        select: { id: true }
      })
      if (dupB) throw new Error('DUPLICADO_B')

      // 1) A → hora temporal
      const tempHoraA = await findTempHourFor(tx, A.conductor_id!, A.fecha, A.hora)
      await tx.turnos.update({ where: { id: A.id }, data: { hora: tempHoraA } })

      // 2) B → hora de A
      await tx.turnos.update({ where: { id: B.id }, data: { hora: A.hora } })

      // 3) A → hora de B
      const updA = await tx.turnos.update({ where: { id: A.id }, data: { hora: B.hora }, include: { conductores: true } })
      const updB = await tx.turnos.update({ where: { id: B.id }, data: { hora: A.hora }, include: { conductores: true } })

      // Auditoría
      const actor = (usuario || A.conductores?.cedula || B.conductores?.cedula || 'sistema')
      await tx.auditoriaTurnos.createMany({
        data: [
          { turno_id: updA.id, accion: `intercambiar_hora_con_${updB.id}`, usuario: actor },
          { turno_id: updB.id, accion: `intercambiar_hora_con_${updA.id}`, usuario: actor },
        ]
      })

      return { A: updA, B: updB }
    }).catch((e) => {
      if (e instanceof Error) {
        if (e.message === 'DUPLICADO_A') return { __error: `El conductor del turno #${A?.id} ya tiene un turno a esa hora` }
        if (e.message === 'DUPLICADO_B') return { __error: `El conductor del turno #${B?.id} ya tiene un turno a esa hora` }
        if (e.message === 'NO_TEMP_SLOT') return { __error: 'No fue posible reservar hora temporal para el intercambio' }
      }
      throw e
    })

    if ((result as any)?.__error) {
      return NextResponse.json({ error: (result as any).__error }, { status: 409 })
    }

    return NextResponse.json({
      message: `Intercambio realizado: #${turnoAId} ↔ #${turnoBId}`,
      ...result
    }, { status: 200 })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
