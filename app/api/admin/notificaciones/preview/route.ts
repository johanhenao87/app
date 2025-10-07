import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Item = {
  turnoId: number;
  tipo: "reprogramado" | "cancelado" | "prioridad" | "rollover";
  canal: "sms" | "whatsapp" | "email";
  motivo_admin?: string;
};

function hhmm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTexto(opts: {
  tipo: Item["tipo"];
  nombre?: string | null;
  fecha: Date;
  hora: Date;
  placa?: string | null;
  motivo?: string | undefined;
}) {
  const nombre = opts.nombre || "Conductor";
  const fecha = yyyymmdd(opts.fecha);
  const hora = hhmm(opts.hora);
  const placa = opts.placa ? ` (placa ${opts.placa})` : "";
  const motivo = opts.motivo ? `\nMotivo: ${opts.motivo}` : "";

  switch (opts.tipo) {
    case "cancelado":
      return `Hola ${nombre}, tu turno${placa} fue CANCELADO.\nFecha: ${fecha} ${hora}.${motivo}`;
    case "reprogramado":
      return `Hola ${nombre}, tu turno${placa} fue REPROGRAMADO.\nNueva fecha/hora: ${fecha} ${hora}.${motivo}`;
    case "prioridad":
      return `Hola ${nombre}, tu turno${placa} fue PRIORIZADO y movido.\nNueva fecha/hora: ${fecha} ${hora}.${motivo}`;
    case "rollover":
    default:
      return `Hola ${nombre}, tu turno${placa} fue MOVIDO al día siguiente.\nNueva fecha/hora: ${fecha} ${hora}.${motivo}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: Item[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "items vacío" }, { status: 400 });
    }

    // Cargamos todos los turnos requeridos de una vez
    const ids = [...new Set(items.map((i) => i.turnoId))];
    const turnos = await prisma.turnos.findMany({
      where: { id: { in: ids } },
      include: {
        conductores: { select: { nombre: true, telefono: true, correo: true } },
      },
    });

    const byId = new Map(turnos.map((t) => [t.id, t]));
    const previews = items.map((it) => {
      const t = byId.get(it.turnoId);
      if (!t) {
        return { turnoId: it.turnoId, canal: it.canal, error: "Turno no encontrado" };
      }
      const text = buildTexto({
        tipo: it.tipo,
        nombre: t.conductores?.nombre,
        fecha: t.fecha as unknown as Date,
        hora: t.hora as unknown as Date,
        placa: t.placa,
        motivo: it.motivo_admin,
      });

      let to: string | undefined;
      if (it.canal === "email") to = t.conductores?.correo || undefined;
      if (it.canal === "sms" || it.canal === "whatsapp")
        to = t.conductores?.telefono || undefined;

      if (!to) {
        return {
          turnoId: it.turnoId,
          canal: it.canal,
          text,
          error: "Conductor sin dato de contacto para ese canal",
        };
      }

      return { turnoId: it.turnoId, canal: it.canal, to, text };
    });

    return NextResponse.json({ previews }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
