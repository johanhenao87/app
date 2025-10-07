"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Conductor = {
  id: number;
  cedula: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  tipo_vehiculo?: string | null;
  fecha_registro?: string | null;
};

type Props = {
  value?: number | "";
  onChange?: (id: number | "") => void;
  onSelected?: (c: Conductor) => void; // devuelve el objeto completo
  placeholder?: string;
  disabled?: boolean;
};

function useDebouncedValue<T>(val: T, delay = 300) {
  const [debounced, setDebounced] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return debounced;
}

export default function ConductorSelect({
  value = "",
  onChange,
  onSelected,
  placeholder = "Buscar por nombre, cédula, teléfono o correo…",
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Conductor[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const debounced = useDebouncedValue(query, 350);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    const found = items.find((i) => i.id === value);
    return found
      ? `${found.nombre} · ${found.cedula}${found.tipo_vehiculo ? ` · ${found.tipo_vehiculo}` : ""}`
      : value
      ? `ID ${value}`
      : "";
  }, [items, value]);

  async function fetchPage(p = 1, append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      params.set("page", String(p));
      params.set("pageSize", "10");
      const res = await fetch(`/api/admin/conductores/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error buscando conductores");

      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
      setHasMore((data.page * data.pageSize) < data.total);
      setPage(data.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (!listRef.current) return;
      if (!listRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function handlePick(c: Conductor) {
    onChange?.(c.id);
    onSelected?.(c);
    setQuery(`${c.nombre} · ${c.cedula}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={listRef}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border rounded px-2 py-1"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-2 border rounded"
          disabled={disabled}
          aria-label="Abrir lista"
        >
          ▾
        </button>
      </div>

      {selectedLabel && (
        <div className="text-xs text-gray-600 mt-1">
          Seleccionado: <b>{selectedLabel}</b>
        </div>
      )}

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-72 overflow-auto">
          {loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Buscando…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Sin resultados</div>
          )}
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handlePick(c)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="text-sm font-medium">{c.nombre} · {c.cedula}</div>
              <div className="text-xs text-gray-600">
                {(c.tipo_vehiculo || "—")} · {(c.telefono || "sin teléfono")} · {(c.correo || "sin correo")}
              </div>
            </button>
          ))}
          {hasMore && (
            <div className="p-2">
              <button
                type="button"
                onClick={() => fetchPage(page + 1, true)}
                className="w-full border rounded px-2 py-1 text-sm"
                disabled={loading}
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
