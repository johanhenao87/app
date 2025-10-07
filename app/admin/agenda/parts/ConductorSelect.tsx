"use client";

import React, { useEffect, useMemo, useState } from "react";

export type ConductorMini = {
  id: number;
  cedula: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  tipo_vehiculo?: string | null;
  fecha_registro?: string | null;
};

type Props = {
  value: number | "";
  onChange: (id: number | "") => void;
  onSelected?: (c: ConductorMini) => void;
  placeholder?: string;
  minChars?: number;      // por defecto 2
  pageSize?: number;      // por defecto 20
};

export default function ConductorSelect({
  value,
  onChange,
  onSelected,
  placeholder = "Busca por nombre, cédula, teléfono o correo…",
  minChars = 2,
  pageSize = 20,
}: Props) {
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ConductorMini[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Consulta con debounce
  useEffect(() => {
    let aborted = false;
    const timer = setTimeout(async () => {
      const qq = q.trim();
      if (qq.length < minChars) {
        setItems([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // 🔁 Ajuste de ruta al endpoint existente
        const url = `/api/conductores/search?q=${encodeURIComponent(qq)}&limit=${pageSize}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error buscando conductores");
        if (!aborted) setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e: any) {
        if (!aborted) {
          setItems([]);
          setError(e?.message || "Fallo en la búsqueda");
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }, 300);

    return () => {
      aborted = true;
      clearTimeout(timer);
    };
  }, [q, minChars, pageSize]);

  const selectedText = useMemo(() => {
    const found = items.find((i) => i.id === value);
    if (found) return `${found.nombre} (${found.cedula})`;
    return value === "" ? "" : `ID: ${value}`;
  }, [value, items]);

  function pick(c: ConductorMini) {
    onChange(c.id);
    onSelected?.(c);
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
        />
        <input
          type="number"
          className="w-32 border rounded px-2 py-1"
          value={value}
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            onChange(v);
          }}
          placeholder="ID"
          title="También puedes colocar el ID directo"
        />
      </div>

      {selectedText && (
        <div className="text-xs text-gray-600 mt-1">Seleccionado: {selectedText}</div>
      )}

      <div className="mt-2 border rounded p-2 max-h-48 overflow-auto">
        {loading && <div className="text-sm text-gray-500">Buscando…</div>}
        {!loading && error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && items.length === 0 && q.trim().length >= minChars && (
          <div className="text-sm text-gray-500">Sin resultados</div>
        )}
        {!loading &&
          !error &&
          items.map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-2 py-1 rounded hover:bg-gray-100"
              type="button"
              onClick={() => pick(c)}
              title={`Elegir ${c.nombre}`}
            >
              <div className="font-medium">
                {c.nombre}{" "}
                <span className="text-xs text-gray-500">({c.cedula})</span>
              </div>
              <div className="text-xs text-gray-600">
                {c.tipo_vehiculo ? `Vehículo: ${c.tipo_vehiculo}` : "Vehículo: -"}
                {c.telefono ? ` · ${c.telefono}` : ""}
                {c.correo ? ` · ${c.correo}` : ""}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
