'use client'

import { X, SlidersHorizontal, RefreshCw, Settings, CalendarDays, Filter, Car, BarChart3 } from 'lucide-react'
import { useMemo } from 'react'

const VEH_TYPES = ['todos','SEN','TM','CB','DLL','XL','MM'] as const

export default function AdminSidebar({
  openMobile, onCloseMobile,
  collapsed, onToggleCollapsed,
  fecha, setFecha,
  estado, setEstado,
  filtroTipo, setFiltroTipo,
  kpis, onRefrescar, onParametros,
}:{
  openMobile: boolean; onCloseMobile: ()=>void
  collapsed: boolean; onToggleCollapsed: ()=>void
  fecha: string; setFecha: (v:string)=>void
  estado: string; setEstado: (v:any)=>void
  filtroTipo: string; setFiltroTipo: (v:string)=>void
  kpis: { total:number; confirmado:number; pendiente:number; cancelado:number; finalizado:number; porTipo: Record<string,{total:number,confirmado:number,pendiente:number}> }
  onRefrescar: ()=>void
  onParametros: ()=>void
}) {

  // ancho según colapso
  const widthCls = useMemo(() => collapsed ? 'lg:w-[72px]' : 'lg:w-[300px]', [collapsed])

  // CONTENIDO (lo reusamos en mobile/desktop)
  const content = (
    <div className="h-full flex flex-col">
      {/* Header mini */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-slate-900" size={18}/>
          {!collapsed && <span className="text-slate-900 font-semibold">Panel</span>}
        </div>
        {/* Cerrar en mobile */}
        <button onClick={onCloseMobile} className="lg:hidden p-2 rounded-md hover:bg-slate-100">
          <X size={18}/>
        </button>
      </div>

      {/* Filtros */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <SectionTitle collapsed={collapsed} icon={<CalendarDays size={16}/> } title="Fecha" />
        <div className="space-y-2">
          <input
            type="date"
            className={`w-full border border-slate-300 rounded-lg px-3 py-2 ${collapsed?'pointer-events-none opacity-0 h-0 p-0 m-0':'opacity-100'}`}
            value={fecha}
            onChange={e=>setFecha(e.target.value)}
          />
        </div>

        <SectionTitle collapsed={collapsed} icon={<Filter size={16}/> } title="Estado" />
        <select
          className={`w-full border border-slate-300 rounded-lg px-3 py-2 ${collapsed?'pointer-events-none opacity-0 h-0 p-0 m-0':'opacity-100'}`}
          value={estado}
          onChange={e=>setEstado(e.target.value)}
        >
          {['todos','pendiente','confirmado','cancelado','finalizado'].map(x => <option key={x} value={x}>{cap(x)}</option>)}
        </select>

        <SectionTitle collapsed={collapsed} icon={<Car size={16}/> } title="Tipo de vehículo" />
        <select
          className={`w-full border border-slate-300 rounded-lg px-3 py-2 ${collapsed?'pointer-events-none opacity-0 h-0 p-0 m-0':'opacity-100'}`}
          value={filtroTipo}
          onChange={e=>setFiltroTipo(e.target.value)}
        >
          {VEH_TYPES.map(x => <option key={x} value={x}>{x==='todos'?'Todos':x}</option>)}
        </select>

        {/* Acciones */}
        {!collapsed && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={onRefrescar} className="rounded-xl px-3 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex items-center justify-center gap-2">
              <RefreshCw size={16}/> Refrescar
            </button>
            <button onClick={onParametros} className="rounded-xl px-3 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
              <Settings size={16}/> Parámetros
            </button>
          </div>
        )}

        {/* KPIs */}
        <SectionTitle collapsed={collapsed} icon={<SlidersHorizontal size={16}/>} title="Indicadores" />
        <div className={`grid ${collapsed?'grid-cols-1':'grid-cols-2'} gap-2`}>
          <SmallKPI title="Total" value={kpis.total} tone="dark" collapsed={collapsed}/>
          <SmallKPI title="Conf." value={kpis.confirmado} tone="emerald" collapsed={collapsed}/>
          <SmallKPI title="Pend." value={kpis.pendiente} tone="amber" collapsed={collapsed}/>
          <SmallKPI title="Canc." value={kpis.cancelado} tone="rose" collapsed={collapsed}/>
          <SmallKPI title="Final." value={kpis.finalizado} tone="slate" collapsed={collapsed}/>
        </div>

        {/* Por tipo */}
        <SectionTitle collapsed={collapsed} icon={<Car size={16}/>} title="Por tipo" />
        {!collapsed ? (
          <div className="space-y-1">
            {Object.entries(kpis.porTipo).map(([tipo,v]) => (
              <div key={tipo} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-2 py-1">
                <span className="font-medium text-slate-700">{tipo}</span>
                <span className="text-slate-600">T:{v.total} • C:{v.confirmado} • P:{v.pendiente}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(kpis.porTipo).map(([tipo,v]) => (
              <span key={tipo} className="text-[11px] text-slate-700 bg-slate-100 rounded px-2 py-1 text-center" title={`T:${v.total} • C:${v.confirmado} • P:${v.pendiente}`}>
                {tipo}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer mini (desktop) */}
      <div className="hidden lg:block p-3 border-t border-slate-200">
        <button
          onClick={onToggleCollapsed}
          className="w-full rounded-lg px-3 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 text-sm"
        >
          {collapsed ? 'Expandir panel' : 'Colapsar panel'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop fijo */}
      <aside
        className={`hidden lg:flex sticky top-0 h-[calc(100vh-0px)] bg-white border-r border-slate-200 ${widthCls} transition-[width] duration-200`}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-0 z-50 ${openMobile ? '' : 'pointer-events-none'}`}>
        {/* overlay */}
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-black/40 transition-opacity ${openMobile ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* drawer */}
        <aside
          className={`absolute left-0 top-0 h-full w-[88%] max-w-[320px] bg-white border-r border-slate-200 transform transition-transform ${openMobile ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {content}
        </aside>
      </div>
    </>
  )
}

function SectionTitle({collapsed, icon, title}:{collapsed:boolean; icon:React.ReactNode; title:string}) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-1">
      <span className="text-slate-700">{icon}</span>
      {!collapsed && <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</span>}
    </div>
  )
}

function cap(s: string){ return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase() }

function SmallKPI({
  title, value, tone, collapsed
}:{title:string; value:number|string; tone:'dark'|'emerald'|'amber'|'rose'|'slate'; collapsed:boolean}) {
  const cls =
    tone==='dark'   ? 'bg-slate-900 text-white' :
    tone==='emerald'? 'bg-emerald-600 text-white' :
    tone==='amber'  ? 'bg-amber-500 text-white' :
    tone==='rose'   ? 'bg-rose-600 text-white' : 'bg-slate-600 text-white'
  return (
    <div className={`rounded-xl ${collapsed?'px-2 py-2':'p-3'} text-center ${cls}`}>
      {!collapsed && <div className="text-[11px] uppercase tracking-wider opacity-90">{title}</div>}
      <div className={`${collapsed?'text-base':'text-xl'} font-bold`}>{value}</div>
    </div>
  )
}
