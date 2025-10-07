'use client'

import { useState } from 'react'

type Turno = {
  id: number
  fecha: string
  hora: string
  estado: string
  tipo_turno: string | null
  operacion?: string | null
  tipo_vehiculo_turno?: string | null
  conductor?: { id?: number; cedula?: string; nombre?: string; telefono?: string }
}

export default function TurnosTable({
  turnos,
  onConfirmar,
  onCancelar,
  onMover
}:{
  turnos: Turno[]
  onConfirmar: (t: Turno)=>void
  onCancelar: (t: Turno)=>void
  onMover: (t: Turno, nuevaFecha: string, nuevaHora: string)=>void
}) {
  const [showMove, setShowMove] = useState(false)
  const [target, setTarget] = useState<Turno | null>(null)
  const [moveFecha, setMoveFecha] = useState<string>(new Date().toISOString().slice(0,10))
  const [moveHora, setMoveHora] = useState<string>('06:00')

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3">#</th>
            <th className="text-left px-4 py-3">Hora</th>
            <th className="text-left px-4 py-3">Estado</th>
            <th className="text-left px-4 py-3">Operación</th>
            <th className="text-left px-4 py-3">Vehículo</th>
            <th className="text-left px-4 py-3">Conductor</th>
            <th className="text-left px-4 py-3">Teléfono</th>
            <th className="text-left px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {turnos.length===0 && (
            <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Sin turnos.</td></tr>
          )}
          {turnos.map(t => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900">#{t.id}</td>
              <td className="px-4 py-3">{fmtHora(t.hora)}</td>
              <td className="px-4 py-3"><BadgeEstado value={t.estado} /></td>
              <td className="px-4 py-3 capitalize">{t.operacion || '-'}</td>
              <td className="px-4 py-3">{t.tipo_vehiculo_turno || '-'}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{t.conductor?.nombre ?? '-'}</div>
                <div className="text-xs text-slate-500">{t.conductor?.cedula ?? ''}</div>
              </td>
              <td className="px-4 py-3">{t.conductor?.telefono ?? '-'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={()=>onConfirmar(t)}
                    disabled={(t.estado||'').toLowerCase()!=='pendiente'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                  >Confirmar</button>
                  <button
                    onClick={()=>onCancelar(t)}
                    disabled={(t.estado||'').toLowerCase()==='cancelado'}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-50"
                  >Cancelar</button>
                  <button
                    onClick={()=>{ setTarget(t); setMoveFecha(t.fecha.slice(0,10)); setMoveHora(safeHM(t.hora)); setShowMove(true) }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                  >Mover</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal mover */}
      {showMove && target && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-[70]">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Mover turno #{target.id}</h3>
            <p className="text-sm text-slate-600 mb-4">Mantendremos el tipo ({target.tipo_vehiculo_turno ?? '—'}) y la operación ({target.operacion ?? '—'}).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Nueva fecha</label>
                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={moveFecha} onChange={e=>setMoveFecha(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Nueva hora</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={moveHora} onChange={e=>setMoveHora(e.target.value)} step={3600} />
                <p className="text-xs text-slate-500 mt-1">Usa un slot válido (Normal: 06/10/14/18; CR: cada 2h).</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowMove(false)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">Cancelar</button>
              <button
                onClick={()=>{ onMover(target, moveFecha, moveHora); setShowMove(false) }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >Mover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtHora(s: string) {
  try { return new Date(s).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) } catch { return s }
}
function safeHM(d: string) {
  try { return new Date(d).toISOString().slice(11,16) } catch { return '06:00' }
}
function BadgeEstado({value}:{value:string}) {
  const e = (value||'').toLowerCase()
  const cls = e==='confirmado' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
           : e==='pendiente'  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
           : e==='cancelado'  ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
           : e==='finalizado' ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
           : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{cap(value)}</span>
}
function cap(s:string){ return s? s.charAt(0).toUpperCase()+s.slice(1).toLowerCase() : '' }
