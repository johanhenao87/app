// app/admin/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

// Layout y UI del scaffold
import AdminLayout from './layout/AdminLayout'
import ThemeToggle from './layout/ThemeToggle'
import Card from './ui/Card'

// Piezas existentes tuyas
import AdminSidebar from './parts/AdminSidebar'
import ConductorSelect from './parts/ConductorSelect' // (se usa en modales de creación más adelante)

// Lógica/API existente (tu archivo no se sobrescribió)
import {
  apiRegistrarLlegada,
  apiIniciarProceso,
  apiFinalizarTurno,
  apiCancelarTurno,
  apiReprogramarTurno,
  apiIntercambiarHora,
  canRegistrarLlegada,
  canIniciar,
  canFinalizar,
  canCancelar,
  canSwap
} from './lib/turnoActions'

// Utilidades nuevas del scaffold (puedes mover tus helpers aquí después)
import { hoyISO, fmtFechaY, hmLocalToMinutes, utcTimeToLocalHM } from './lib/date'
import TurnosTable from './turnos/TurnosTable'
import MoveTurnoModal from './turnos/modals/MoveTurnoModal'
import FinishConfirmModal from './turnos/modals/FinishConfirmModal'
import SwapConfirmModal from './turnos/modals/SwapConfirmModal'
import { TurnoAdmin } from './lib/types'
import { postJSON } from '../lib/api'   // tu helper existente

export default function AdminPage() {
  const router = useRouter()

  // ---------- Gate de PIN muy simple (puedes migrarlo luego a hooks/useAdminGate) ----------
  const PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'admin123'
  const [pinOk, setPinOk] = useState(false)
  const [pinInput, setPinInput] = useState('')
  useEffect(() => { if (localStorage.getItem('admin_ok') === '1') setPinOk(true) }, [])

  // ---------- Filtros ----------
  const [fecha, setFecha] = useState<string>(hoyISO())
  const [estado, setEstado] = useState<'todos' | 'pendiente' | 'confirmado' | 'en_proceso' | 'cancelado' | 'finalizado'>('todos')
  const [vehType, setVehType] = useState<'todos' | 'SEN' | 'TM' | 'CB' | 'DLL' | 'XL' | 'MM'>('todos')

  // ---------- Datos ----------
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [busyText, setBusyText] = useState('Cargando…')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ---------- Modales ----------
  const [showMove, setShowMove] = useState(false)
  const [moveTarget, setMoveTarget] = useState<TurnoAdmin | null>(null)
  const [moveFecha, setMoveFecha] = useState<string>(hoyISO())
  const [moveHora, setMoveHora] = useState<string>('06:00')

  const [showConfirmFinish, setShowConfirmFinish] = useState(false)
  const [finishTarget, setFinishTarget] = useState<TurnoAdmin | null>(null)

  const [showSwap, setShowSwap] = useState(false)
  const [swapA, setSwapA] = useState<TurnoAdmin | null>(null)
  const [swapB, setSwapB] = useState<TurnoAdmin | null>(null)

  // ---------- Carga ----------
  async function cargar() {
    try {
      setBusyText('Cargando turnos del día…')
      setLoading(true); setError(null); setMsg(null)
      const data = await postJSON<TurnoAdmin[]>('/api/turnos/dia', { fecha })
      let lista = data
      if (estado !== 'todos') lista = lista.filter(t => (t.estado || '').toLowerCase() === estado)
      if (vehType !== 'todos') lista = lista.filter(t => (t.tipo_vehiculo_turno || '').toUpperCase() === vehType)
      lista.sort((a, b) => hmLocalToMinutes(a.hora) - hmLocalToMinutes(b.hora))
      setTurnos(lista)
    } catch (e: any) {
      setError(e.message || 'No fue posible cargar los turnos.')
      setTurnos([])
    } finally { setLoading(false) }
  }
  useEffect(() => { if (pinOk) cargar() }, [fecha, estado, vehType, pinOk])

  // ---------- KPIs básicos (puedes moverlos a hooks/useTurnos luego) ----------
  const kpis = useMemo(() => {
    const total        = turnos.length
    const confirmado   = turnos.filter(t => (t.estado||'').toLowerCase()==='confirmado').length
    const pendiente    = turnos.filter(t => (t.estado||'').toLowerCase()==='pendiente').length
    const cancelado    = turnos.filter(t => (t.estado||'').toLowerCase()==='cancelado').length
    const finalizado   = turnos.filter(t => (t.estado||'').toLowerCase()==='finalizado').length
    return { total, confirmado, pendiente, cancelado, finalizado }
  }, [turnos])

  // ---------- Acciones ----------
  async function registrarLlegada(t: TurnoAdmin) {
    try { setBusyText(`Registrando llegada (turno #${t.id})…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiRegistrarLlegada(t.id); if ('error' in res) throw new Error(res.error)
      setMsg(res.message || `Llegada del turno #${t.id} registrada.`); await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible registrar la llegada.') } finally { setLoading(false) }
  }
  async function iniciarProceso(t: TurnoAdmin) {
    try { setBusyText(`Iniciando proceso (turno #${t.id})…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiIniciarProceso(t.id); if ('error' in res) throw new Error(res.error)
      setMsg(res.message || `Turno #${t.id} en proceso.`); await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible iniciar el proceso.') } finally { setLoading(false) }
  }
  function solicitarFinalizar(t: TurnoAdmin) { setFinishTarget(t); setShowConfirmFinish(true) }
  async function finalizarTurno(t: TurnoAdmin) {
    try { setBusyText(`Finalizando turno #${t.id}…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiFinalizarTurno(t.id); if ('error' in res) throw new Error(res.error)
      setMsg(res.message || `Turno #${t.id} finalizado.`); await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible finalizar el turno.') } finally { setLoading(false) }
  }
  async function cancelarTurnoUI(t: TurnoAdmin) {
    try { setBusyText(`Cancelando turno #${t.id}…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiCancelarTurno(t.id); if ('error' in res) throw new Error(res.error)
      setMsg(res.message || `Turno #${t.id} cancelado.`); await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible cancelar el turno.') } finally { setLoading(false) }
  }
  function abrirMover(t: TurnoAdmin) {
    setMoveTarget(t); setMoveFecha(fecha)
    try { setMoveHora(utcTimeToLocalHM(t.hora)) } catch { setMoveHora('06:00') }
    setShowMove(true)
  }
  async function moverTurno() {
    if (!moveTarget) return
    try {
      setBusyText(`Moviendo turno #${moveTarget.id}…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiReprogramarTurno({
        turnoId: moveTarget.id,
        conductorId: moveTarget.conductor?.id,
        nuevaFecha: moveFecha,
        nuevaHora: moveHora,
        tipo_vehiculo: moveTarget.tipo_vehiculo_turno || undefined,
        operacion: moveTarget.operacion || undefined,
        actualizarTipoVehiculo: false,
      })
      if ('error' in res) throw new Error(res.error)
      setShowMove(false); setMsg(res.message || `Turno #${moveTarget.id} movido a ${moveFecha} ${moveHora}.`)
      await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible mover el turno.') } finally { setLoading(false) }
  }
  function solicitarSwap(a: TurnoAdmin, b: TurnoAdmin) {
    if (!canSwap(a.estado) || !canSwap(b.estado)) { setError('Solo se pueden intercambiar turnos en estado pendiente o confirmado.'); return }
    setSwapA(a); setSwapB(b); setShowSwap(true)
  }
  async function confirmarSwap() {
    if (!swapA || !swapB) return
    try {
      setBusyText(`Intercambiando #${swapA.id} ↔ #${swapB.id}…`); setLoading(true); setError(null); setMsg(null)
      const res = await apiIntercambiarHora(swapA.id, swapB.id) as { error?: string; message?: string }
      if (res.error) throw new Error(res.error)
      setMsg(res.message ?? `Intercambio realizado #${swapA.id} ↔ #${swapB.id}.`)
      setShowSwap(false); setSwapA(null); setSwapB(null); await cargar()
    } catch (e:any) { setError(e.message || 'No fue posible intercambiar los turnos.') } finally { setLoading(false) }
  }

  // ---------- Gate PIN ----------
  if (!pinOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">Acceso Administrativo</h1>
            <ThemeToggle />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Ingresa el PIN para continuar.</p>
          <input
            type="password"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-4 py-2 mb-3"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN"
          />
          <button
            onClick={() => { if (pinInput === PIN) { localStorage.setItem('admin_ok', '1'); setPinOk(true) } else alert('PIN incorrecto') }}
            className="w-full rounded-xl px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  // ---------- UI ----------
  return (
    <AdminLayout
      topbarRight={<ThemeToggle />}
      sidebar={
        <AdminSidebar
          openMobile={false}
          onCloseMobile={()=>{}}
          collapsed={false}
          onToggleCollapsed={()=>{}}
          fecha={fecha}
          setFecha={setFecha}
          estado={estado}
          setEstado={setEstado as any}
          filtroTipo={vehType === 'todos' ? 'todos' : vehType}
          setFiltroTipo={(v)=> setVehType(v as any)}
          kpis={kpis}
          onRefrescar={cargar}
          onParametros={()=> router.push('/admin/parametros')}
        />
      }
    >
      <div className="grid gap-4">
        <Card title="Turnos — Normal" extra={`Total: ${turnos.filter(t=> (t.tipo_turno||'normal')==='normal').length}`}>
          <TurnosTable
            turnos={turnos.filter(t=> (t.tipo_turno||'normal')==='normal')}
            onRegistrarLlegada={registrarLlegada}
            onIniciar={iniciarProceso}
            onSolicitarFinalizar={solicitarFinalizar}
            onCancelar={cancelarTurnoUI}
            onMover={abrirMover}
            onSwapRequest={solicitarSwap}
          />
        </Card>

        <Card title="Turnos — Caja rápida (SEN)" extra={`Total: ${turnos.filter(t=> (t.tipo_turno||'')==='caja_rapida').length}`}>
          <TurnosTable
            turnos={turnos.filter(t=> (t.tipo_turno||'')==='caja_rapida')}
            onRegistrarLlegada={registrarLlegada}
            onIniciar={iniciarProceso}
            onSolicitarFinalizar={solicitarFinalizar}
            onCancelar={cancelarTurnoUI}
            onMover={abrirMover}
            onSwapRequest={solicitarSwap}
          />
        </Card>
      </div>

      {/* Modales */}
      {showMove && moveTarget && (
        <MoveTurnoModal
          target={moveTarget}
          fecha={moveFecha}
          hora={moveHora}
          onFecha={setMoveFecha}
          onHora={setMoveHora}
          onClose={()=> setShowMove(false)}
          onConfirm={moverTurno}
        />
      )}
      {showConfirmFinish && finishTarget && (
        <FinishConfirmModal
          target={finishTarget}
          onCancel={()=>{ setShowConfirmFinish(false); setFinishTarget(null) }}
          onConfirm={async ()=>{ const t = finishTarget; setShowConfirmFinish(false); setFinishTarget(null); if (t) await finalizarTurno(t) }}
        />
      )}
      {showSwap && swapA && swapB && (
        <SwapConfirmModal
          a={swapA}
          b={swapB}
          onCancel={()=>{ setShowSwap(false); setSwapA(null); setSwapB(null) }}
          onConfirm={confirmarSwap}
        />
      )}
    </AdminLayout>
  )
}
