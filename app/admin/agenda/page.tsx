"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ConductorSelect from "./parts/ConductorSelect";
import AgendaDayGrid from "./parts/AgendaDayGrid";
import AdminSidebar from "../parts/AdminSidebar";

// ---------------- Tipos compartidos ----------------
type Overflow = "toNextDay" | "forzarHoy";

type Diff = {
  turnoId?: number;
  action: "create" | "move";
  oldFecha?: string;
  oldHora?: string;
  newFecha: string;
  newHora: string;
  motivo: string;
};

type SimularInsertarPayload = {
  mode: "insertar";
  turnoId?: number;
  nuevoTurno?: {
    conductorId: number;
    fecha: string; // YYYY-MM-DD
    hora: string; // HH:mm
    tipo_turno: string;
    operacion?: string | null;
    tipo_vehiculo?: string | null;
    estadoInicial?: string | null;
    placa?: string | null;
    motivo_admin?: string | null;
  };
  fecha: string;
  hora: string;
  tipo_turno: string;
  operacion?: string | null;
  overflow?: Overflow;
};

type InsertarPayload = Omit<SimularInsertarPayload, "mode"> & {
  override?: boolean;
  motivo_admin?: string;
  dryRun?: boolean;
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

type RolloverPayload = Omit<SimularRolloverPayload, "mode"> & {
  override?: boolean;
  motivo_admin?: string;
  dryRun?: boolean;
};

type NotificacionTipo = "reprogramado" | "cancelado" | "prioridad" | "rollover";
type Canal = "sms" | "whatsapp" | "email";

// Para onSelected de ConductorSelect
type ConductorMini = {
  id: number;
  cedula: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  tipo_vehiculo?: string | null;
  fecha_registro?: string | null;
};

// Para KPIs (lo que devuelve /agenda/dia)
type TurnoRow = {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  tipo_turno?: string | null;
  estado?: string | null;
  placa?: string | null;
  operacion?: string | null;
  tipo_vehiculo_turno?: string | null;
  conductor?: { nombre?: string | null; cedula?: string | null } | null;
};

function todayStr() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

export default function AdminAgendaPage() {
  // =========================================================
  // Sidebar / Filtros / KPIs
  // =========================================================
  const [openMobile, setOpenMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [sb_fecha, setSbFecha] = useState<string>(todayStr());
  const [sb_estado, setSbEstado] = useState<string>("todos");
  const [sb_tipoVeh, setSbTipoVeh] = useState<string>("todos");

  const [kpiData, setKpiData] = useState<TurnoRow[]>([]);
  const kpis = useMemo(() => {
    const rows = kpiData.filter((r) => {
      const okEstado = sb_estado === "todos" ? true : (r.estado || "").toLowerCase() === sb_estado;
      const okTipo = sb_tipoVeh === "todos" ? true : (r.tipo_vehiculo_turno || "") === sb_tipoVeh;
      return okEstado && okTipo;
    });
    const total = rows.length;
    const contado = (st: string) => rows.filter((r) => (r.estado || "").toLowerCase() === st).length;
    const confirmado = contado("confirmado");
    const pendiente = contado("pendiente");
    const cancelado = contado("cancelado");
    const finalizado = contado("finalizado");

    const porTipo: Record<string, { total: number; confirmado: number; pendiente: number }> = {};
    for (const r of rows) {
      const key = r.tipo_vehiculo_turno || "N/D";
      if (!porTipo[key]) porTipo[key] = { total: 0, confirmado: 0, pendiente: 0 };
      porTipo[key].total++;
      if ((r.estado || "").toLowerCase() === "confirmado") porTipo[key].confirmado++;
      if ((r.estado || "").toLowerCase() === "pendiente") porTipo[key].pendiente++;
    }

    return { total, confirmado, pendiente, cancelado, finalizado, porTipo };
  }, [kpiData, sb_estado, sb_tipoVeh]);

  async function refreshKpis() {
    try {
      const res = await fetch(`/api/admin/agenda/dia?fecha=${encodeURIComponent(sb_fecha)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error consultando agenda del día");
      setKpiData(Array.isArray(data?.turnos) ? data.turnos : []);
    } catch (e) {
      console.error(e);
      setKpiData([]);
    }
  }

  useEffect(() => {
    refreshKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb_fecha]);

  const onParametros = () => {
    window.location.href = "/admin/parametros";
  };

  // =========================================================
  // Insertar prioritario
  // =========================================================
  const [ins_turnoId, setInsTurnoId] = useState<number | "">("");
  const [ins_conductorId, setInsConductorId] = useState<number | "">("");
  const [ins_fecha, setInsFecha] = useState<string>(todayStr());
  const [ins_hora, setInsHora] = useState<string>("10:00");
  const [ins_tipo_turno, setInsTipoTurno] = useState<string>("normal");
  const [ins_operacion, setInsOperacion] = useState<string>("cargue");
  const [ins_tipo_vehiculo, setInsTipoVehiculo] = useState<string>("camion");
  const [ins_estadoInicial, setInsEstadoInicial] = useState<string>("pendiente");
  const [ins_placa, setInsPlaca] = useState<string>("");
  const [ins_overflow, setInsOverflow] = useState<Overflow>("toNextDay");
  const [ins_override, setInsOverride] = useState<boolean>(false);
  const [ins_motivo, setInsMotivo] = useState<string>("");

  // =========================================================
  // Rollover
  // =========================================================
  const [ro_fechaOrigen, setRoFechaOrigen] = useState<string>(todayStr());
  const [ro_fechaDestino, setRoFechaDestino] = useState<string>(todayStr());
  const [ro_tipo_turno, setRoTipoTurno] = useState<string>("normal");
  const [ro_estadosOrigen, setRoEstadosOrigen] = useState<string>("pendiente");
  const [ro_overflow, setRoOverflow] = useState<Overflow>("toNextDay");
  const [ro_maxHoras, setRoMaxHoras] = useState<number | "">("");
  const [ro_override, setRoOverride] = useState<boolean>(false);
  const [ro_motivo, setRoMotivo] = useState<string>("");

  // =========================================================
  // Resultados / Notificaciones
  // =========================================================
  const [loading, setLoading] = useState<boolean>(false);
  const [cambios, setCambios] = useState<Diff[]>([]);
  const [meta, setMeta] = useState<{ slotStepMin?: number; overflow?: string }>({});
  const [lastOp, setLastOp] = useState<"insertar" | "rollover" | null>(null);

  const hayCambios = useMemo(() => cambios && cambios.length > 0, [cambios]);
  const turnoIdsAfectados = useMemo(
    () => cambios.map((c) => c.turnoId).filter((id): id is number => typeof id === "number"),
    [cambios]
  );

  const [notifTipo, setNotifTipo] = useState<NotificacionTipo>("prioridad");
  const [notifCanal, setNotifCanal] = useState<Canal>("whatsapp");
  const [previewBatch, setPreviewBatch] = useState<
    Array<{ turnoId: number; canal: string; to?: string; text?: string; error?: string }>
  >([]);

  // =========================================================
  // Secciones y navegación rápida
  // =========================================================
  const refTop = useRef<HTMLDivElement | null>(null);
  const refInsertar = useRef<HTMLDivElement | null>(null);
  const refRollover = useRef<HTMLDivElement | null>(null);

  function scrollTo(ref: React.RefObject<HTMLDivElement>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // =========================================================
  // Helpers de simulación/aplicar (insertar/rollover) y notificaciones
  // =========================================================
  async function callSimularInsertar() {
    setLoading(true);
    setPreviewBatch([]);
    setCambios([]);
    try {
      const payload: SimularInsertarPayload = {
        mode: "insertar",
        fecha: ins_fecha,
        hora: ins_hora,
        tipo_turno: ins_tipo_turno,
        operacion: ins_operacion || undefined,
        overflow: ins_overflow,
      };

      if (ins_turnoId) {
        payload.turnoId = Number(ins_turnoId);
      } else if (ins_conductorId) {
        payload.nuevoTurno = {
          conductorId: Number(ins_conductorId),
          fecha: ins_fecha,
          hora: ins_hora,
          tipo_turno: ins_tipo_turno,
          operacion: ins_operacion || null,
          tipo_vehiculo: ins_tipo_vehiculo || null,
          estadoInicial: ins_estadoInicial || null,
          placa: ins_placa || null,
        };
      } else {
        alert("Indica turnoId (mover) o selecciona un conductor (crear).");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/agenda/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo al simular");
      setCambios(data?.cambios || []);
      setMeta({ slotStepMin: data?.slotStepMin, overflow: data?.overflow });
      setLastOp("insertar");
      setNotifTipo("prioridad");
    } catch (e: any) {
      alert(e?.message || "Error simulando inserción prioritaria");
    } finally {
      setLoading(false);
    }
  }

  async function callAplicarInsertar() {
    setLoading(true);
    setPreviewBatch([]);
    try {
      const payload: InsertarPayload = {
        fecha: ins_fecha,
        hora: ins_hora,
        tipo_turno: ins_tipo_turno,
        operacion: ins_operacion || undefined,
        overflow: ins_overflow,
        override: ins_override || undefined,
        motivo_admin: ins_override ? ins_motivo : undefined,
        dryRun: false,
      };

      if (ins_turnoId) {
        (payload as any).turnoId = Number(ins_turnoId);
      } else if (ins_conductorId) {
        (payload as any).nuevoTurno = {
          conductorId: Number(ins_conductorId),
          fecha: ins_fecha,
          hora: ins_hora,
          tipo_turno: ins_tipo_turno,
          operacion: ins_operacion || null,
          tipo_vehiculo: ins_tipo_vehiculo || null,
          estadoInicial: ins_estadoInicial || null,
          placa: ins_placa || null,
          motivo_admin: ins_override ? ins_motivo : "Prioritario sin override",
        };
      } else {
        alert("Indica turnoId (mover) o selecciona un conductor (crear).");
        setLoading(false);
        return;
      }

      if (ins_override && !ins_motivo.trim()) {
        alert("Para override debes escribir el motivo.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/agenda/insertar-prioritario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo al aplicar cambios");
      alert("Insertar prioritario aplicado correctamente ✅");
      setCambios(data?.cambios || []);
      setMeta({ slotStepMin: data?.slotStepMin, overflow: data?.overflow });
      setLastOp("insertar");
      setNotifTipo("prioridad");

      // refrescar KPIs/agenda
      refreshKpis();
      setViewFecha(ins_fecha);
    } catch (e: any) {
      alert(e?.message || "Error aplicando inserción prioritaria");
    } finally {
      setLoading(false);
    }
  }

  async function callSimularRollover() {
    setLoading(true);
    setPreviewBatch([]);
    setCambios([]);
    try {
      const payload: SimularRolloverPayload = {
        mode: "rollover",
        fechaOrigen: ro_fechaOrigen,
        fechaDestino: ro_fechaDestino,
        tipo_turno: ro_tipo_turno,
        estadosOrigen: ro_estadosOrigen
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        overflow: ro_overflow,
        maxHoras: ro_maxHoras === "" ? null : Number(ro_maxHoras),
      };

      const res = await fetch("/api/admin/agenda/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo al simular");
      setCambios(data?.cambios || []);
      setMeta({ slotStepMin: data?.slotStepMin, overflow: data?.overflow });
      setLastOp("rollover");
      setNotifTipo("rollover");
    } catch (e: any) {
      alert(e?.message || "Error simulando rollover");
    } finally {
      setLoading(false);
    }
  }

  async function callAplicarRollover() {
    setLoading(true);
    setPreviewBatch([]);
    try {
      if (ro_override && !ro_motivo.trim()) {
        alert("Para override debes escribir el motivo.");
        setLoading(false);
        return;
      }
      const payload: RolloverPayload = {
        fechaOrigen: ro_fechaOrigen,
        fechaDestino: ro_fechaDestino,
        tipo_turno: ro_tipo_turno,
        estadosOrigen: ro_estadosOrigen
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        overflow: ro_overflow,
        maxHoras: ro_maxHoras === "" ? null : Number(ro_maxHoras),
        override: ro_override || undefined,
        motivo_admin: ro_override ? ro_motivo : undefined,
        dryRun: false,
      };

      const res = await fetch("/api/admin/agenda/rollover-represados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo al aplicar rollover");
      alert("Rollover aplicado correctamente ✅");
      setCambios(data?.cambios || []);
      setMeta({ slotStepMin: data?.slotStepMin, overflow: data?.overflow });
      setLastOp("rollover");
      setNotifTipo("rollover");

      // refrescar KPIs/agenda
      refreshKpis();
      setViewFecha(ro_fechaDestino);
    } catch (e: any) {
      alert(e?.message || "Error aplicando rollover");
    } finally {
      setLoading(false);
    }
  }

  async function callPreviewNotificaciones() {
    try {
      if (turnoIdsAfectados.length === 0) {
        alert("No hay turnos afectados con ID para notificar.");
        return;
      }
      const motivo = lastOp === "insertar" ? ins_motivo : lastOp === "rollover" ? ro_motivo : "";
      const items = turnoIdsAfectados.map((id) => ({
        turnoId: id,
        tipo: notifTipo,
        canal: notifCanal,
        motivo_admin: motivo || undefined,
      }));
      const res = await fetch("/api/admin/notificaciones/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "batch", items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo en preview");
      setPreviewBatch(data?.previews || []);
    } catch (e: any) {
      alert(e?.message || "Error generando preview");
    }
  }

  async function callEnviarNotificaciones() {
    try {
      if (turnoIdsAfectados.length === 0) {
        alert("No hay turnos afectados con ID para notificar.");
        return;
      }
      const motivo = lastOp === "insertar" ? ins_motivo : lastOp === "rollover" ? ro_motivo : "";
      const items = turnoIdsAfectados.map((id) => ({
        turnoId: id,
        tipo: notifTipo,
        canal: notifCanal,
        motivo_admin: motivo || undefined,
      }));
      const res = await fetch("/api/admin/notificaciones/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "batch", items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fallo enviando notificaciones");
      alert("Notificaciones procesadas (modo demo). Revisa consola y tabla Notificacion.");
    } catch (e: any) {
      alert(e?.message || "Error enviando notificaciones");
    }
  }

  // =========================================================
  // Agenda del día (lectura)
  // =========================================================
  const [viewFecha, setViewFecha] = useState<string>(todayStr());

  // =========================================================
  // Modal “Nuevo turno”
  // =========================================================
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);
  function goNuevoNormal() {
    // llevamos fecha actual del sidebar para comodidad
    const params = new URLSearchParams({ fecha: sb_fecha });
    window.location.href = `/agendar?${params.toString()}`;
  }
  function goNuevoPrioritario() {
    setShowNuevoTurno(false);
    // enfocamos la sección Insertar y dejamos fecha/hora con defaults actuales
    setIns_fecha(sb_fecha);
    scrollTo(refInsertar);
  }

  // =========================================================
  // UI
  // =========================================================
  return (
    <div ref={refTop} className="grid lg:grid-cols-[300px_1fr] gap-4">
      {/* Sidebar izquierdo (desktop) + drawer (mobile) */}
      <div className="lg:block">
        <AdminSidebar
          openMobile={openMobile}
          onCloseMobile={() => setOpenMobile(false)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          fecha={sb_fecha}
          setFecha={(v) => setSbFecha(v)}
          estado={sb_estado}
          setEstado={(v) => setSbEstado(v)}
          filtroTipo={sb_tipoVeh}
          setFiltroTipo={(v) => setSbTipoVeh(v)}
          kpis={kpis}
          onRefrescar={() => {
            refreshKpis();
            setViewFecha(sb_fecha);
          }}
          onParametros={onParametros}
        />
      </div>

      {/* Contenido principal */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Agenda Admin</h1>
          <div className="flex gap-2">
            {/* volver al panel */}
            <button
              className="hidden sm:inline-flex rounded border px-3 py-2"
              onClick={() => (window.location.href = "/admin")}
              title="Volver al panel"
            >
              ← Volver al panel
            </button>
            {/* nuevo turno */}
            <button
              className="rounded bg-slate-900 text-white px-3 py-2"
              onClick={() => setShowNuevoTurno(true)}
              title="Crear un nuevo turno (normal o prioritario)"
            >
              ➕ Nuevo turno
            </button>
            {/* abrir sidebar en mobile */}
            <button
              className="lg:hidden rounded border px-3 py-2"
              onClick={() => setOpenMobile(true)}
              title="Abrir filtros"
            >
              Filtros
            </button>
          </div>
        </div>

        {/* ---------- Agenda del día (lectura) ---------- */}
        <section className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Agenda del día (lectura)</h2>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded border"
                onClick={() => setViewFecha(ins_fecha)}
                title="Ver agenda con la fecha del panel Insertar"
              >
                Ver agenda de Insertar
              </button>
              <button
                className="px-3 py-2 rounded border"
                onClick={() => setViewFecha(ro_fechaDestino)}
                title="Ver agenda con la fecha destino del panel Rollover"
              >
                Ver agenda de Rollover
              </button>
            </div>
          </div>

          <AgendaDayGrid
            fecha={viewFecha}
            onFechaChange={(f) => setViewFecha(f)}
            title="Agenda del día"
          />
        </section>

        {/* ---------- Panel Insertar Prioritario ---------- */}
        <section ref={refInsertar} className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Insertar prioritario</h2>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => scrollTo(refTop)}>↑ Arriba</button>
              <button className="px-3 py-2 rounded border" onClick={() => scrollTo(refRollover)}>Ir a Rollover ↓</button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="col-span-3 text-sm text-gray-600">
              Usa <b>turnoId</b> para mover uno existente <i>o</i>{" "}
              <b>Conductor</b> para crear uno nuevo.
            </div>

            <div>
              <label className="block text-sm mb-1">turnoId (mover)</label>
              <input
                type="number"
                value={ins_turnoId}
                onChange={(e) => setInsTurnoId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full border rounded px-2 py-1"
                placeholder="Ej: 123"
              />
            </div>

            {/* Selector de Conductor */}
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Conductor (buscar y seleccionar)</label>
              <ConductorSelect
                value={ins_conductorId}
                onChange={(id: number | "") => setInsConductorId(id)}
                onSelected={(c: ConductorMini) => {
                  if (c.tipo_vehiculo) setInsTipoVehiculo(c.tipo_vehiculo);
                }}
                placeholder="Nombre, cédula, teléfono o correo…"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">tipo_turno</label>
              <select
                value={ins_tipo_turno}
                onChange={(e) => setInsTipoTurno(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="normal">normal</option>
                <option value="caja_rapida">caja_rapida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">fecha</label>
              <input
                type="date"
                value={ins_fecha}
                onChange={(e) => setInsFecha(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">hora</label>
              <input
                type="time"
                value={ins_hora}
                onChange={(e) => setInsHora(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">operacion</label>
              <select
                value={ins_operacion}
                onChange={(e) => setInsOperacion(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="cargue">cargue</option>
                <option value="descargue">descargue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">tipo_vehiculo</label>
              <input
                value={ins_tipo_vehiculo}
                onChange={(e) => setInsTipoVehiculo(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="Ej: camion, tracto..."
              />
            </div>

            <div>
              <label className="block text-sm mb-1">estadoInicial</label>
              <input
                value={ins_estadoInicial}
                onChange={(e) => setInsEstadoInicial(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="pendiente"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">placa (6 chars)</label>
              <input
                value={ins_placa}
                onChange={(e) => setInsPlaca(e.target.value.toUpperCase().slice(0, 6))}
                className="w-full border rounded px-2 py-1"
                placeholder="ABC123"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">overflow</label>
              <select
                value={ins_overflow}
                onChange={(e) => setInsOverflow(e.target.value as Overflow)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="toNextDay">toNextDay</option>
                <option value="forzarHoy">forzarHoy</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="ins-override"
                type="checkbox"
                checked={ins_override}
                onChange={(e) => setInsOverride(e.target.checked)}
              />
              <label htmlFor="ins-override" className="text-sm">override</label>
            </div>

            <div className={ins_override ? "" : "opacity-60"}>
              <label className="block text-sm mb-1">motivo_admin (si override)</label>
              <input
                value={ins_motivo}
                onChange={(e) => setInsMotivo(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="Motivo de prioridad"
                disabled={!ins_override}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={callSimularInsertar}
              disabled={loading}
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? "Simulando..." : "Simular"}
            </button>
            <button
              onClick={callAplicarInsertar}
              disabled={loading}
              className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-60"
            >
              {loading ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </section>

        {/* ---------- Panel Rollover ---------- */}
        <section ref={refRollover} className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Rollover de represados</h2>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => scrollTo(refInsertar)}>↑ Ir a Insertar</button>
              <button className="px-3 py-2 rounded border" onClick={() => scrollTo(refTop)}>↑ Arriba</button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm mb-1">fechaOrigen</label>
              <input
                type="date"
                value={ro_fechaOrigen}
                onChange={(e) => setRoFechaOrigen(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">fechaDestino</label>
              <input
                type="date"
                value={ro_fechaDestino}
                onChange={(e) => setRoFechaDestino(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">tipo_turno</label>
              <select
                value={ro_tipo_turno}
                onChange={(e) => setRoTipoTurno(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="normal">normal</option>
                <option value="caja_rapida">caja_rapida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">estadosOrigen (coma)</label>
              <input
                value={ro_estadosOrigen}
                onChange={(e) => setRoEstadosOrigen(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="pendiente,reprogramado"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">overflow</label>
              <select
                value={ro_overflow}
                onChange={(e) => setRoOverflow(e.target.value as Overflow)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="toNextDay">toNextDay</option>
                <option value="forzarHoy">forzarHoy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">maxHoras (opcional)</label>
              <input
                type="number"
                value={ro_maxHoras}
                onChange={(e) => setRoMaxHoras(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full border rounded px-2 py-1"
                placeholder="Ej: 8"
                min={0}
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="ro-override"
                type="checkbox"
                checked={ro_override}
                onChange={(e) => setRoOverride(e.target.checked)}
              />
              <label htmlFor="ro-override" className="text-sm">override</label>
            </div>

            <div className={ro_override ? "" : "opacity-60"}>
              <label className="block text-sm mb-1">motivo_admin (si override)</label>
              <input
                value={ro_motivo}
                onChange={(e) => setRoMotivo(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="Motivo de rollover"
                disabled={!ro_override}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={callSimularRollover}
              disabled={loading}
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? "Simulando..." : "Simular"}
            </button>
            <button
              onClick={callAplicarRollover}
              disabled={loading}
              className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-60"
            >
              {loading ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </section>

        {/* ---------- Resultados / Tabla de cambios ---------- */}
        <section className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Cambios (preview / resultado)</h2>
            <div className="text-sm text-gray-600">
              {meta.slotStepMin ? `slotStep: ${meta.slotStepMin} min` : ""}{" "}
              {meta.overflow ? `· overflow: ${meta.overflow}` : ""}
            </div>
          </div>

          {!hayCambios && (
            <div className="text-gray-500 text-sm">
              No hay cambios para mostrar. Ejecuta una simulación.
            </div>
          )}

          {hayCambios && (
            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">Turno</th>
                    <th className="border px-2 py-1 text-left">Acción</th>
                    <th className="border px-2 py-1 text-left">Antes (Fecha)</th>
                    <th className="border px-2 py-1 text-left">Antes (Hora)</th>
                    <th className="border px-2 py-1 text-left">Después (Fecha)</th>
                    <th className="border px-2 py-1 text-left">Después (Hora)</th>
                    <th className="border px-2 py-1 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {cambios.map((c, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1">{c.turnoId ?? "nuevo"}</td>
                      <td className="border px-2 py-1">{c.action}</td>
                      <td className="border px-2 py-1">{c.oldFecha ?? "-"}</td>
                      <td className="border px-2 py-1">{c.oldHora ?? "-"}</td>
                      <td className="border px-2 py-1">{c.newFecha}</td>
                      <td className="border px-2 py-1">{c.newHora}</td>
                      <td className="border px-2 py-1">{c.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Notificar afectados ---------- */}
        <section className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Notificar afectados</h2>
            <div className="text-sm text-gray-600">
              {turnoIdsAfectados.length} turnos con ID
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm mb-1">tipo</label>
              <select
                value={notifTipo}
                onChange={(e) => setNotifTipo(e.target.value as NotificacionTipo)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="prioridad">prioridad</option>
                <option value="rollover">rollover</option>
                <option value="reprogramado">reprogramado</option>
                <option value="cancelado">cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">canal</label>
              <select
                value={notifCanal}
                onChange={(e) => setNotifCanal(e.target.value as Canal)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="whatsapp">whatsapp</option>
                <option value="sms">sms</option>
                <option value="email">email</option>
              </select>
            </div>

            <div className="col-span-3 text-sm text-gray-600">
              Usará el <b>motivo_admin</b> según la última operación:{" "}
              {lastOp === "insertar"
                ? ins_motivo || "(vacío)"
                : lastOp === "rollover"
                ? ro_motivo || "(vacío)"
                : "(sin operación registrada)"}.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={callPreviewNotificaciones}
              disabled={turnoIdsAfectados.length === 0}
              className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
            >
              Previsualizar
            </button>
            <button
              onClick={callEnviarNotificaciones}
              disabled={turnoIdsAfectados.length === 0}
              className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
            >
              Enviar (demo)
            </button>
          </div>

          {previewBatch.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">Turno</th>
                    <th className="border px-2 py-1 text-left">Canal</th>
                    <th className="border px-2 py-1 text-left">Destino</th>
                    <th className="border px-2 py-1 text-left">Texto</th>
                    <th className="border px-2 py-1 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {previewBatch.map((p, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1">{p.turnoId}</td>
                      <td className="border px-2 py-1">{p.canal}</td>
                      <td className="border px-2 py-1">{p.to || "-"}</td>
                      <td className="border px-2 py-1 whitespace-pre-wrap">{p.text || "-"}</td>
                      <td className="border px-2 py-1 text-red-600">{p.error || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: Nuevo turno */}
      {showNuevoTurno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNuevoTurno(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nuevo turno</h3>
            <p className="text-sm text-slate-600 mb-4">
              ¿Cómo deseas crearlo?
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={goNuevoNormal}
                className="rounded-xl px-4 py-3 bg-slate-900 text-white font-semibold hover:bg-slate-800"
                title="Respetar reglas normales según tipo de vehículo"
              >
                Normal
              </button>
              <button
                onClick={goNuevoPrioritario}
                className="rounded-xl px-4 py-3 bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                title="Prioritario: puede mover otros turnos según simulación"
              >
                Prioritario
              </button>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              * En “Prioritario” podrás simular y ver cuántos turnos se moverán y notificar a los conductores.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
