import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, turnos as Turno } from "@prisma/client";

const prisma = new PrismaClient();

// ===== Tipos auxiliares =====
type WorkTurno = Turno;

type Overflow = "toNextDay" | "forzarHoy";

type RolloverPayload = {
  fechaOrigen: string;     // YYYY-MM-DD
  fechaDestino: string;    // YYYY-MM-DD
  tipo_turno: string;      // para determinar slot_step
  estadosOrigen?: string[]; // default ['pendiente']
  overflow?: Overflow;     // default tomado de parámetros
  override?: boolean;      // si true, exige motivo_admin
  motivo_admin?: string;   // requerido si override
  maxHoras?: number | null; // (opcional) limitar avance dentro del día destino (en horas). null = sin límite
  dryRun?: boolean;        // si true, NO persiste cambios
};

// Para respuestas de simulación/cambios
type Diff = {
  turnoId: number;
  oldFecha: string;
  oldHora: string;
  newFecha: string;
  newHora: string;
  motivo: string; // "rollover:prioridad" | "corrimiento por rollover"
};

// ===== Helpers de parámetros =====
async function getParam(clave: string, def: string) {
  const p = await prisma.parametros_agendamiento.findFirst({ where: { clave } });
  return p?.valor ?? def;
}

async function getSlotStepMin(tipo_turno: string) {
  const k = (tipo_turno || "").toLowerCase();
  if (k === "caja_rapida" || k === "sencillos") {
    return parseInt(await getParam("slot_step_caja_rapida_min", "120"), 10);
  }
  return parseInt(await getParam("slot_step_normal_min", "60"), 10);
}

async function getJornadaConfig() {
  const inicio = await getParam("jornada_inicio", "06:00"); // HH:mm
  const fin = await getParam("jornada_fin", "18:00");       // HH:mm
  const overflowDefault = await getParam("overflow_default", "toNextDay"); // toNextDay | forzarHoy
  return { inicio, fin, overflowDefault: overflowDefault as Overflow };
}

// ===== Helpers de fechas =====
function ymd(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseDate(dateStr: string) {
  const [Y, M, D] = dateStr.split("-").map((n) => parseInt(n, 10));
  const d = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
  return d;
}

function dateWithTime(d: Date, timeHHmm: string) {
  const [hh, mm] = timeHHmm.split(":").map((n) => parseInt(n, 10));
  const nd = new Date(d);
  nd.setUTCHours(hh, mm, 0, 0);
  return nd;
}

function extractHHmm(t: Date) {
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

function addMinutes(dt: Date, m: number) {
  return new Date(dt.getTime() + m * 60000);
}

function isAfter(a: Date, b: Date) {
  return a.getTime() > b.getTime();
}

function nextDay(d: Date) {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + 1);
  return nd;
}

function extractDateStr(d: Date) {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

// ===== Endpoint core =====
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RolloverPayload;

    // Validaciones
    if (!body.fechaOrigen || !body.fechaDestino || !body.tipo_turno) {
      return NextResponse.json(
        { error: "Debe enviar fechaOrigen, fechaDestino y tipo_turno" },
        { status: 400 }
      );
    }
    if (body.override && !body.motivo_admin) {
      return NextResponse.json(
        { error: "Para override debe enviar motivo_admin" },
        { status: 400 }
      );
    }

    const estadosOrigen = Array.isArray(body.estadosOrigen) && body.estadosOrigen.length > 0
      ? body.estadosOrigen
      : ["pendiente"]; // por defecto

    const { inicio, fin, overflowDefault } = await getJornadaConfig();
    const overflowMode: Overflow = body.overflow ?? overflowDefault ?? "toNextDay";
    const slotStepMin = await getSlotStepMin(body.tipo_turno);

    const fechaOri = parseDate(body.fechaOrigen);
    const fechaDes = parseDate(body.fechaDestino);

    const inicioDiaDes = dateWithTime(fechaDes, inicio);
    const finDiaDes = dateWithTime(fechaDes, fin);

    // 1) Tomar pendientes/no atendidos de fechaOrigen
    const represados: WorkTurno[] = await prisma.turnos.findMany({
      where: {
        fecha: ymd(fechaOri),
        estado: { in: estadosOrigen },
        // Si deseas filtrar además por tipo_turno/operacion, añade aquí
        // tipo_turno: body.tipo_turno,
      },
      orderBy: [{ hora: "asc" }, { id: "asc" }],
    });

    if (represados.length === 0) {
      return NextResponse.json(
        { success: true, message: "No hay turnos para rollover en la fecha origen", cambios: [] },
        { status: 200 }
      );
    }

    // 2) Tomar los turnos del destino (los que ya existen ese día)
    const destinoTurnos: WorkTurno[] = await prisma.turnos.findMany({
      where: {
        fecha: ymd(fechaDes),
        // tipo_turno: body.tipo_turno,
      },
      orderBy: [{ hora: "asc" }, { id: "asc" }],
    });

    // 3) Construir corrimiento: los represados van primero desde el inicio de jornada
    const diffs: Diff[] = [];
    let cursorDate = inicioDiaDes;
    let currentYMD = ymd(fechaDes);
    let currentDayEnd = finDiaDes;

    // (opcional) límite máximo de horas que vamos a ocupar en el primer día destino
    const maxHoras = body.maxHoras && body.maxHoras > 0 ? body.maxHoras : null;
    const limitePrimerDia = maxHoras ? addMinutes(inicioDiaDes, maxHoras * 60) : null;

    // 3.1) Mover represados al inicio (por orden original)
    for (const t of represados) {
      // Overflow de jornada destino
      if (isAfter(cursorDate, currentDayEnd)) {
        if (overflowMode === "forzarHoy") {
          // se permite rebasar (no cambiamos currentYMD)
        } else {
          // pasamos al siguiente día laboral al inicio de jornada
          currentYMD = nextDay(currentYMD);
          cursorDate = dateWithTime(currentYMD, extractHHmm(inicioDiaDes));
          currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDiaDes));
        }
      }

      // Si hay límite de horas en el primer día y lo superamos, saltamos al día siguiente
      if (limitePrimerDia && extractDateStr(currentYMD) === extractDateStr(fechaDes) && isAfter(cursorDate, limitePrimerDia)) {
        if (overflowMode === "forzarHoy") {
          // ignoramos límite si forzamos hoy
        } else {
          currentYMD = nextDay(currentYMD);
          cursorDate = dateWithTime(currentYMD, extractHHmm(inicioDiaDes));
          currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDiaDes));
        }
      }

      const oldFecha = extractDateStr(t.fecha);
      const oldHora = extractHHmm(t.hora);
      const newFecha = extractDateStr(currentYMD);
      const newHora = extractHHmm(cursorDate);

      if (oldFecha !== newFecha || oldHora !== newHora) {
        diffs.push({
          turnoId: t.id,
          action: "move",
          oldFecha,
          oldHora,
          newFecha,
          newHora,
          motivo: "rollover:prioridad",
        } as Diff);
      }

      // Avanzamos cursor por slot
      cursorDate = addMinutes(cursorDate, slotStepMin);
    }

    // 3.2) Ahora corremos los turnos ya existentes en destino detrás de los represados
    for (const t of destinoTurnos) {
      // Overflow de jornada
      if (isAfter(cursorDate, currentDayEnd)) {
        if (overflowMode === "forzarHoy") {
          // se permite rebasar
        } else {
          currentYMD = nextDay(currentYMD);
          cursorDate = dateWithTime(currentYMD, extractHHmm(inicioDiaDes));
          currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDiaDes));
        }
      }

      const oldFecha = extractDateStr(t.fecha);
      const oldHora = extractHHmm(t.hora);
      const newFecha = extractDateStr(currentYMD);
      const newHora = extractHHmm(cursorDate);

      if (oldFecha !== newFecha || oldHora !== newHora) {
        diffs.push({
          turnoId: t.id,
          action: "move",
          oldFecha,
          oldHora,
          newFecha,
          newHora,
          motivo: "corrimiento por rollover",
        } as Diff);
      }

      // Avanzamos cursor
      cursorDate = addMinutes(cursorDate, slotStepMin);
    }

    // 4) Si solo es simulación
    if (body.dryRun) {
      return NextResponse.json(
        {
          success: true,
          preview: {
            slotStepMin,
            overflow: overflowMode,
            cambios: diffs,
          },
        },
        { status: 200 }
      );
    }

    // 5) Persistencia con transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const appliedDays = new Set<string>();

      for (const d of diffs) {
        const before = await tx.turnos.findUnique({ where: { id: d.turnoId } });
        if (!before) continue;

        const updated = await tx.turnos.update({
          where: { id: d.turnoId },
          data: {
            fecha: parseDate(d.newFecha),
            hora: dateWithTime(parseDate(d.newFecha), d.newHora),
            motivo_admin: body.motivo_admin ?? before.motivo_admin,
          },
        });

        appliedDays.add(d.newFecha);
        appliedDays.add(extractDateStr(before.fecha));

        await tx.auditoriaTurnos.create({
          data: {
            turno_id: d.turnoId,
            accion: "rollover:move",
            usuario: "admin",
            motivo_admin: body.motivo_admin ?? undefined,
            antes: before,
            despues: updated,
          },
        });
      }

      // Re-secuenciar orden_dia por cada día afectado
      for (const dia of Array.from(appliedDays)) {
        const d = parseDate(dia);
        const dayTurnos = await tx.turnos.findMany({
          where: { fecha: ymd(d) },
          orderBy: [{ hora: "asc" }, { id: "asc" }],
        });
        for (let i = 0; i < dayTurnos.length; i++) {
          const t = dayTurnos[i];
          if ((t.orden_dia || 0) !== i + 1) {
            await tx.turnos.update({
              where: { id: t.id },
              data: { orden_dia: i + 1 },
            });
          }
        }
      }

      return { moved: diffs.length, diasAfectados: Array.from(appliedDays) };
    });

    return NextResponse.json(
      {
        success: true,
        slotStepMin,
        overflow: overflowMode,
        resumen: resultado,
        cambios: diffs,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[rollover-represados] error:", e);
    return NextResponse.json({ error: "Error interno", detalle: err?.message }, { status: 500 });
  }
}
