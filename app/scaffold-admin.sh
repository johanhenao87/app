#!/usr/bin/env bash
# scaffold-admin.sh  —  ejecutar desde la carpeta app/
set -euo pipefail

ROOT="."
BASE="${ROOT}/admin"

note() { printf "• %s\n" "$*"; }
mkd()  { mkdir -p "$1"; }
mkf()  {
  local path="$1"; shift
  if [ -f "$path" ]; then
    note "Saltando (existe): $path"
  else
    note "Creando: $path"
    cat > "$path" <<'EOF'
'"$@"'
EOF
  fi
}

note "Creando estructura en ${BASE}"

# Directorios
mkd "${BASE}/layout"
mkd "${BASE}/parts"               # (ya tienes varios aquí)
mkd "${BASE}/turnos/modals"
mkd "${BASE}/turnos/dnd"
mkd "${BASE}/lib"
mkd "${BASE}/hooks"
mkd "${BASE}/ui"

################################
# layout/AdminTopbar.tsx
################################
mkf "${BASE}/layout/AdminTopbar.tsx" $'
\'use client\'
import Link from "next/link"
import ThemeToggle from "./ThemeToggle"

export default function AdminTopbar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur px-3 py-2
                    dark:bg-slate-900/90 dark:border-slate-800">
      <div className="mx-auto max-w-[1400px] flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Panel administrativo
        </div>
        <div className="ml-auto flex items-center gap-2">
          {right}
          <Link href="/admin/agenda"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700">
            Agenda avanzada
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
'

################################
# layout/AdminLayout.tsx
################################
mkf "${BASE}/layout/AdminLayout.tsx" $'
\'use client\'
export default function AdminLayout({
  sidebar,
  children,
}: { sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-4 px-3 py-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">{sidebar}</aside>
      <main className="col-span-12 md:col-span-8 lg:col-span-9">{children}</main>
    </div>
  )
}
'

################################
# layout/ThemeToggle.tsx
################################
mkf "${BASE}/layout/ThemeToggle.tsx" $'
\'use client\'
import { useTheme } from "../hooks/useTheme"

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={`Cambiar a ${theme === "dark" ? "claro" : "oscuro"}`}
      className="rounded-lg border px-3 py-1.5 text-sm
                 border-slate-300 hover:bg-slate-100
                 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200">
      {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  )
}
'

################################
# ui/Card.tsx
################################
mkf "${BASE}/ui/Card.tsx" $'
import React from "react"
export default function Card({
  title, extra, className, children,
}: { title:string; extra?:React.ReactNode; className?:string; children:React.ReactNode }) {
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-800 ${className||""}`}>
      <div className="px-4 py-3 border-b flex items-center justify-between dark:border-slate-800">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {extra && <div className="text-xs text-slate-500 dark:text-slate-400">{extra}</div>}
      </div>
      <div className="p-2 sm:p-3">
        {children}
      </div>
    </div>
  )
}
'

################################
# ui/Buttons.tsx
################################
mkf "${BASE}/ui/Buttons.tsx" $'
import React from "react"

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }

const base = "px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
export const PrimaryButton = (p:BtnProps)=>(
  <button {...p} className={`${base} bg-indigo-600 text-white hover:bg-indigo-700 ${p.className||""}`}/>
)
export const SuccessButton = (p:BtnProps)=>(
  <button {...p} className={`${base} bg-emerald-600 text-white hover:bg-emerald-700 ${p.className||""}`}/>
)
export const DangerButton = (p:BtnProps)=>(
  <button {...p} className={`${base} bg-rose-600 text-white hover:bg-rose-700 ${p.className||""}`}/>
)
export const MutedButton = (p:BtnProps)=>(
  <button {...p} className={`${base} border bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 ${p.className||""}`}/>
)
'

################################
# ui/BadgeEstado.tsx
################################
mkf "${BASE}/ui/BadgeEstado.tsx" $'
export default function BadgeEstado({estado}:{estado?:string|null}) {
  const e = (estado||"").toLowerCase()
  const map: Record<string,string> = {
    confirmado: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    pendiente: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    "en_proceso":"bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    cancelado: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    finalizado: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  }
  const cls = map[e] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
  const cap = (s:string)=> s.charAt(0).toUpperCase()+s.slice(1).toLowerCase()
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{cap(e||"")}</span>
}
'

################################
# ui/DropdownMore.tsx
################################
mkf "${BASE}/ui/DropdownMore.tsx" $'
import React from "react"
export default function DropdownMore({children}:{children:React.ReactNode}) {
  return <div className="relative inline-block">{children}</div>
}
'

################################
# ui/SkeletonRow.tsx
################################
mkf "${BASE}/ui/SkeletonRow.tsx" $'
export default function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2"><div className="h-4 w-8 bg-slate-200 rounded"/></td>
      <td className="px-3 py-2"><div className="h-4 w-12 bg-slate-200 rounded"/></td>
      <td className="px-3 py-2"><div className="h-4 w-16 bg-slate-200 rounded"/></td>
      <td className="px-3 py-2" colSpan={5}><div className="h-4 w-full bg-slate-200 rounded"/></td>
    </tr>
  )
}
'

################################
# ui/Toasts.tsx  + hooks/useToasts.ts
################################
mkf "${BASE}/ui/Toasts.tsx" $'
\'use client\'
import React, { createContext, useContext, useState } from "react"

type Toast = { id: number; type: "success"|"error"|"info"; text: string }
type Ctx = { push: (t:Omit<Toast,"id">)=>void }

const ToastCtx = createContext<Ctx | null>(null)
export const useToastCtx = () => {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error("ToastsProvider no montado")
  return ctx
}

export function ToastsProvider({children}:{children:React.ReactNode}) {
  const [list, setList] = useState<Toast[]>([])
  const push: Ctx["push"] = (t) => {
    const id = Date.now()+Math.random()
    setList(s => [...s, { id, ...t }])
    setTimeout(()=> setList(s => s.filter(x=>x.id!==id)), 3000)
  }
  return (
    <ToastCtx.Provider value={{push}}>
      {children}
      <div className="fixed right-3 top-3 z-[90] space-y-2">
        {list.map(t=>(
          <div key={t.id}
            className={`rounded-lg px-3 py-2 text-sm shadow
                        ${t.type==="success"?"bg-emerald-600 text-white":
                          t.type==="error"?"bg-rose-600 text-white":"bg-slate-900 text-white"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
'

mkf "${BASE}/hooks/useToasts.ts" $'
\'use client\'
import { useToastCtx } from "../ui/Toasts"
export default function useToasts(){
  const { push } = useToastCtx()
  return {
    success: (text:string)=> push({type:"success", text}),
    error:   (text:string)=> push({type:"error", text}),
    info:    (text:string)=> push({type:"info", text}),
  }
}
'

################################
# hooks/useTheme.ts
################################
mkf "${BASE}/hooks/useTheme.ts" $'
\'use client\'
import { useEffect, useState } from "react"

const KEY = "theme"
export function useTheme(){
  const [theme, setTheme] = useState<"light"|"dark">(()=>{
    if (typeof window === "undefined") return "light"
    const s = localStorage.getItem(KEY) as "light"|"dark"|null
    return s ?? "light"
  })
  useEffect(()=>{
    const root = document.documentElement
    if (theme==="dark") root.classList.add("dark"); else root.classList.remove("dark")
    try { localStorage.setItem(KEY, theme) } catch {}
  }, [theme])
  return { theme, setTheme, toggle: ()=> setTheme(t=> t==="dark"?"light":"dark") }
}
export default useTheme
'

################################
# hooks/useAdminGate.ts
################################
mkf "${BASE}/hooks/useAdminGate.ts" $'
\'use client\'
import { useEffect, useState } from "react"

export default function useAdminGate(pinEnv?: string) {
  const PIN = pinEnv || process.env.NEXT_PUBLIC_ADMIN_PIN || "admin123"
  const [pinOk, setPinOk] = useState(false)
  const [pinInput, setPinInput] = useState("")

  useEffect(()=>{ if (localStorage.getItem("admin_ok")==="1") setPinOk(true) }, [])
  const tryEnter = ()=> {
    if (pinInput === String(PIN)) { localStorage.setItem("admin_ok","1"); setPinOk(true) }
    else alert("PIN incorrecto")
  }
  return { pinOk, pinInput, setPinInput, tryEnter }
}
'

################################
# hooks/useTurnos.ts
################################
mkf "${BASE}/hooks/useTurnos.ts" $'
\'use client\'
import { useCallback, useEffect, useMemo, useState } from "react"
import { TurnoAdmin } from "../lib/types"
import { getTurnosDelDia } from "../lib/fetchers"
import { hmLocalToMinutes } from "../lib/date"

export default function useTurnos({ fecha, estado, tipoVehiculo }:{
  fecha: string; estado: string; tipoVehiculo: string;
}) {
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const load = useCallback(async ()=>{
    setLoading(true); setError(null)
    try{
      let lista = await getTurnosDelDia(fecha)
      if (estado !== "todos") lista = lista.filter(t => (t.estado||"").toLowerCase()===estado)
      if (tipoVehiculo !== "todos") lista = lista.filter(t => (t.tipo_vehiculo_turno||"").toUpperCase()===tipoVehiculo)
      lista.sort((a,b)=> hmLocalToMinutes(a.hora) - hmLocalToMinutes(b.hora))
      setTurnos(lista)
    }catch(e:any){ setError(e?.message || "No fue posible cargar los turnos.") }
    finally{ setLoading(false) }
  }, [fecha, estado, tipoVehiculo])

  useEffect(()=>{ load() }, [load])

  const kpis = useMemo(()=>{
    const total = turnos.length
    const confirmado = turnos.filter(t=>(t.estado||"").toLowerCase()==="confirmado").length
    const pendiente  = turnos.filter(t=>(t.estado||"").toLowerCase()==="pendiente").length
    const cancelado  = turnos.filter(t=>(t.estado||"").toLowerCase()==="cancelado").length
    const finalizado = turnos.filter(t=>(t.estado||"").toLowerCase()==="finalizado").length
    return { total, confirmado, pendiente, cancelado, finalizado }
  }, [turnos])

  return { turnos, loading, error, refetch: load, kpis }
}
'

################################
# lib/types.ts
################################
mkf "${BASE}/lib/types.ts" $'
export type TurnoAdmin = {
  id: number
  fecha: string
  hora: string
  estado: string
  tipo_turno: string | null
  operacion?: string | null
  tipo_vehiculo_turno?: string | null
  conductor?: {
    id?: number
    cedula?: string
    nombre?: string
    telefono?: string
  }
}
export const ESTADOS = ["todos","pendiente","confirmado","en_proceso","cancelado","finalizado"] as const
export const VEH_TYPES = ["SEN","TM","CB","DLL","XL","MM"] as const
'

################################
# lib/date.ts
################################
mkf "${BASE}/lib/date.ts" $'
import { utcTimeToLocalHM } from "../../lib/tz"

export function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())
}
export function fmtFechaY(esISO: string) {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "America/Bogota", day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(esISO))
  } catch { return esISO }
}
export function hmLocalToMinutes(utcOrHM: string): number {
  const hm = utcTimeToLocalHM(utcOrHM)
  const [H,M] = hm.split(":").map(n=>parseInt(n,10))
  return (H||0)*60 + (M||0)
}
export { utcTimeToLocalHM }
'

################################
# lib/fetchers.ts
################################
mkf "${BASE}/lib/fetchers.ts" $'
import { postJSON } from "../../lib/api"
import { TurnoAdmin } from "./types"

export async function getTurnosDelDia(fecha: string): Promise<TurnoAdmin[]> {
  return postJSON<TurnoAdmin[]>("/api/turnos/dia", { fecha })
}
'

################################
# lib/state.ts (opcional simple)
################################
mkf "${BASE}/lib/state.ts" $'
\'use client\'
import { createContext, useContext, useState } from "react"
type Ctx = { busyText: string; setBusyText: (s:string)=>void; loading: boolean; setLoading:(b:boolean)=>void }
const C = createContext<Ctx | null>(null)
export function BusyProvider({children}:{children:React.ReactNode}) {
  const [busyText, setBusyText] = useState("Cargando…")
  const [loading, setLoading] = useState(false)
  return <C.Provider value={{busyText,setBusyText,loading,setLoading}}>{children}</C.Provider>
}
export const useBusy = ()=> {
  const ctx = useContext(C); if (!ctx) throw new Error("BusyProvider no montado"); return ctx
}
'

################################
# turnos/dnd/useRowSwap.ts
################################
mkf "${BASE}/turnos/dnd/useRowSwap.ts" $'
import { useState } from "react"
import { TurnoAdmin } from "../../lib/types"

export default function useRowSwap(onRequest:(a:TurnoAdmin,b:TurnoAdmin)=>void){
  const [draggingId, setDraggingId] = useState<number|null>(null)
  const [overId, setOverId] = useState<number|null>(null)

  const handlers = {
    rowProps: (t: TurnoAdmin, list: TurnoAdmin[]) => ({
      draggable: true,
      onDragStart: (ev: React.DragEvent) => { ev.dataTransfer.setData("text/plain", String(t.id)); setDraggingId(t.id) },
      onDragEnd:   () => { setDraggingId(null); setOverId(null) },
      onDragOver:  (ev: React.DragEvent) => { if (draggingId!==null) ev.preventDefault() },
      onDragEnter: () => { if (draggingId!==null && draggingId!==t.id) setOverId(t.id) },
      onDragLeave: () => { if (overId===t.id) setOverId(null) },
      onDrop:      (ev: React.DragEvent) => {
        ev.preventDefault()
        const src = Number(ev.dataTransfer.getData("text/plain"))
        if (!src || src===t.id) return
        const a = list.find(x=>x.id===src); const b = t
        if (a && b) onRequest(a,b)
        setOverId(null)
      }
    }),
    isOver: (rowId:number)=> overId===rowId && draggingId!==null && draggingId!==rowId,
  }
  return handlers
}
'

################################
# turnos/TurnoRow.tsx
################################
mkf "${BASE}/turnos/TurnoRow.tsx" $'
import { TurnoAdmin } from "../lib/types"
import BadgeEstado from "../ui/BadgeEstado"
import { utcTimeToLocalHM } from "../lib/date"

export default function TurnoRow({ t, actions, highlight=false }:{
  t: TurnoAdmin; actions?: React.ReactNode; highlight?: boolean
}) {
  return (
    <tr className={`${highlight?"ring-2 ring-indigo-300":""} hover:bg-slate-50 dark:hover:bg-slate-800`}>
      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">#{t.id}</td>
      <td className="px-3 py-2">{utcTimeToLocalHM(t.hora)}</td>
      <td className="px-3 py-2"><BadgeEstado estado={t.estado}/></td>
      <td className="px-3 py-2 capitalize">{t.operacion || ""}</td>
      <td className="px-3 py-2">{t.tipo_vehiculo_turno || ""}</td>
      <td className="px-3 py-2">
        <div className="font-medium text-slate-900 dark:text-slate-100">{t.conductor?.nombre ?? "-"}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{t.conductor?.cedula ?? ""}</div>
      </td>
      <td className="px-3 py-2">{t.conductor?.telefono ?? "-"}</td>
      <td className="px-3 py-2">{actions}</td>
    </tr>
  )
}
'

################################
# turnos/TurnoActions.tsx
################################
mkf "${BASE}/turnos/TurnoActions.tsx" $'
import { TurnoAdmin } from "../lib/types"
import { canRegistrarLlegada, canIniciar, canFinalizar, canCancelar } from "../lib/turnoActions"
import { SuccessButton, MutedButton, DangerButton, PrimaryButton } from "../ui/Buttons"

export default function TurnoActions({
  t, onRegistrarLlegada, onIniciar, onFinalizar, onCancelar, onMover
}:{
  t: TurnoAdmin
  onRegistrarLlegada: (t:TurnoAdmin)=>void
  onIniciar: (t:TurnoAdmin)=>void
  onFinalizar: (t:TurnoAdmin)=>void
  onCancelar: (t:TurnoAdmin)=>void
  onMover: (t:TurnoAdmin)=>void
}) {
  const e = (t.estado||"").toLowerCase()
  return (
    <div className="flex flex-wrap gap-2">
      <SuccessButton disabled={!canRegistrarLlegada(e)} onClick={()=>onRegistrarLlegada(t)}>Registrar llegada</SuccessButton>
      <PrimaryButton disabled={!canIniciar(e)} onClick={()=>onIniciar(t)}>Iniciar proceso</PrimaryButton>
      <MutedButton disabled={!canFinalizar(e)} onClick={()=>onFinalizar(t)}>Finalizar</MutedButton>
      <DangerButton disabled={!canCancelar(e)} onClick={()=>onCancelar(t)}>Cancelar</DangerButton>
      <PrimaryButton className="bg-indigo-600 hover:bg-indigo-700" onClick={()=>onMover(t)}>Mover</PrimaryButton>
    </div>
  )
}
'

################################
# turnos/TurnosTable.tsx
################################
mkf "${BASE}/turnos/TurnosTable.tsx" $'
import { TurnoAdmin } from "../lib/types"
import TurnoRow from "./TurnoRow"
import useRowSwap from "./dnd/useRowSwap"

export default function TurnosTable({
  turnos, onSwapRequest, renderActions
}:{
  turnos: TurnoAdmin[]
  onSwapRequest: (a:TurnoAdmin, b:TurnoAdmin)=>void
  renderActions: (t:TurnoAdmin)=>React.ReactNode
}) {
  const dnd = useRowSwap(onSwapRequest)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Hora</th>
            <th className="text-left px-3 py-2">Estado</th>
            <th className="text-left px-3 py-2">Operación</th>
            <th className="text-left px-3 py-2">Vehículo</th>
            <th className="text-left px-3 py-2">Conductor</th>
            <th className="text-left px-3 py-2">Teléfono</th>
            <th className="text-left px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {turnos.length===0 && (
            <tr><td colSpan={8} className="px-3 py-5 text-center text-slate-500 dark:text-slate-400">Sin turnos.</td></tr>
          )}
          {turnos.map(t=>(
            <tr key={t.id}
                {...dnd.rowProps(t, turnos)}
                className={`${dnd.isOver(t.id)?"ring-2 ring-indigo-300":""} hover:bg-slate-50 dark:hover:bg-slate-800`}>
              <TurnoRow t={t} actions={renderActions(t)} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
'

################################
# turnos/TurnosBoard.tsx
################################
mkf "${BASE}/turnos/TurnosBoard.tsx" $'
import Card from "../ui/Card"
import { TurnoAdmin } from "../lib/types"
import TurnosTable from "./TurnosTable"

export default function TurnosBoard({
  normal, cajaRapida, renderActions, onSwapRequest
}:{
  normal: TurnoAdmin[]; cajaRapida: TurnoAdmin[];
  renderActions: (t:TurnoAdmin)=>React.ReactNode
  onSwapRequest: (a:TurnoAdmin, b:TurnoAdmin)=>void
}) {
  return (
    <>
      <Card title="Turnos — Normal" extra={`Total: ${normal.length}`}>
        <TurnosTable turnos={normal} renderActions={renderActions} onSwapRequest={onSwapRequest}/>
      </Card>
      <Card title="Turnos — Caja rápida (SEN)" className="mt-4" extra={`Total: ${cajaRapida.length}`}>
        <TurnosTable turnos={cajaRapida} renderActions={renderActions} onSwapRequest={onSwapRequest}/>
      </Card>
    </>
  )
}
'

################################
# turnos/modals
################################
mkf "${BASE}/turnos/modals/MoveTurnoModal.tsx" $'
\'use client\'
export default function MoveTurnoModal({
  open, onClose, onConfirm, moveFecha, setMoveFecha, moveHora, setMoveHora, turnoId
}:{
  open:boolean; onClose: ()=>void; onConfirm: ()=>void;
  moveFecha:string; setMoveFecha:(v:string)=>void;
  moveHora:string; setMoveHora:(v:string)=>void;
  turnoId:number|string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold">Mover turno #{turnoId}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nueva fecha</div>
            <input type="date" className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
                   value={moveFecha} onChange={e=>setMoveFecha(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nueva hora</div>
            <input type="time" className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
                   value={moveHora} onChange={e=>setMoveHora(e.target.value)} step={3600}/>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Mover</button>
        </div>
      </div>
    </div>
  )
}
'

mkf "${BASE}/turnos/modals/FinishConfirmModal.tsx" $'
\'use client\'
export default function FinishConfirmModal({
  open, onClose, onConfirm, resumen
}:{
  open:boolean; onClose: ()=>void; onConfirm: ()=>void; resumen?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[75]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold">Confirmar finalización</h3>
        <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{resumen}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-slate-700 text-white">Confirmar</button>
        </div>
      </div>
    </div>
  )
}
'

mkf "${BASE}/turnos/modals/SwapConfirmModal.tsx" $'
\'use client\'
export default function SwapConfirmModal({
  open, onClose, onConfirm, a, b, renderInfo
}:{ open:boolean; onClose:()=>void; onConfirm:()=>void; a:any; b:any; renderInfo:(x:any)=>React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[76]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold">Intercambiar horas</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">¿Quieres intercambiar estos turnos?</p>
        <div className="mt-3 text-sm text-slate-700 dark:text-slate-200 space-y-1">
          <div>{renderInfo(a)}</div>
          <div>{renderInfo(b)}</div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Confirmar intercambio</button>
        </div>
      </div>
    </div>
  )
}
'

################################
# lib/turnoActions.ts (solo si no existe, respeta tu versión actual)
################################
mkf "${BASE}/lib/turnoActions.ts" $'
import { postJSON, loadSession } from "../../lib/api"

type ApiOk<T = any> = { message?: string; turno?: T }
type ApiErr = { error: string }
type ApiRes<T = any> = ApiOk<T> | ApiErr

function usuarioActual() {
  const u = loadSession()
  return u?.cedula || "admin"
}
export async function apiRegistrarLlegada(turnoId: number): Promise<ApiRes> {
  return postJSON("/api/turnos/registrar-llegada", { turnoId, usuario: usuarioActual() })
}
export async function apiIniciarProceso(turnoId: number): Promise<ApiRes> {
  return postJSON("/api/turnos/iniciar", { turnoId, usuario: usuarioActual() })
}
export async function apiFinalizarTurno(turnoId: number): Promise<ApiRes> {
  return postJSON("/api/turnos/finalizar", { turnoId, usuario: usuarioActual() })
}
export async function apiCancelarTurno(turnoId: number): Promise<ApiRes> {
  return postJSON("/api/turnos/cancelar", { turnoId, usuario: usuarioActual() })
}
export async function apiReprogramarTurno(args: {
  turnoId: number; conductorId?: number; nuevaFecha: string; nuevaHora: string;
  tipo_vehiculo?: string | null; operacion?: string | null; actualizarTipoVehiculo?: boolean;
}): Promise<ApiRes> {
  return postJSON("/api/turnos/reprogramar", {
    turnoId: args.turnoId, conductorId: args.conductorId, nuevaFecha: args.nuevaFecha, nuevaHora: args.nuevaHora,
    tipo_vehiculo: args.tipo_vehiculo, operacion: args.operacion, actualizarTipoVehiculo: !!args.actualizarTipoVehiculo,
  })
}
export async function apiIntercambiarHora(turnoAId: number, turnoBId: number) {
  return postJSON("/api/turnos/intercambiar-hora", { turnoAId, turnoBId, usuario: usuarioActual() })
}
export function canSwap(estado?: string | null) {
  const e = (estado||"").toLowerCase(); return e==="pendiente" || e==="confirmado"
}
export function canRegistrarLlegada(estado?: string | null) { return (estado||"").toLowerCase()==="pendiente" }
export function canIniciar(estado?: string | null) { return (estado||"").toLowerCase()==="confirmado" }
export function canFinalizar(estado?: string | null) { return (estado||"").toLowerCase()==="en_proceso" }
export function canCancelar(estado?: string | null) { return (estado||"").toLowerCase()!=="cancelado" }
'

note "✅ Listo. Estructura y archivos base creados (sin sobrescribir existentes)."
note "Siguiente paso: ir moviendo lógica a hooks/componentes y conectar estos bloques."
