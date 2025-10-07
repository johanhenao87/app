import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conductorId,
      nuevoConductor,
      fecha,           // "YYYY-MM-DD"
      hora,            // "HH:mm"
      tipo_turno,
      tipo_vehiculo,
      operacion,
      estadoInicial,
      override,
      motivo_admin,
      placa
    } = body;

    if (!override || !motivo_admin) {
      return NextResponse.json({ error: "Debe enviar override=true y motivo_admin" }, { status: 400 });
    }

    // 1) Crear conductor opcionalmente
    let finalConductorId = conductorId as number | undefined;
    if (!finalConductorId && nuevoConductor) {
      const c = await prisma.conductores.create({
        data: {
          cedula: nuevoConductor.cedula,
          nombre: nuevoConductor.nombre,
          telefono: nuevoConductor.telefono ?? null,
          correo: nuevoConductor.correo ?? null,
          password_hash: "TEMP", // TODO: ajustar
          tipo_vehiculo: nuevoConductor.tipo_vehiculo ?? null
        }
      });
      finalConductorId = c.id;
    }

    if (!finalConductorId) {
      return NextResponse.json({ error: "Debe enviar conductorId o datos de nuevoConductor" }, { status: 400 });
    }

    // 2) Crear turno (forzado)
    const nuevoTurno = await prisma.turnos.create({
      data: {
        conductor_id: finalConductorId,
        fecha: new Date(fecha),
        hora: new Date(`${fecha}T${hora}:00`),
        tipo_turno,
        estado: estadoInicial ?? "pendiente",
        operacion,
        tipo_vehiculo_turno: tipo_vehiculo,
        placa: placa ?? null,
        motivo_admin,
        prioridad: null,
        orden_dia: null
      }
    });

    // 3) Auditoría (nota: JSON -> usar undefined si no hay valor)
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: nuevoTurno.id,
        accion: "crear-manual",
        usuario: "admin", // TODO: reemplazar por usuario autenticado
        motivo_admin,
        antes: undefined,     // <- clave del fix: no usar null
        despues: nuevoTurno
      }
    });

    return NextResponse.json({ success: true, turno: nuevoTurno }, { status: 201 });
  } catch (e: any) {
    console.error("[crear-manual] error:", e);
    return NextResponse.json({ error: "Error interno", detalle: e?.message }, { status: 500 });
  }
}
