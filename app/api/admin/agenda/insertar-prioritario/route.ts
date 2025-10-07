// app/api/admin/agenda/insertar-prioritario/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, turnos as Turno } from "@prisma/client";

const prisma = new PrismaClient();

// ===== Tipos auxiliares =====
type WorkTurno = Turno & { __nuevo?: boolean };

type Overflow = "toNextDay" | "forzarHoy";

type NuevoTurnoInput = {
  conductorId: number;
  fecha: string;      // YYYY-MM-DD
  hora: string;       // HH:mm
  tipo_turno: string;
  operacion?: string | null;
  tipo_vehiculo?: string | null;
  estadoInicial?: string | null;
  placa?: string | null;
  // ✅ opcional para alinear con la UI (solo cuando override)
  motivo_admin?: string | null;
};

type InsertarPayload = {
  turnoId?: number;             // mover y priorizar un turno existente
  nuevoTurno?: NuevoTurnoInput; // o crear uno nuevo
  fecha: string;                // YYYY-MM-DD objetivo
  hora: string;                 // HH:mm objetivo
  tipo_turno: string;           // define slot_step
  operacion?: string | null;
  overflow?: Overflow;          // default: toNextDay
  override?: boolean;
  motivo_admin?: string;        // requerido si override
  dryRun?: boolean;
};

type Diff = {
  turnoId?: number;
  action: "create" | "move";
  oldFecha?: string;
  oldHora?: string;
  newFecha: string;
  newHora: string;
  motivo: string;
};

// ===== Helpers parámetros =====
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

// ===== Core =====
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InsertarPayload;

    // Validaciones
    if (!body.fecha || !body.hora || !body.tipo_turno) {
      return NextResponse.json({ error: "Debe enviar fecha, hora y tipo_turno" }, { status: 400 });
    }
    if (body.override && !body.motivo_admin) {
      return NextResponse.json({ error: "Para override debe enviar motivo_admin" }, { status: 400 });
    }
    if (!body.turnoId && !body.nuevoTurno) {
      return NextResponse.json({ error: "Debe enviar turnoId o nuevoTurno" }, { status: 400 });
    }

    const { inicio, fin, overflowDefault } = await getJornadaConfig();
    const overflowMode: Overflow = body.overflow ?? overflowDefault ?? "toNextDay";
    const slotStepMin = await getSlotStepMin(body.tipo_turno);

    const fechaBase = parseDate(body.fecha);
    const objetivoDateTime = dateWithTime(fechaBase, body.hora);
    const inicioDia = dateWithTime(fechaBase, inicio);
    const finDia = dateWithTime(fechaBase, fin);

    // Cargar turnos del día (ord. por hora)
    const turnosDia = await prisma.turnos.findMany({
      where: {
        fecha: ymd(fechaBase),
        // operacion: body.operacion ?? undefined,
        // tipo_turno: body.tipo_turno, // úsalo si segmentas por tipo
      },
      orderBy: [{ hora: "asc" }, { id: "asc" }],
    });

    // Trabajamos con WorkTurno
    let workList: WorkTurno[] = [...turnosDia];

    // ¿Se mueve un turno existente?
    let movingTurno: WorkTurno | null = null;
    if (body.turnoId) {
      const t = await prisma.turnos.findUnique({ where: { id: Number(body.turnoId) } });
      if (!t) return NextResponse.json({ error: "turnoId no existe" }, { status: 404 });
      movingTurno = { ...t };
      // Si pertenece al mismo día, quitarlo para reinsertar
      workList = workList.filter((x) => x.id !== t.id);
    }

    // ¿Se crea uno nuevo virtual?
    let virtualNew: WorkTurno | null = null;
    if (!movingTurno && body.nuevoTurno) {
      if (!body.nuevoTurno.conductorId) {
        return NextResponse.json({ error: "nuevoTurno.conductorId es requerido" }, { status: 400 });
      }
      virtualNew = {
        id: -1, // marcador temporal
        conductor_id: body.nuevoTurno.conductorId,
        fecha: ymd(fechaBase),
        hora: objetivoDateTime,
        tipo_turno: body.tipo_turno,
        estado: body.nuevoTurno.estadoInicial ?? "pendiente",
        creado: new Date(),
        operacion: body.nuevoTurno.operacion ?? null,
        tipo_vehiculo_turno: body.nuevoTurno.tipo_vehiculo ?? null,
        placa: body.nuevoTurno.placa ?? null,
        prioridad: null,
        orden_dia: null,
        // Si hay override usamos el motivo_admin del body; si no, el que llegue en el nuevoTurno; si ninguno, null
        motivo_admin: body.motivo_admin ?? body.nuevoTurno.motivo_admin ?? null,
        version: 1,
        __nuevo: true,
      };
    }

    // Índice de inserción según hora objetivo (inserta antes si es igual)
    const insertIdx = (() => {
      let idx = 0;
      while (idx < workList.length && isBeforeOrEqual(workList[idx].hora, objetivoDateTime)) {
        idx++;
      }
      return idx;
    })();

    function isBeforeOrEqual(a: Date, b: Date) {
      return a.getTime() <= b.getTime();
    }

    const toInsert: WorkTurno = movingTurno
      ? { ...movingTurno, fecha: ymd(fechaBase), hora: objetivoDateTime, motivo_admin: body.motivo_admin ?? movingTurno.motivo_admin }
      : (virtualNew as WorkTurno);

    const head = workList.slice(0, insertIdx);
    const tail = workList.slice(insertIdx);
    const arranged: WorkTurno[] = [...head, toInsert, ...tail];

    // Corrimiento bySlot
    const diffs: Diff[] = [];
    let cursorDate = objetivoDateTime;
    let currentDayStart = inicioDia;
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
        // Avanza un slot
        cursorDate = addMinutes(cursorDate, slotStepMin);

        // Overflow de día
        if (isAfter(cursorDate, currentDayEnd)) {
          if (overflowMode === "forzarHoy") {
            // se permite rebasar
          } else {
            currentYMD = nextDay(currentYMD);
            currentDayStart = dateWithTime(currentYMD, extractHHmm(inicioDia));
            currentDayEnd = dateWithTime(currentYMD, extractHHmm(finDia));
            cursorDate = currentDayStart;
          }
        }

        const oldFecha = extractDateStr(t.fecha);
        const oldHora = extractHHmm(t.hora);
        if (oldFecha !== extractDateStr(currentYMD) || oldHora !== extractHHmm(cursorDate)) {
          diffs.push({
            turnoId: t.id,
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

    // Solo simulación
    if (body.dryRun) {
      return NextResponse.json(
        { success: true, preview: { slotStepMin, overflow: overflowMode, cambios: diffs } },
        { status: 200 }
      );
    }

    // ===== Persistencia =====
    const resultado = await prisma.$transaction(async (tx) => {
      const applied: { id: number; old?: Turno; nuevo?: Turno }[] = [];

      // Crear si era nuevo
      if (virtualNew) {
        const dCreate = diffs.find((d) => d.action === "create");
        if (!dCreate) throw new Error("No se encontró diff de creación");

        const created = await tx.turnos.create({
          data: {
            conductor_id: virtualNew.conductor_id!,
            fecha: parseDate(dCreate.newFecha),
            hora: dateWithTime(parseDate(dCreate.newFecha), dCreate.newHora),
            tipo_turno: virtualNew.tipo_turno,
            estado: virtualNew.estado,
            operacion: virtualNew.operacion,
            tipo_vehiculo_turno: virtualNew.tipo_vehiculo_turno,
            placa: virtualNew.placa ?? null,
            motivo_admin: body.motivo_admin ?? virtualNew.motivo_admin ?? null,
            prioridad: null,
            orden_dia: null,
          },
        });

        applied.push({ id: created.id, nuevo: created });

        await tx.auditoriaTurnos.create({
          data: {
            turno_id: created.id,
            accion: "insertar-prioritario:create",
            usuario: "admin", // TODO: pasar usuario real desde UI si aplica
            motivo_admin: (body.motivo_admin ?? virtualNew.motivo_admin) || undefined,
            // JSON: puedes enviar undefined para omitir campo
            antes: undefined,
            despues: created,
          },
        });
      }

      // Movimientos
      for (const d of diffs.filter((x) => x.action === "move")) {
        const targetId = d.turnoId!;
        const before = await tx.turnos.findUnique({ where: { id: targetId } });
        if (!before) continue;

        const updated = await tx.turnos.update({
          where: { id: targetId },
          data: {
            fecha: parseDate(d.newFecha),
            hora: dateWithTime(parseDate(d.newFecha), d.newHora),
            motivo_admin: body.motivo_admin ?? before.motivo_admin,
          },
        });

        applied.push({ id: targetId, old: before, nuevo: updated });

        await tx.auditoriaTurnos.create({
          data: {
            turno_id: targetId,
            accion: "insertar-prioritario:move",
            usuario: "admin",
            motivo_admin: body.motivo_admin || undefined,
            antes: before,
            despues: updated,
          },
        });
      }

      // Re-secuenciar orden_dia por día afectado
      const diasAfectados = Array.from(
        new Set(applied.map((a) => extractDateStr((a.nuevo ?? a.old!)!.fecha)))
      );

      for (const dia of diasAfectados) {
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

      return { appliedCount: applied.length };
    });

    return NextResponse.json(
      { success: true, slotStepMin, overflow: overflowMode, resumen: resultado, cambios: diffs },
      { status: 200 }
    );
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[insertar-prioritario] error:", e);
    // mapea unique key de conductor/fecha/hora si aplica
    const msg = err?.message?.includes("turnos_conductor_id_fecha_hora_key")
      ? "Conflicto de horario para ese conductor en la fecha/hora asignada."
      : err?.message || "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
