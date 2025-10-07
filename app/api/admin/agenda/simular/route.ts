import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, turnos as Turno } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/admin/agenda/simular
 *
 * Acepta dos modos:
 *  - { mode: "insertar", ...payloadDeInsertar }
 *  - { mode: "rollover", ...payloadDeRollover }
 *
 * Donde:
 *  payloadDeInsertar:
 *    {
 *      turnoId?: number,
 *      nuevoTurno?: {
 *        conductorId: number, fecha: "YYYY-MM-DD", hora: "HH:mm",
 *        tipo_turno: string, operacion?: string|null, tipo_vehiculo?: string|null,
 *        estadoInicial?: string|null, placa?: string|null
 *      },
 *      fecha: "YYYY-MM-DD", hora: "HH:mm", tipo_turno: string,
 *      overflow?: "toNextDay"|"forzarHoy"
 *    }
 *
 *  payloadDeRollover:
 *    {
 *      fechaOrigen: "YYYY-MM-DD", fechaDestino: "YYYY-MM-DD",
 *      tipo_turno: string, estadosOrigen?: string[], overflow?: "toNextDay"|"forzarHoy",
 *      maxHoras?: number|null
 *    }
 */

type Overflow = "toNextDay" | "forzarHoy";

type NuevoTurnoInput = {
  conductorId: number;
  fecha: string;
  hora: string;
  tipo_turno: string;
  operacion?: string | null;
  tipo_vehiculo?: string | null;
  estadoInicial?: string | null;
  placa?: string | null;
};

type SimularInsertarPayload = {
  mode: "insertar";
  turnoId?: number;
  nuevoTurno?: NuevoTurnoInput;
  fecha: string;
  hora: string;
  tipo_turno: string;
  operacion?: string | null;
  overflow?: Overflow;
};

type SimularRolloverPayload = {
  mode: "rollover";
  fechaOrigen: string;
  fechaDestino: string;
  tipo_turno: string;
  estadosOrigen?: string[];
  overflow?: Overflow;
  maxHoras?: number | null;
};

type SimularPayload = SimularInsertarPayload | SimularRolloverPayload;

type Diff = {
  turnoId?: number;
  action: "create" | "move";
  oldFecha?: string;
  oldHora?: string;
  newFecha: string;
  newHora: string;
  motivo: string;
};

type WorkTurno = Turno & { __nuevo?: boolean };

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

// ===== Helpers de fecha =====
function ymd(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function parseDate(dateStr: string) {
  const [Y, M, D] = dateStr.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
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
function extractDateStr(d: Date) {
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
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
function isBeforeOrEqual(a: Date, b: Date) {
  return a.getTime() <= b.getTime();
}

// ===== Simulación: insertar priorizado =====
async function simulateInsertar(p: SimularInsertarPayload) {
  const { inicio, fin, overflowDefault } = await getJornadaConfig();
  const overflow: Overflow = p.overflow ?? overflowDefault ?? "toNextDay";
  const slotStepMin = await getSlotStepMin(p.tipo_turno);

  const fechaBase = parseDate(p.fecha);
  const objetivoDateTime = dateWithTime(fechaBase, p.hora);
  const inicioDia = dateWithTime(fechaBase, inicio);
  const finDia = dateWithTime(fechaBase, fin);

  // Cargar turnos del día
  const turnosDia = await prisma.turnos.findMany({
    where: { fecha: ymd(fechaBase) },
    orderBy: [{ hora: "asc" }, { id: "asc" }],
  });

  // Lista de trabajo
  let workList: WorkTurno[] = [...turnosDia];

  // ¿Movemos uno existente?
  let movingTurno: WorkTurno | null = null;
  if (p.turnoId) {
    const t = await prisma.turnos.findUnique({ where: { id: Number(p.turnoId) } });
    if (!t) throw new Error("turnoId no existe");
    movingTurno = { ...t };
    workList = workList.filter((x) => x.id !== t.id);
  }

  // ¿Creamos virtual?
  let virtualNew: WorkTurno | null = null;
  if (!movingTurno && p.nuevoTurno) {
    if (!p.nuevoTurno.conductorId) throw new Error("nuevoTurno.conductorId es requerido");
    virtualNew = {
      id: -1,
      conductor_id: p.nuevoTurno.conductorId,
      fecha: ymd(fechaBase),
      hora: objetivoDateTime,
      tipo_turno: p.tipo_turno,
      estado: p.nuevoTurno.estadoInicial ?? "pendiente",
      creado: new Date(),
      operacion: p.nuevoTurno.operacion ?? null,
      tipo_vehiculo_turno: p.nuevoTurno.tipo_vehiculo ?? null,
      placa: p.nuevoTurno.placa ?? null,
      prioridad: null,
      orden_dia: null,
      motivo_admin: null,
      version: 1,
      __nuevo: true,
    };
  }

  const insertIdx = (() => {
    let idx = 0;
    while (idx < workList.length && isBeforeOrEqual(workList[idx].hora, objetivoDateTime)) idx++;
    return idx;
  })();

  const toInsert: WorkTurno = movingTurno
    ? { ...movingTurno, fecha: ymd(fechaBase), hora: objetivoDateTime }
    : (virtualNew as WorkTurno);

  const arranged: WorkTurno[] = [
    ...workList.slice(0, insertIdx),
    toInsert,
    ...workList.slice(insertIdx),
  ];

  const diffs: Diff[] = [];
  let cursorDate = objetivoDateTime;
  let currentDayEnd = finDia;
  let currentYMD = ymd(fechaBase);

  for (let i = 0; i < arranged.length; i++) {
    const t = arranged[i];

    if (i === insertIdx) {
      const oldFecha = t.__nuevo ? undefined : extractDateStr(t.fecha);
      const oldHora = t.__nuevo ? undefined : extractHHmm(t.hora);
      if (oldFecha !== extractDateStr(currentYMD) || oldHora !== extractHHmm(cursorDate)) {
        diffs.push({
          turnoId: t.__nuevo ? undefined : t.id,
          action: t.__nuevo ? "create" : "move",
          oldFecha,
          oldHora,
          newFecha: extractDateStr(currentYMD),
          newHora: extractHHmm(cursorDate),
          motivo: t.__nuevo ? "crear priorizado" : "mover priorizado",
        });
      }
    } else {
      cursorDate = addMinutes(cursorDate, slotStepMin);

      if (isAfter(cursorDate, currentDayEnd)) {
        if (overflow === "forzarHoy") {
          // rebasar permitido
        } else {
          currentYMD = nextDay(currentYMD);
          cursorDate = dateWithTime(currentYMD, extractHHmm(inicioDia));
          currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDia));
        }
      }

      const oldFecha = extractDateStr(arranged[i].fecha);
      const oldHora = extractHHmm(arranged[i].hora);
      if (oldFecha !== extractDateStr(currentYMD) || oldHora !== extractHHmm(cursorDate)) {
        diffs.push({
          turnoId: arranged[i].id,
          action: "move",
          oldFecha,
          oldHora,
          newFecha: extractDateStr(currentYMD),
          newHora: extractHHmm(cursorDate),
          motivo: "corrimiento por prioridad",
        });
      }
    }
  }

  return { slotStepMin, overflow, cambios: diffs };
}

// ===== Simulación: rollover represados =====
async function simulateRollover(p: SimularRolloverPayload) {
  const { inicio, fin, overflowDefault } = await getJornadaConfig();
  const overflow: Overflow = p.overflow ?? overflowDefault ?? "toNextDay";
  const slotStepMin = await getSlotStepMin(p.tipo_turno);

  const fechaOri = parseDate(p.fechaOrigen);
  const fechaDes = parseDate(p.fechaDestino);
  const inicioDiaDes = dateWithTime(fechaDes, inicio);
  const finDiaDes = dateWithTime(fechaDes, fin);

  const estadosOrigen = Array.isArray(p.estadosOrigen) && p.estadosOrigen.length > 0 ? p.estadosOrigen : ["pendiente"];

  // 👈 FILTRA por tipo_turno en origen
  const represados = await prisma.turnos.findMany({
    where: { fecha: ymd(fechaOri), tipo_turno: p.tipo_turno, estado: { in: estadosOrigen } },
    orderBy: [{ hora: "asc" }, { id: "asc" }],
  });

  // 👈 FILTRA por tipo_turno en destino
  const destinoTurnos = await prisma.turnos.findMany({
    where: { fecha: ymd(fechaDes), tipo_turno: p.tipo_turno },
    orderBy: [{ hora: "asc" }, { id: "asc" }],
  });

  if (represados.length === 0) {
    return { slotStepMin, overflow, cambios: [] as Diff[] };
  }

  const diffs: Diff[] = [];
  let cursorDate = inicioDiaDes;
  let currentYMD = ymd(fechaDes);
  let currentDayEnd = finDiaDes;

  const maxHoras = p.maxHoras && p.maxHoras > 0 ? p.maxHoras : null;
  const limitePrimerDia = maxHoras ? addMinutes(inicioDiaDes, maxHoras * 60) : null;

  // insertar represados al inicio
  for (const t of represados) {
    if (isAfter(cursorDate, currentDayEnd)) {
      if (overflow === "forzarHoy") {
        // rebasar
      } else {
        currentYMD = nextDay(currentYMD);
        cursorDate = dateWithTime(currentYMD, extractHHmm(inicioDiaDes));
        currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDiaDes));
      }
    }

    if (limitePrimerDia && extractDateStr(currentYMD) === extractDateStr(fechaDes) && isAfter(cursorDate, limitePrimerDia)) {
      if (overflow === "forzarHoy") {
        // ignorar límite
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
      });
    }

    cursorDate = addMinutes(cursorDate, slotStepMin);
  }

  // correr los existentes del destino
  for (const t of destinoTurnos) {
    if (isAfter(cursorDate, currentDayEnd)) {
      if (overflow === "forzarHoy") {
        // rebasar
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
      });
    }

    cursorDate = addMinutes(cursorDate, slotStepMin);
  }

  return { slotStepMin, overflow, cambios: diffs };
}

// ===== Handler principal =====
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SimularPayload;

    if (!payload?.mode) {
      return NextResponse.json({ error: "Debe enviar 'mode': 'insertar' | 'rollover'" }, { status: 400 });
    }

    if (payload.mode === "insertar") {
      const result = await simulateInsertar(payload as SimularInsertarPayload);
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    if (payload.mode === "rollover") {
      const result = await simulateRollover(payload as SimularRolloverPayload);
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    return NextResponse.json({ error: "Mode inválido" }, { status: 400 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[agenda/simular] error:", e);
    return NextResponse.json({ error: "Error interno", detalle: err?.message }, { status: 500 });
  }
}
