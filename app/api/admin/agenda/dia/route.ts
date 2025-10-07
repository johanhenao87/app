// app/api/admin/agenda/dia/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fmtDateISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtTimeHHmm(t: Date): string {
  // 👇 usar UTC para no desplazar la hora almacenada en la DB
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * GET /api/admin/agenda/dia?fecha=YYYY-MM-DD[&tipo_turno=normal|caja_rapida]
 * Devuelve los turnos del día con datos básicos del conductor.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaStr = (searchParams.get("fecha") || "").trim();
    const tipo_turno = (searchParams.get("tipo_turno") || "").trim();

    if (!fechaStr || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      return NextResponse.json(
        { error: "Parámetro 'fecha' requerido (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const where: any = { fecha: new Date(`${fechaStr}T00:00:00.000Z`) };
    if (tipo_turno) where.tipo_turno = tipo_turno;

    const turnos = await prisma.turnos.findMany({
      where,
      orderBy: [
        { fecha: "asc" },
        { orden_dia: "asc" }, // si es null, luego ordena por hora
        { hora: "asc" },
        { id: "asc" },
      ],
      select: {
        id: true,
        fecha: true,
        hora: true,
        tipo_turno: true,
        estado: true,
        placa: true,
        operacion: true,
        tipo_vehiculo_turno: true,
        conductores: { select: { nombre: true, cedula: true } },
      },
    });

    const rows = turnos.map((t) => ({
      id: t.id,
      fecha: fmtDateISO(t.fecha as unknown as Date),
      hora: fmtTimeHHmm(t.hora as unknown as Date), // 👈 ahora correcto
      tipo_turno: t.tipo_turno,
      estado: t.estado,
      placa: t.placa,
      operacion: t.operacion,
      tipo_vehiculo_turno: t.tipo_vehiculo_turno,
      conductor: {
        nombre: t.conductores?.nombre ?? null,
        cedula: t.conductores?.cedula ?? null,
      },
    }));

    return NextResponse.json(
      { turnos: rows },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("agenda/dia error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
