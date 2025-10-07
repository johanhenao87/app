import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "20"), 1), 50);

    if (q.length < 2) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // Búsqueda insensible a mayúsculas en nombre/cedula/telefono/correo
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
        correo: true,
        tipo_vehiculo: true,
        fecha_registro: true,
      },
    });

    // Normalizamos a ConductorMini
    const normalized = items.map((c) => ({
      id: c.id,
      cedula: c.cedula,
      nombre: c.nombre,
      telefono: c.telefono,
      correo: c.correo,
      tipo_vehiculo: c.tipo_vehiculo,
      fecha_registro: c.fecha_registro ? c.fecha_registro.toISOString() : null,
    }));

    return NextResponse.json({ items: normalized }, { status: 200 });
  } catch (error) {
    console.error("buscar conductores:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
