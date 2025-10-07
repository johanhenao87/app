// src/pages/api/admin/turnos/mover.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/admin/turnos/mover
 * Body esperado:
 * {
 *   turnoId: number,
 *   nuevaFecha: string (YYYY-MM-DD),
 *   nuevaHora: string (HH:mm),
 *   override: true,
 *   motivo_admin: string
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { turnoId, nuevaFecha, nuevaHora, override, motivo_admin } = req.body;

    if (!turnoId || !nuevaFecha || !nuevaHora) {
      return res.status(400).json({ error: "Debe enviar turnoId, nuevaFecha y nuevaHora" });
    }
    if (!override || !motivo_admin) {
      return res.status(400).json({ error: "Debe enviar override=true y motivo_admin" });
    }

    // 1️⃣ Buscar turno original
    const turnoOriginal = await prisma.turnos.findUnique({ where: { id: turnoId } });
    if (!turnoOriginal) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    // 2️⃣ Actualizar fecha y hora (forzado)
    const turnoMovido = await prisma.turnos.update({
      where: { id: turnoId },
      data: {
        fecha: new Date(nuevaFecha),
        hora: new Date(`${nuevaFecha}T${nuevaHora}:00`),
        motivo_admin
      }
    });

    // 3️⃣ Registrar auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: turnoMovido.id,
        accion: "mover-manual",
        usuario: "admin", // TODO: sustituir por usuario real autenticado
        motivo_admin,
        antes: turnoOriginal,
        despues: turnoMovido
      }
    });

    return res.status(200).json({ success: true, turno: turnoMovido });
  } catch (error: any) {
    console.error("Error en mover-manual:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
}
