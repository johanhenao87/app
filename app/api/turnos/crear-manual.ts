// src/pages/api/admin/turnos/crear-manual.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/admin/turnos/crear-manual
 * Body esperado:
 * {
 *   conductorId?: number,
 *   nuevoConductor?: { cedula, nombre, telefono?, correo?, tipo_vehiculo },
 *   fecha: string (YYYY-MM-DD),
 *   hora: string (HH:mm),
 *   tipo_turno: string,
 *   tipo_vehiculo: string,
 *   operacion: string,
 *   estadoInicial?: string,
 *   override: true,
 *   motivo_admin: string
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const {
      conductorId,
      nuevoConductor,
      fecha,
      hora,
      tipo_turno,
      tipo_vehiculo,
      operacion,
      estadoInicial,
      override,
      motivo_admin
    } = req.body;

    if (!override || !motivo_admin) {
      return res.status(400).json({ error: "Debe enviar override=true y motivo_admin" });
    }

    // 1️⃣ Si viene nuevoConductor, lo creamos
    let finalConductorId = conductorId;
    if (!finalConductorId && nuevoConductor) {
      const conductor = await prisma.conductores.create({
        data: {
          cedula: nuevoConductor.cedula,
          nombre: nuevoConductor.nombre,
          telefono: nuevoConductor.telefono ?? null,
          correo: nuevoConductor.correo ?? null,
          password_hash: "TEMP", // TODO: lógica de password
          tipo_vehiculo: nuevoConductor.tipo_vehiculo
        }
      });
      finalConductorId = conductor.id;
    }

    if (!finalConductorId) {
      return res.status(400).json({ error: "Debe enviar conductorId o datos de nuevoConductor" });
    }

    // 2️⃣ Crear el turno ignorando reglas
    const nuevoTurno = await prisma.turnos.create({
      data: {
        conductor_id: finalConductorId,
        fecha: new Date(fecha),
        hora: new Date(`${fecha}T${hora}:00`),
        tipo_turno,
        estado: estadoInicial ?? "pendiente",
        operacion,
        tipo_vehiculo_turno: tipo_vehiculo,
        placa: req.body.placa ?? null,
        motivo_admin,
        prioridad: null,
        orden_dia: null
      }
    });

    // 3️⃣ Registrar en auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: nuevoTurno.id,
        accion: "crear-manual",
        usuario: "admin", // TODO: reemplazar por el usuario real autenticado
        motivo_admin,
        antes: undefined,
        despues: nuevoTurno
      }
    });

    return res.status(201).json({ success: true, turno: nuevoTurno });
  } catch (error: any) {
    console.error("Error en crear-manual:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
}
