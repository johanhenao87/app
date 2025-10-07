import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { renderTemplate, NotificacionTipo, Canal } from "@/app/lib/notificaciones/templates";
import { DemoProvider } from "@/app/lib/notificaciones/provider";

const prisma = new PrismaClient();
const provider = new DemoProvider();

type EnviarPayload =
  | {
      modo: "single";
      turnoId: number;
      tipo: NotificacionTipo;
      canal: Canal;
      motivo_admin?: string | null;
      fecha?: string;
      hora?: string;
    }
  | {
      modo: "batch";
      items: Array<{
        turnoId: number;
        tipo: NotificacionTipo;
        canal: Canal;
        motivo_admin?: string | null;
        fecha?: string;
        hora?: string;
      }>;
    };

// Utilidades
function toHHmm(d: Date) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function toYYYYMMDD(d: Date) {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}
function destinoByCanal(canal: Canal, contact: { telefono?: string | null; correo?: string | null }) {
  if (canal === "email") return contact.correo ?? "";
  return contact.telefono ?? "";
}

async function enviarUno(item: {
  turnoId: number;
  tipo: NotificacionTipo;
  canal: Canal;
  motivo_admin?: string | null;
  fecha?: string;
  hora?: string;
}) {
  const t = await prisma.turnos.findUnique({
    where: { id: Number(item.turnoId) },
    include: { conductores: true },
  });
  if (!t) return { turnoId: item.turnoId, ok: false, error: "Turno no encontrado" };

  const ctx = {
    turnoId: t.id,
    fecha: item.fecha ?? toYYYYMMDD(t.fecha),
    hora: item.hora ?? toHHmm(t.hora),
    placa: t.placa,
    conductor: {
      nombre: t.conductores?.nombre ?? null,
      telefono: t.conductores?.telefono ?? null,
      correo: t.conductores?.correo ?? null,
    },
    motivo_admin: item.motivo_admin ?? t.motivo_admin ?? null,
  };

  const text = renderTemplate(item.tipo, ctx);

  // Persistimos como "pendiente"
  const notif = await prisma.notificacion.create({
    data: {
      turno_id: t.id,
      tipo: item.tipo,
      canal: item.canal,
      payload: { to: destinoByCanal(item.canal, ctx.conductor || {}), text, ctx },
      estado: "pendiente",
      intentos: 0,
      lastError: null,
    },
  });

  // Enviar con proveedor demo
  const to = destinoByCanal(item.canal, ctx.conductor || {});
  if (!to) {
    await prisma.notificacion.update({
      where: { id: notif.id },
      data: { estado: "fallo", lastError: "Destino vacío (telefono/correo nulo)" },
    });
    return { turnoId: t.id, ok: false, error: "Destino vacío" };
  }

  const res = await provider.send({ canal: item.canal, to, text });

  if (res.ok) {
    await prisma.notificacion.update({
      where: { id: notif.id },
      data: { estado: "enviado", intentos: { increment: 1 } },
    });
    return { turnoId: t.id, ok: true };
  } else {
    await prisma.notificacion.update({
      where: { id: notif.id },
      data: { estado: "fallo", intentos: { increment: 1 }, lastError: res.error ?? "unknown" },
    });
    return { turnoId: t.id, ok: false, error: res.error ?? "unknown" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnviarPayload;

    if ((body as any).modo === "single") {
      const item = body as Extract<EnviarPayload, { modo: "single" }>;
      const r = await enviarUno(item);
      return NextResponse.json({ success: true, resultado: r }, { status: 200 });
    }

    if ((body as any).modo === "batch") {
      const b = body as Extract<EnviarPayload, { modo: "batch" }>;
      const resultados = [];
      for (const it of b.items) {
        resultados.push(await enviarUno(it));
      }
      return NextResponse.json({ success: true, resultados }, { status: 200 });
    }

    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  } catch (e: any) {
    console.error("[notificaciones/enviar] error:", e);
    return NextResponse.json({ error: "Error interno", detalle: e?.message }, { status: 500 });
  }
}
