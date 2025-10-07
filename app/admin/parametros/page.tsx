'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ------------ Tipos de datos (flexibles / opcionales) ------------
type SlotParam = {
  id?: number
  tipo?: 'normal' | 'caja_rapida' | string | null
  hora?: string | null
  cupo_max?: number | null
  activo?: boolean | null
  updatedAt?: string | null
}

type Regla = {
  id?: number
  nombre?: string | null
  valor?: string | number | null
  descripcion?: string | null
}

type RespSlots = { ok?: boolean; items?: SlotParam[] }
type RespReglas = { ok?: boolean; reglas?: Regla[]; parametros?: any[] }

// ------------ Utiles UI ------------
function cls(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

// ===================================================================
//                         Página de Parámetros
// ===================================================================
export default function ParametrosAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Siempre inicializados como arreglo vacío para que .length sea seguro
  const [slots, setSlots] = useState<SlotParam[]>([])
  const [reglas, setReglas] = useState<Regla[]>([])

  async function cargar() {
    setLoading(true)
    setError(null)

    try {
      // Slots (parámetros de turnos)
      const r1 = await fetch('/api/admin/parametros-turnos/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const j1: RespSlots = await r1.json().catch(() => ({} as any))

      const items = Array.isArray(j1?.items) ? j1.items : []
      setSlots(items)

      // Reglas
      const r2 = await fetch('/api/admin/reglas/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const j2: RespReglas = await r2.json().catch(() => ({} as any))
      const regs = Array.isArray(j2?.reglas) ? j2!.reglas! : []
      setReglas(regs)
    } catch (e: any) {
      setError(e?.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Parámetros de Agenda</h1>
            <p className="text-sm text-slate-600">Visualización de configuración (read-only por ahora)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="rounded-full px-4 py-2 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              type="button"
            >
              Volver al Panel
            </button>
            <button
              onClick={cargar}
              disabled={loading}
              className={cls(
                'rounded-full px-4 py-2 text-sm font-semibold',
                loading ? 'bg-slate-300 text-white' : 'bg-black text-white hover:opacity-90'
              )}
              type="button"
            >
              {loading ? 'Cargando…' : 'Refrescar'}
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {error && (
          <div className="bg-rose-50 text-rose-700 ring-1 ring-rose-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* --------------------- Tabla: Capacidad / Slots --------------------- */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Capacidades y Slots (ParametrosTurnos)
            </h2>
            <p className="text-sm text-slate-500">
              Define horas válidas por tipo de turno (normal/caja_rapida) y su cupo máximo por hora.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Hora</th>
                  <th className="text-left px-4 py-2">Cupo máx.</th>
                  <th className="text-left px-4 py-2">Activo</th>
                  <th className="text-left px-4 py-2">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(slots ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No hay parámetros de slots cargados.
                    </td>
                  </tr>
                ) : (
                  (slots ?? []).map((s, idx) => (
                    <tr key={s.id ?? idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{s.id ?? '-'}</td>
                      <td className="px-4 py-2 capitalize">{s.tipo ?? '-'}</td>
                      <td className="px-4 py-2">{s.hora ?? '-'}</td>
                      <td className="px-4 py-2">{s.cupo_max ?? '-'}</td>
                      <td className="px-4 py-2">
                        {s.activo ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                            Sí
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">{s.updatedAt ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              disabled
              className="rounded-lg px-4 py-2 bg-slate-200 text-slate-600 cursor-not-allowed"
              title="Próxima iteración"
            >
              Añadir / Editar (próximo)
            </button>
          </div>
        </section>

        {/* -------------------------- Tabla: Reglas --------------------------- */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Reglas de agendamiento</h2>
            <p className="text-sm text-slate-500">
              Reglas numéricas de negocio (ej: <em>cupo por franja 4h</em>).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Valor</th>
                  <th className="text-left px-4 py-2">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(reglas ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No hay reglas definidas.
                    </td>
                  </tr>
                ) : (
                  (reglas ?? []).map((r, idx) => (
                    <tr key={r.id ?? idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{r.id ?? '-'}</td>
                      <td className="px-4 py-2">{r.nombre ?? '-'}</td>
                      <td className="px-4 py-2">{r.valor ?? '-'}</td>
                      <td className="px-4 py-2">{r.descripcion ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              disabled
              className="rounded-lg px-4 py-2 bg-slate-200 text-slate-600 cursor-not-allowed"
              title="Próxima iteración"
            >
              Editar reglas (próximo)
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
