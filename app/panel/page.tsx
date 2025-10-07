'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadSession, clearSession, postJSON } from '../lib/api'
import { Home, CalendarPlus, UserRound, LogOut } from 'lucide-react'

// 🔁 Utilidades de zona horaria (Bogotá)
import {
  utcTimeToLocalHM,       // "HH:mm" desde lo que venga (ISO/'HH:mm'/epoch) → local Bogotá
  formatLocalDate,        // "dd mmm yyyy" en Bogotá
  bogotaLocalToUtcISO     // combina 'YYYY-MM-DD' + 'HH:mm' (Bogotá) → ISO UTC canónico
} from '../lib/tz'

// Tipos
type Turno = {
  id: number
  fecha: string      // 'YYYY-MM-DD' (local Bogotá)
  hora: string       // puede venir ISO/epoch o 'HH:mm' (lo normalizamos)
  estado: string
  tipo_turno: string | null
  conductor: { id:number, cedula:string, nombre:string }
}

// Helpers (mostrar y ordenar SIEMPRE desde el mismo instante canónico)
function labelsFromTurno(fechaYMD: string, horaAny: string) {
  // 1) normalizamos la hora a "HH:mm" local Bogotá
  const hmLocal = utcTimeToLocalHM(horaAny)
  // 2) combinamos fecha (local) + hora (local) → ISO UTC canónico
  const utcISO  = bogotaLocalToUtcISO(fechaYMD.slice(0,10), hmLocal)
  // 3) generamos etiquetas
  return {
    dateLabel: formatLocalDate(utcISO), // ej. "30 sept 2025"
    timeLabel: hmLocal                  // ej. "06:00"
  }
}

/** Epoch para ordenar pendientes respetando Bogotá */
function combineDT(fechaYMD: string, horaAny: string): number {
  const hmLocal = utcTimeToLocalHM(horaAny)                 // "HH:mm"
  const utcISO  = bogotaLocalToUtcISO(fechaYMD.slice(0,10), hmLocal)
  return new Date(utcISO).getTime()
}

function cap(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export default function PanelPage() {
  const router = useRouter()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<{id:number, cedula:string, nombre:string} | null>(null)

  // Cargar sesión + turnos
  useEffect(() => {
    const u = loadSession()
    if (!u) {
      router.replace('/login')
      return
    }
    setUsuario(u)
    const fetchTurnos = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await postJSON<Turno[]>('/api/turnos/mis-pendientes', { conductorId: u.id })
        setTurnos(data)
      } catch (e:any) {
        setError(e.message || 'No fue posible cargar tus turnos. Inténtalo de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    fetchTurnos()
  }, [router])

  // Próximo turno (el más cercano)
  const proximo = useMemo(() => {
    if (!turnos?.length) return null
    const sorted = [...turnos].sort((a,b) =>
      combineDT(a.fecha, a.hora) - combineDT(b.fecha, b.hora)
    )
    return sorted[0]
  }, [turnos])

  // Cancelar
  async function cancelar(turno: Turno) {
    setError(null); setMsg(null)
    const u = loadSession()
    if (!u) return router.replace('/login')
    setLoading(true)
    try {
      await postJSON('/api/turnos/cancelar', { turnoId: turno.id, usuario: u.cedula })
      setMsg('Turno cancelado con éxito.')
      const data = await postJSON<Turno[]>('/api/turnos/mis-pendientes', { conductorId: u.id })
      setTurnos(data)
    } catch (e:any) {
      setError(e.message || 'No fue posible cancelar el turno. Intenta de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    clearSession()
    router.replace('/login')
  }

  // Navegaciones
  function irAReprogramar(turnoId: number) {
    router.push(`/agendar?reprogramar=${turnoId}`)
  }
  function irPerfil() { router.push('/perfil') }
  function irAgendar() { router.push('/agendar') }
  function irPanel() { router.push('/panel') }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header (limpio; acciones ocultas en móvil porque estarán en la bottom bar) */}
      <header className="px-4 sm:px-6 py-3 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              {usuario ? `Hola, ${usuario.nombre}` : 'Mis Turnos'}
            </h1>
            <p className="text-sm text-gray-600">
              Turnos pendientes:&nbsp;<span className="font-semibold">{turnos.length}</span>
            </p>
          </div>

          {/* Acciones visible solo en desktop (en móvil van abajo) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={irPerfil}
              className="rounded-full px-4 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition"
              title="Editar mis datos"
            >
              Mi perfil
            </button>
            <button
              onClick={irAgendar}
              className="rounded-full px-4 py-2 bg-black text-white text-sm font-medium hover:opacity-90 transition"
            >
              Agendar nuevo turno
            </button>
            <button
              onClick={logout}
              className="rounded-full px-4 py-2 bg-blue-100 text-blue-700 font-medium text-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido (dejamos espacio para la bottom bar en móvil) */}
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 pb-28 sm:pb-8">
        {loading && <p className="text-gray-600 text-center py-4">Cargando tus turnos…</p>}
        {error && <p className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg">{error}</p>}
        {msg && <p className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-lg">{msg}</p>}

        {/* Resumen del próximo turno */}
        {!loading && proximo && (
          <div className="bg-white rounded-2xl shadow-md p-5 mb-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 font-semibold">Próximo turno</div>
                {(() => {
                  const { dateLabel, timeLabel } = labelsFromTurno(proximo.fecha, proximo.hora)
                  return (
                    <>
                      <div className="text-lg font-semibold text-gray-800 mt-1">
                        {dateLabel} — {timeLabel}
                      </div>
                      <div className="text-sm text-gray-600">
                        Tipo: {cap(proximo.tipo_turno ?? 'normal')} • Estado: {cap(proximo.estado)}
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => irAReprogramar(proximo.id)}
                  className="rounded-full px-4 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Modificar
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && turnos.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-600">
            <p className="text-lg font-medium mb-2">¡Todo despejado!</p>
            <p>No tienes turnos pendientes por ahora. Puedes agendar uno nuevo.</p>
            <div className="mt-4">
              <button
                onClick={irAgendar}
                className="rounded-full px-5 py-2 bg-black text-white text-sm font-medium hover:opacity-90 transition"
              >
                Agendar nuevo turno
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {turnos.map(t => {
            const { dateLabel, timeLabel } = labelsFromTurno(t.fecha, t.hora)
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <div>
                  <div className="font-semibold text-lg text-gray-800 mb-1">
                    Turno #{t.id} <span className="text-blue-600 capitalize">({t.tipo_turno ?? 'Normal'})</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Fecha:</span> {dateLabel}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Hora:</span> {timeLabel}
                  </div>
                  <div className="text-xs font-medium mt-1 text-gray-600">
                    Estado: {cap(t.estado)}
                  </div>
                </div>

                {/* Acciones abajo (mobile-first); en desktop se alinean a la derecha */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                  <button
                    onClick={() => irAReprogramar(t.id)}
                    className="rounded-full px-6 py-2 bg-white border border-gray-300 text-gray-800 font-semibold text-sm hover:bg-gray-50 transition"
                  >
                    Modificar
                  </button>
                  <button
                    onClick={() => cancelar(t)}
                    disabled={loading}
                    className="rounded-full px-6 py-2 bg-red-500 text-white font-semibold text-sm shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cancelando…' : 'Cancelar Turno'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom bar (solo móvil) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        role="navigation"
        aria-label="Barra inferior"
      >
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-4">
            <button
              onClick={irPanel}
              className="flex flex-col items-center gap-1 py-2.5 text-gray-700 hover:text-gray-900"
            >
              <Home className="h-5 w-5" />
              <span className="text-[11px] font-medium">Panel</span>
            </button>
            <button
              onClick={irAgendar}
              className="flex flex-col items-center gap-1 py-2.5 text-gray-700 hover:text-gray-900"
            >
              <CalendarPlus className="h-5 w-5" />
              <span className="text-[11px] font-medium">Agendar</span>
            </button>
            <button
              onClick={irPerfil}
              className="flex flex-col items-center gap-1 py-2.5 text-gray-700 hover:text-gray-900"
            >
              <UserRound className="h-5 w-5" />
              <span className="text-[11px] font-medium">Mi perfil</span>
            </button>
            <button
              onClick={logout}
              className="flex flex-col items-center gap-1 py-2.5 text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[11px] font-medium">Salir</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
