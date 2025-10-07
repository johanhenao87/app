import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/conductores/search?q=texto&limit=20
 * Devuelve un array de conductores [{ id, cedula, nombre, telefono, tipo_vehiculo }, ...]
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limitRaw = searchParams.get("limit") || "20";
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50);

    // Para no saturar: mínimo 2 caracteres
    if (q.length < 2) {
      return NextResponse.json([], { status: 200 });
    }

    const items = await prisma.conductores.findMany({
      where: {
        OR: [
          { nombre:   { contains: q, mode: "insensitive" } },
          { cedula:   { contains: q, mode: "insensitive" } },
          { telefono: { contains: q, mode: "insensitive" } },
          { correo:   { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      take: limit,
      select: {
        id: true,
        cedula: true,
        nombre: true,
        telefono: true,
        tipo_vehiculo: true,
      },
    });

    // El componente espera un ARRAY directo
    const plain = items.map(i => ({
      id: i.id,
      cedula: i.cedula || "",
      nombre: i.nombre || "",
      telefono: i.telefono || "",
      tipo_vehiculo: i.tipo_vehiculo || null,
    }));

    return NextResponse.json(plain, { status: 200 });
  } catch (err) {
    console.error("[/api/conductores/search] error:", err);
    return NextResponse.json([], { status: 200 }); // devolvemos array vacío para no romper la UI
  }
}
