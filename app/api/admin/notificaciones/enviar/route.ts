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

    // Traemos turnos+conductor
    const ids = [...new Set(items.map((i) => i.turnoId))];
    const turnos = await prisma.turnos.findMany({
      where: { id: { in: ids } },
      include: {
        conductores: { select: { nombre: true, telefono: true, correo: true } },
      },
    });
    const byId = new Map(turnos.map((t) => [t.id, t]));

    const results: Array<{ turnoId: number; canal: string; estado: string; error?: string }> = [];

    for (const it of items) {
      const t = byId.get(it.turnoId);
      if (!t) {
        results.push({ turnoId: it.turnoId, canal: it.canal, estado: "fallo", error: "Turno no encontrado" });
        continue;
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
        await prisma.notificacion.create({
          data: {
            turno_id: it.turnoId,
            tipo: it.tipo,
            canal: it.canal,
            estado: "fallo",
            payload: { to: null, text },
            lastError: "Conductor sin dato de contacto para ese canal",
            intentos: 1,
          },
        });
        results.push({
          turnoId: it.turnoId,
          canal: it.canal,
          estado: "fallo",
          error: "Sin destino para el canal",
        });
        continue;
      }

      // Modo demo: "enviar" = log + guardar como enviado
      console.log(`[NOTIF-DEMO] ${it.canal} -> ${to}\n${text}\n---`);

      await prisma.notificacion.create({
        data: {
          turno_id: it.turnoId,
          tipo: it.tipo,
          canal: it.canal,
          estado: "enviado", // en real: 'pendiente' y un worker lo envía
          payload: { to, text, motivo_admin: it.motivo_admin },
          intentos: 1,
        },
      });

      results.push({ turnoId: it.turnoId, canal: it.canal, estado: "enviado" });
    }

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
