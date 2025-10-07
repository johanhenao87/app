'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadSession, postJSON } from '../lib/api'
import LoadingOverlay from '../components/ui/LoadingOverlay' // 👈 Import overlay

// Tipos
type SlotInfo = {
  hora: string
  cupo: number
  ocupados: number
  disponibles: number
  lleno: boolean
  habilitado: boolean
  razones: {
    diaHabil: boolean
    motivoNoHabil?: string | null
    habilitadoPorTiempo: boolean
  }
}

type CajaRapidaSlot = {
  hora: string
  disponibles: number
  habilitado: boolean
}

const TIPOS = ['SEN', 'TM', 'CB', 'DLL', 'XL', 'MM'] as const
const OPERACIONES = ['cargue', 'descargue'] as const

// Helper para fecha mínima
function minFechaISO12h(): string {
  const d = new Date()
  d.setHours(d.getHours() + 12)
  return d.toISOString().slice(0, 10)
}

export default function AgendarPage() {
  const router = useRouter()
  const search = useSearchParams()

  // Modo reprogramación
  const reprogramarId = useMemo(() => {
    const v = search?.get('reprogramar')
    return v ? Number(v) : null
  }, [search])

  // Estados principales
  const [fecha, setFecha] = useState(minFechaISO12h())
  const [tipoVehiculo, setTipoVehiculo] = useState<string>('')
  const [operacion, setOperacion] = useState<string>('')

  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [slotsCR, setSlotsCR] = useState<CajaRapidaSlot[]>([])
  const [seleccion, setSeleccion] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [busyText, setBusyText] = useState('Cargando…') // 👈 texto dinámico overlay
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)

  // Fechas min/max
  const minDate = useMemo(() => minFechaISO12h(), [])
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2)
    return d.toISOString().slice(0, 10)
  }, [])

  // Preselección de vehículo desde sesión
  useEffect(() => {
    const u = loadSession()
    if (!u) { router.replace('/login'); return }
    if (u.tipo_vehiculo) setTipoVehiculo(u.tipo_vehiculo)
  }, [router])

  const esCajaRapida = (tipoVehiculo || '').toUpperCase() === 'SEN'

  // ---- Consultas de disponibilidad ----
  async function cargarDisponibilidad(diaISO: string) {
    try {
      setBusyText('Cargando disponibilidad…')
      setLoading(true); setError(null); setMsg(null)
      const resp = await postJSON<{ fecha: string, disponibilidad: SlotInfo[] }>(
        '/api/turnos/disponibilidad', { fecha: diaISO }
      )
      setSlots(resp.disponibilidad)
      const first = resp.disponibilidad.find(s => s.habilitado)
      setSeleccion(first?.hora || '')
    } catch (e: any) {
      setError(e.message || 'No fue posible obtener la disponibilidad.')
      setSlots([]); setSeleccion('')
    } finally {
      setLoading(false)
    }
  }

  async function cargarDisponibilidadCR(diaISO: string) {
    try {
      setBusyText('Cargando disponibilidad (Caja Rápida)…')
      setLoading(true); setError(null); setMsg(null)
      const resp = await postJSON<{ fecha: string, slots: CajaRapidaSlot[] }>(
        '/api/caja-rapida/disponibilidad', { fecha: diaISO }
      )
      setSlotsCR(resp.slots)
      const first = resp.slots.find(s => s.habilitado)
      setSeleccion(first?.hora || '')
    } catch (e: any) {
      setError(e.message || 'No fue posible obtener la disponibilidad (CR).')
      setSlotsCR([]); setSeleccion('')
    } finally {
      setLoading(false)
    }
  }

  // Efecto para cargar disponibilidad
  useEffect(() => {
    if (!tipoVehiculo || !operacion) return
    if (esCajaRapida) cargarDisponibilidadCR(fecha)
    else cargarDisponibilidad(fecha)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, tipoVehiculo, operacion])

  // ---- Flujos ----
  async function onPrimaryClick() {
    if (reprogramarId) setShowConfirm(true)
    else await agendarCrear()
  }

  async function agendarCrear() {
    const u = loadSession()
    if (!u) return router.replace('/login')
    if (!tipoVehiculo || !operacion) { setError('Selecciona tipo de vehículo y operación.'); return }
    if (!seleccion) { setError('Selecciona una hora.'); return }

    setBusyText('Agendando turno…')
    setLoading(true); setError(null); setMsg(null)
    try {
      if (esCajaRapida) {
        await postJSON('/api/turnos/agendar-caja-rapida', {
          conductorId: u.id,
          fecha,
          hora: seleccion,
          tipo_vehiculo: tipoVehiculo,
          operacion,
          actualizarTipoVehiculo: true,
          usuario: u.cedula
        })
      } else {
        await postJSON('/api/turnos/agendar', {
          conductorId: u.id,
          fecha,
          hora: seleccion,
          tipo_vehiculo: tipoVehiculo,
          operacion,
          actualizarTipoVehiculo: true
        })
      }
      setMsg('¡Turno agendado con éxito! Serás redirigido…')
      setTimeout(() => router.push('/panel'), 1200)
    } catch (e: any) {
      setError(e.message || 'No fue posible agendar.')
    } finally {
      setLoading(false)
    }
  }

  async function agendarReprogramar() {
    const u = loadSession()
    if (!u) return router.replace('/login')
    if (!reprogramarId) return
    if (!tipoVehiculo || !operacion) { setError('Selecciona tipo de vehículo y operación.'); return }
    if (!seleccion) { setError('Selecciona una hora.'); return }

    setBusyText('Reprogramando turno…')
    setLoading(true); setError(null); setMsg(null); setShowConfirm(false)
    try {
      await postJSON('/api/turnos/reprogramar', {
        turnoId: reprogramarId,
        conductorId: u.id,
        nuevaFecha: fecha,
        nuevaHora: seleccion,
        tipo_vehiculo: tipoVehiculo,
        operacion,
        actualizarTipoVehiculo: true
      })
      setMsg('¡Turno reprogramado con éxito! Redirigiendo…')
      setTimeout(() => router.push('/panel'), 1200)
    } catch (e:any) {
      setError(e.message || 'No fue posible reprogramar.')
    } finally {
      setLoading(false)
    }
  }

  // ---- UI ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          {reprogramarId
            ? 'Reprogramar Turno'
            : (esCajaRapida ? 'Agendar para vehículo sencillo (Caja Rápida)' : 'Agendar Nuevo Turno')}
        </h1>

        {/* Banner en modo reprogramación */}
        {reprogramarId && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
            Estás modificando el turno <b>#{reprogramarId}</b>. Al confirmar, se <b>cancelará</b> el turno anterior y se <b>creará</b> uno nuevo.
          </div>
        )}

        <div className="space-y-6">
          {/* Tipo de vehículo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de vehículo</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 text-gray-800"
              value={tipoVehiculo}
              onChange={e=>setTipoVehiculo(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Si cambias aquí, se actualizará en tu perfil.</p>
          </div>

          {/* Operación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿A qué vienes?</label>
            <div className="grid grid-cols-2 gap-2">
              {OPERACIONES.map(op => (
                <button
                  key={op}
                  onClick={()=>setOperacion(op)}
                  className={`py-2 rounded-lg border-2 ${operacion===op ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  type="button"
                >
                  {op === 'cargue' ? 'Cargue' : 'Descargue'}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <FechaPicker fecha={fecha} setFecha={setFecha} />

          {/* Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona una Hora</label>
            <div className="grid grid-cols-2 gap-3">
              {!tipoVehiculo || !operacion ? (
                <div className="col-span-2 text-center text-gray-600 py-3 bg-gray-50 rounded-lg">
                  Primero selecciona <b>Tipo de vehículo</b> y <b>Operación</b>.
                </div>
              ) : esCajaRapida ? (
                slotsCR.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-600 py-3 bg-gray-50 rounded-lg">
                    {loading ? 'Cargando disponibilidad…' : 'No hay horas disponibles.'}
                  </div>
                ) : slotsCR.map(s => (
                  <button
                    key={s.hora}
                    onClick={()=> s.habilitado && setSeleccion(s.hora)}
                    disabled={!s.habilitado}
                    className={`p-4 rounded-xl border-2 text-center ${seleccion===s.hora ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'} ${!s.habilitado ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xl font-bold">{s.hora}</div>
                    <div className="text-sm">{s.habilitado ? 'Disponible' : 'No disponible'}</div>
                  </button>
                ))
              ) : (
                slots.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-600 py-3 bg-gray-50 rounded-lg">
                    {loading ? 'Cargando disponibilidad…' : 'No hay horas disponibles.'}
                  </div>
                ) : slots.map(s => (
                  <button
                    key={s.hora}
                    onClick={()=> s.habilitado && setSeleccion(s.hora)}
                    disabled={!s.habilitado}
                    className={`p-4 rounded-xl border-2 text-center ${seleccion===s.hora ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'} ${!s.habilitado ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xl font-bold">{s.hora}</div>
                    <div className="text-sm">{s.habilitado ? `Disponibles: ${s.disponibles}/${s.cupo}` : 'No disponible'}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-red-600">{error}</p>}
          {msg && <p className="text-green-600">{msg}</p>}

          {/* Botón principal */}
          <button
            onClick={onPrimaryClick}
            disabled={loading || !seleccion || !tipoVehiculo || !operacion}
            className="w-full rounded-xl px-5 py-2.5 bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? (reprogramarId ? 'Reprogramando…' : 'Agendando…')
              : (seleccion ? `${reprogramarId ? 'Reprogramar' : (esCajaRapida ? 'Agendar Caja Rápida' : 'Agendar Turno')} a las ${seleccion}` : 'Selecciona una hora')}
          </button>

          <div className="flex gap-3 mt-4">
            <button onClick={() => router.push('/panel')} className="w-full rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200">Ver Mis Turnos</button>
            <button onClick={() => router.push('/login')} className="w-full rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200">Ir a Iniciar Sesión</button>
          </div>
        </div>

        {/* Modal confirmación reprogramar */}
        {reprogramarId && showConfirm && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Confirmar reprogramación</h2>
              <p className="text-sm text-gray-600 mb-4">
                Vas a <b>cancelar</b> el turno <b>#{reprogramarId}</b> y crear uno nuevo para <b>{fecha}</b> a las <b>{seleccion || '—'}</b>.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">No, volver</button>
                <button onClick={agendarReprogramar} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Sí, reprogramar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay de carga global */}
      <LoadingOverlay show={loading} text={busyText} />
    </div>
  )
}

// ---- Subcomponente Fecha ----
function FechaPicker({ fecha, setFecha }: { fecha: string; setFecha: (v: string) => void }) {
  const minDate = useMemo(() => minFechaISO12h(), [])
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2)
    return d.toISOString().slice(0, 10)
  }, [])
  return (
    <div>
      <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">Selecciona la Fecha</label>
      <input
        id="fecha"
        type="date"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 text-gray-800"
        min={minDate}
        max={maxDate}
        value={fecha}
        onChange={e => setFecha(e.target.value)}
      />
    </div>
  )
}
