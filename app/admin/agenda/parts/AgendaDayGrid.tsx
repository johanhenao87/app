"use client";

import React, { useEffect, useMemo, useState } from "react";
import { utcTimeToLocalHM } from "../../../lib/tz"; // 👈 desde app/admin/agenda/parts -> app/lib/tz

type Props = {
  fecha: string;                 // YYYY-MM-DD
  onFechaChange?: (f: string) => void;
  title?: string;
};

type TurnoRow = {
  id: number;
  fecha: string;                 // YYYY-MM-DD
  hora: string;                  // "HH:mm" o ISO (ej: "1970-01-01T10:00:00.000Z")
  tipo_turno?: string | null;
  estado?: string | null;
  placa?: string | null;
  operacion?: string | null;
  tipo_vehiculo_turno?: string | null;
  conductor?: { nombre?: string | null; cedula?: string | null } | null;
};

export default function AgendaDayGrid({ fecha, onFechaChange, title = "Agenda" }: Props) {
  const [rows, setRows] = useState<TurnoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setRows([]);
      try {
        const res = await fetch(`/api/admin/agenda/dia?fecha=${encodeURIComponent(fecha)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error consultando agenda");
        if (!Array.isArray(data?.turnos)) throw new Error("Respuesta inesperada");
        if (!aborted) setRows(data.turnos as TurnoRow[]);
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Fallo consultando agenda");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [fecha]);

  // Aseguramos orden por hora
  const ordered = useMemo(() => {
    return [...rows].sort((a, b) => {
      // si vienen ISO, comparamos por Date; si vienen HH:mm, comparamos como strings "HH:mm"
      const ha = a.hora.includes("T") ? new Date(a.hora).getTime() : a.hora.localeCompare(b.hora);
      const hb = b.hora.includes("T") ? new Date(b.hora).getTime() : b.hora.localeCompare(a.hora);
      // si son números (ISO), ya están en ms; si son strings, usamos compare inverso arriba (equivalente)
      if (typeof ha === "number" && typeof hb === "number") return ha - hb;
      // fallback
      return String(a.hora).localeCompare(String(b.hora));
    });
  }, [rows]);

  function showHM(h: string) {
    // Si parece ISO (contiene "T"), lo convertimos a hora local Bogotá (util)
    return h.includes("T") ? utcTimeToLocalHM(h) : h;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">{title}</h3>
        <input
          type="date"
          value={fecha}
          onChange={(e) => onFechaChange?.(e.target.value)}
          className="border rounded px-2 py-1 ml-auto"
          title="Cambiar día"
        />
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">ID</th>
              <th className="border px-2 py-1 text-left">Hora</th>
              <th className="border px-2 py-1 text-left">Conductor</th>
              <th className="border px-2 py-1 text-left">Tipo</th>
              <th className="border px-2 py-1 text-left">Estado</th>
              <th className="border px-2 py-1 text-left">Placa</th>
              <th className="border px-2 py-1 text-left">Operación</th>
              <th className="border px-2 py-1 text-left">Vehículo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="border px-2 py-2 text-gray-500" colSpan={8}>
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td className="border px-2 py-2 text-red-600" colSpan={8}>
                  {err}
                </td>
              </tr>
            )}
            {!loading && !err && ordered.length === 0 && (
              <tr>
                <td className="border px-2 py-2 text-gray-500" colSpan={8}>
                  Sin turnos para este día.
                </td>
              </tr>
            )}
            {!loading && !err && ordered.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="border px-2 py-1">#{r.id}</td>
                <td className="border px-2 py-1">{showHM(r.hora)}</td>
                <td className="border px-2 py-1">
                  {r.conductor?.nombre || "-"}{" "}
                  <span className="text-xs text-gray-500">
                    {r.conductor?.cedula ? `(${r.conductor.cedula})` : ""}
                  </span>
                </td>
                <td className="border px-2 py-1">{r.tipo_turno || "-"}</td>
                <td className="border px-2 py-1">{r.estado || "-"}</td>
                <td className="border px-2 py-1">{r.placa || "-"}</td>
                <td className="border px-2 py-1">{r.operacion || "-"}</td>
                <td className="border px-2 py-1">{r.tipo_vehiculo_turno || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
