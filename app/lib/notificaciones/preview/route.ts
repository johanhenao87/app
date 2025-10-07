import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { renderTemplate, NotificacionTipo, Canal } from "@/app/lib/notificaciones/templates";

const prisma = new PrismaClient();

type PreviewPayload =
  | {
      modo: "single";
      turnoId: number;
      tipo: NotificacionTipo;
      canal: Canal;
      motivo_admin?: string | null;
      fecha?: string; // si no viene, tomamos del turno destino (o actual)
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

// Utilidad para componer contexto de plantilla
function toHHmm(d: Date) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function toYYYYMMDD(d: Date) {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PreviewPayload;

    async function previewOne(item: {
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
      if (!t) return { turnoId: item.turnoId, error: "Turno no encontrado" };

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
      const destino =
        item.canal === "email"
          ? ctx.conductor?.correo
          : ctx.conductor?.telefono;

      return {
        turnoId: t.id,
        canal: item.canal,
        tipo: item.tipo,
        to: destino ?? "",
        text,
      };
    }

    if ((body as any).modo === "single") {
      const item = body as Extract<PreviewPayload, { modo: "single" }>;
      const preview = await previewOne(item);
      return NextResponse.json({ success: true, preview }, { status: 200 });
    }

    if ((body as any).modo === "batch") {
      const b = body as Extract<PreviewPayload, { modo: "batch" }>;
      const previews = [];
      for (const it of b.items) {
        previews.push(await previewOne(it));
      }
      return NextResponse.json({ success: true, previews }, { status: 200 });
    }

    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  } catch (e: any) {
    console.error("[notificaciones/preview] error:", e);
    return NextResponse.json({ error: "Error interno", detalle: e?.message }, { status: 500 });
  }
}
