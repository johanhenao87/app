import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { localDateToUTC, localTimeToUTC } from '@/app/lib/tz' // 👈 helpers GMT-5 (Bogotá)

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const {
      conductorId,
      fecha,             // "YYYY-MM-DD" (interpretada en America/Bogota)
      hora,              // "HH:MM"      (interpretada en America/Bogota)
      // tipo_turno       // ya no lo pedimos desde el cliente para normales
      tipo_vehiculo,     // requerido: SEN | TM | CB | DLL | XL | MM
      operacion,         // requerido: "cargue" | "descargue"
      actualizarTipoVehiculo // opcional: true/false para actualizar el perfil del conductor
    } = await req.json()

    // --- Validaciones de presencia ---
    if (!conductorId || !fecha || !hora || !tipo_vehiculo || !operacion) {
      return NextResponse.json(
        { error: 'Faltan datos: conductorId, fecha, hora, tipo_vehiculo y operacion son obligatorios' },
        { status: 400 }
      )
    }

    // --- Normalizaciones ---
    const tipoVeh = String(tipo_vehiculo).toUpperCase()
    const oper = String(operacion).toLowerCase()
    if (!['cargue', 'descargue'].includes(oper)) {
      return NextResponse.json({ error: 'operacion inválida (cargue | descargue)' }, { status: 400 })
    }

    // --- Validar existencia del conductor ---
    const conductor = await prisma.conductores.findUnique({
      where: { id: Number(conductorId) }
    })
    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // --- Actualizar tipo_vehiculo si se solicita ---
    if (actualizarTipoVehiculo && (conductor.tipo_vehiculo || '').toUpperCase() !== tipoVeh) {
      await prisma.conductores.update({
        where: { id: conductor.id },
        data: { tipo_vehiculo: tipoVeh }
      })
    }

    // --- Construcción de fecha/hora en UTC desde la zona local (Bogotá) ---
    //    fechaTurno: instante UTC que representa "YYYY-MM-DD 00:00" local
    //    horaTurno:  instante UTC anclado al 01-01-1970 con "HH:mm" local
    const fechaTurno = localDateToUTC(fecha)
    const horaTurno  = localTimeToUTC(hora)

    // --- Validación de horario laboral (06:00–17:00 fin exclusivo) ---
    const h = horaTurno.getUTCHours() // ya es equivalente a la hora local
    if (h < 6 || h >= 17) {
      return NextResponse.json(
        { error: 'El horario permitido es entre 06:00 y 17:00' },
        { status: 400 }
      )
    }

    // --- No domingos (en base a la fecha local convertida a UTC) ---
    const diaSemana = fechaTurno.getUTCDay() // 0 = domingo
    if (diaSemana === 0) {
      return NextResponse.json(
        { error: 'No se permiten turnos los domingos' },
        { status: 400 }
      )
    }

    // --- Festivos/bloqueos por calendario ---
    const festivo = await prisma.calendario.findUnique({ where: { fecha: fechaTurno } })
    if (festivo && festivo.habilitado === false) {
      return NextResponse.json(
        { error: festivo.motivo || 'Día no habilitado para agendamiento' },
        { status: 400 }
      )
    }

    // --- Un turno por día (pendiente/confirmado/finalizado) ---
    const yaTiene = await prisma.turnos.findFirst({
      where: {
        conductor_id: Number(conductorId),
        fecha: fechaTurno,
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] }
      }
    })
    if (yaTiene) {
      return NextResponse.json(
        { error: 'Ya tienes un turno para ese día' },
        { status: 400 }
      )
    }

    // --- Capacidad por franja 4h (solo NORMAL) ---
    //     La franja se calcula a partir de la hora local convertida a UTC.
    const horaInicio = new Date(horaTurno)
    const horaFin = new Date(horaTurno)
    horaFin.setUTCHours(horaInicio.getUTCHours() + 4)

    const count = await prisma.turnos.count({
      where: {
        fecha: fechaTurno,
        tipo_turno: 'normal',
        hora: { gte: horaInicio, lt: horaFin },
        estado: { in: ['pendiente', 'confirmado', 'finalizado'] }
      }
    })
    if (count >= 5) {
      return NextResponse.json(
        { error: 'La franja horaria ya está llena (máximo 5 vehículos cada 4 horas)' },
        { status: 400 }
      )
    }

    // --- Crear turno NORMAL con snapshot de tipo_vehiculo y operación ---
    const nuevoTurno = await prisma.turnos.create({
      data: {
        conductor_id: Number(conductorId),
        fecha: fechaTurno,
        hora: horaTurno,
        tipo_turno: 'normal',
        estado: 'pendiente',
        operacion: oper,                 // cargue | descargue
        tipo_vehiculo_turno: tipoVeh     // snapshot del tipo de vehículo en este turno
      }
    })

    // --- Auditoría ---
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: nuevoTurno.id,
        accion: 'agendado_normal',
        usuario: conductor.cedula || 'sistema'
      }
    })

    return NextResponse.json(
      { message: 'Turno agendado con éxito', turno: nuevoTurno },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
