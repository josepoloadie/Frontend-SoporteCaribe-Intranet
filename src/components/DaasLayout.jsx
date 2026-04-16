import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useImportStore } from '../store/importStore'
import { ArrowLeft } from 'lucide-react'

const NAV = [
  { section:'Principal' },
  { to:'/intranet/daas',           icon:'◈', label:'Dashboard' },
  { to:'/intranet/daas/equipos',   icon:'⬡', label:'Equipos Donantes' },
  { to:'/intranet/daas/componentes',icon:'◧', label:'Componentes' },
  { section:'Operaciones' },
  { to:'/intranet/daas/movimientos',icon:'⇄', label:'Movimientos' },
  { to:'/intranet/daas/reportes',  icon:'◎', label:'Reportes' },
  { section:'Herramientas' },
  { to:'/intranet/daas/partsurfer',icon:'⊕', label:'PartSurfer' },
]

export default function DaasLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { progreso, seleccionPendiente, limpiar } = useImportStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 w-[240px] bg-white border-r border-gray-200 flex flex-col z-50 shadow-lg
        transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Header sidebar */}
        <div className="px-4 py-4 border-b border-gray-200" style={{background:'linear-gradient(135deg, #004A97 0%, #0084CB 100%)'}}>
          <img src="/logos/LetrasSoporteCaribeBlancas.png" alt="Soporte Caribe"
            className="h-9 object-contain mb-2" onError={e => e.target.style.display='none'} />
          <div className="text-[10px] text-white/70 font-medium tracking-widest uppercase">DAAS Control</div>
        </div>

        {/* Volver al dashboard */}
        <button onClick={() => navigate('/intranet/dashboard')}
          className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500 hover:text-[#004A97] hover:bg-blue-50 transition-colors border-b border-gray-100">
          <ArrowLeft size={13} /> Volver a Intranet
        </button>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map((item, i) => item.section
            ? <div key={i} className="px-4 pt-4 pb-1 text-[10px] tracking-widest uppercase text-gray-400 font-semibold">{item.section}</div>
            : <NavLink key={item.to} to={item.to} end={item.to === '/intranet/daas'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-lg text-sm transition-all ${
                    isActive ? 'bg-[#004A97]/10 text-[#004A97] font-semibold border-l-2 border-[#004A97]'
                             : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}>
                <span className="text-base w-5 text-center">{item.icon}</span>{item.label}
              </NavLink>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs font-semibold text-gray-900 truncate">{user?.nombre}</div>
          <div className="text-xs text-gray-400 truncate mb-2">{user?.email}</div>
          <button onClick={() => { logout(); navigate('/intranet/login') }}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            Cerrar sesión →
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen md:ml-[240px]">
        {/* Topbar móvil */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logos/LetrasSoporteCaribe.png" alt="Soporte Caribe" className="h-8 object-contain"
            onError={e => e.target.style.display='none'} />
          <div className="w-8" />
        </div>
        <main className="flex-1"><Outlet /></main>
      </div>

      {/* Modal selección PS */}
      {seleccionPendiente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="font-bold text-gray-900">Selecciona el modelo correcto</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Serial <span className="font-mono font-bold text-[#004A97]">{seleccionPendiente.serial}</span>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {seleccionPendiente.opciones.map(op => (
                <button key={op.value} onClick={() => seleccionPendiente.resolve(op.value)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#0084CB] hover:bg-blue-50 transition-all cursor-pointer">
                  <div className="font-mono font-bold text-[#004A97] text-sm">{op.value}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{op.label.split(' - ').slice(1).join(' - ')}</div>
                </button>
              ))}
              <button onClick={() => seleccionPendiente.resolve(null)}
                className="w-full text-left text-sm text-gray-400 hover:text-red-500 px-4 py-2 transition-colors">
                Omitir este equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel progreso */}
      {progreso && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-[420px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-gray-900 text-sm">
              {progreso.fin ? '✓ Importación completada' : `Procesando ${progreso.actual} de ${progreso.total}...`}
            </div>
            {progreso.fin && <button onClick={limpiar} className="text-gray-400 hover:text-red-500 text-lg">✕</button>}
          </div>
          {!progreso.fin && progreso.procesando && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-[#0084CB]">
              ⏳ {progreso.procesando}
            </div>
          )}
          <div className="max-h-[200px] overflow-y-auto p-3 space-y-1">
            {progreso.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={item.tipo==='ok' ? 'text-green-600' : item.tipo==='sin_partes' ? 'text-yellow-600' : 'text-red-500'}>
                  {item.tipo==='ok' ? '✓' : item.tipo==='sin_partes' ? '—' : '✗'}
                </span>
                <span className="font-mono text-gray-500 text-xs">{item.serial}</span>
                <span className="text-gray-400 text-xs truncate">
                  {item.tipo==='ok' ? `${item.partes} partes · ${item.modelo}` : item.msg}
                </span>
              </div>
            ))}
          </div>
          {progreso.fin && (
            <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500 bg-gray-50">
              ✓ {progreso.items.filter(i=>i.tipo==='ok').length} ·
              — {progreso.items.filter(i=>i.tipo==='sin_partes').length} ·
              ✗ {progreso.items.filter(i=>['error','ps_error'].includes(i.tipo)).length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
