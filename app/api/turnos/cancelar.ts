// src/pages/api/admin/turnos/cancelar.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/admin/turnos/cancelar
 * Body esperado:
 * {
 *   turnoId: number,
 *   override: true,
 *   motivo_admin: string
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { turnoId, override, motivo_admin } = req.body;

    if (!turnoId) {
      return res.status(400).json({ error: "Debe enviar turnoId" });
    }
    if (!override || !motivo_admin) {
      return res.status(400).json({ error: "Debe enviar override=true y motivo_admin" });
    }

    // 1️⃣ Buscar turno existente
    const turno = await prisma.turnos.findUnique({ where: { id: turnoId } });
    if (!turno) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    // 2️⃣ Actualizar estado a cancelado (forzado)
    const cancelado = await prisma.turnos.update({
      where: { id: turnoId },
      data: {
        estado: "cancelado",
        motivo_admin
      }
    });

    // 3️⃣ Registrar en auditoría
    await prisma.auditoriaTurnos.create({
      data: {
        turno_id: cancelado.id,
        accion: "cancelar-manual",
        usuario: "admin", // TODO: reemplazar con usuario real autenticado
        motivo_admin,
        antes: turno,
        despues: cancelado
      }
    });

    return res.status(200).json({ success: true, turno: cancelado });
  } catch (error: any) {
    console.error("Error en cancelar-manual:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
}
