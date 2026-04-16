import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import {
  Package, ArrowLeftRight, BarChart3, Wrench, Users,
  Settings, FileText, ChevronRight
} from 'lucide-react'

// Módulos disponibles — agregar aquí nuevos módulos a futuro
const MODULOS = [
  {
    id: 'daas',
    nombre: 'DAAS — Inventario',
    descripcion: 'Gestión de equipos donantes, componentes y movimientos HP DAAS.',
    ruta: '/intranet/daas',
    icono: Package,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    roles: ['ADMIN', 'TECNICO'],
  },
  // Futuros módulos:
  // { id: 'tickets', nombre: 'Tickets', descripcion: '...', ruta: '/intranet/tickets', icono: FileText, roles: ['ADMIN','TECNICO'] },
  // { id: 'usuarios', nombre: 'Usuarios', descripcion: '...', ruta: '/intranet/usuarios', icono: Users, roles: ['ADMIN'] },
]

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const modulosDisponibles = MODULOS.filter(m =>
    m.roles.includes(user?.rol?.toUpperCase() || user?.rol)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logos/LetrasSoporteCaribe.png" alt="Soporte Caribe"
              className="h-9 object-contain" onError={e => e.target.style.display='none'} />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">Intranet</div>
              <div className="text-xs text-gray-400">Soporte Caribe LTDA</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-gray-900">{user?.nombre}</div>
              <div className="text-xs text-gray-400">{user?.rol}</div>
            </div>
            <button onClick={() => { logout(); navigate('/intranet/login') }}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            Bienvenido, {user?.nombre?.split(' ')[0]} 👋
          </div>
          <div className="text-gray-500 text-sm">
            Selecciona un módulo para continuar
          </div>
        </div>

        {modulosDisponibles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Settings className="mx-auto mb-3 opacity-40" size={40} />
            <div className="text-sm">No tienes módulos asignados. Contacta al administrador.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modulosDisponibles.map(mod => {
              const Icon = mod.icono
              return (
                <div key={mod.id}
                  onClick={() => navigate(mod.ruta)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#0084CB] transition-all cursor-pointer group p-6">
                  <div className={`inline-flex p-3 rounded-xl border mb-4 ${mod.color}`}>
                    <Icon size={22} />
                  </div>
                  <div className="font-bold text-gray-900 mb-1 group-hover:text-[#004A97] transition-colors">
                    {mod.nombre}
                  </div>
                  <div className="text-sm text-gray-500 mb-4 leading-relaxed">{mod.descripcion}</div>
                  <div className="flex items-center text-xs font-semibold text-[#0084CB] gap-1">
                    Abrir módulo <ChevronRight size={14} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
