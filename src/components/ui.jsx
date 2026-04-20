// Modal
export function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-[720px]' : 'max-w-[540px]'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray3 rounded-t-2xl">
          <div className="font-bold text-t1 text-base">{title}</div>
          <button onClick={onClose} className="text-t3 hover:text-danger text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all">✕</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-border bg-gray3 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  )
}

// Badge
const BADGE_MAP = {
  BUENO:'ok', INSTALADO:'ok', RECIBIDO:'ok',
  EN_REVISION:'warn', EN_CAMINO:'warn', INCOMPLETO:'warn',
  EN_USO:'info', EN_TRANSITO:'info', ABIERTO:'info', TEMPORAL:'info', ENTREGADO:'info',
  DANADO:'danger', PENDIENTE_DEVOLUCION_COMP:'danger', CON_FALLAS:'danger',
  PENDIENTE_REPOSICION:'orange', EN_ESPERA:'warn',
  CERRADO:'gray', NA:'gray', BAJA:'gray',
  DEFINITIVO:'purple', PENDIENTE_DEVOLUCION:'purple',
  COMPLETO:'ok', PRESTADO:'info',
  INSTALACION:'info', RETIRO:'purple', DEVOLUCION:'ok', REEMPLAZO:'warn', INGRESO:'ok',
  LAPTOP:'gray', DESKTOP:'gray', AIO:'gray', MONITOR:'gray', IMPRESORA:'gray',
  SSD:'gray', RAM:'gray', PANTALLA:'gray', BATERIA:'gray', BOARD:'gray', TECLADO:'gray', OTRO:'gray',
  ADMIN:'info', TECNICO:'gray',
}
const LABEL_MAP = {
  BUENO:'✓ Bueno', INSTALADO:'✓ Instalado', RECIBIDO:'✓ Recibido',
  EN_REVISION:'⚙ En revisión', EN_CAMINO:'⏳ En camino',
  EN_USO:'⇄ En uso', EN_TRANSITO:'⇄ En tránsito', ABIERTO:'● Abierto', TEMPORAL:'⇄ Temporal',
  DANADO:'⚠ Dañado', PENDIENTE_REPOSICION:'⬒ Pend. reposición',
  CERRADO:'✓ Cerrado', NA:'—', DEFINITIVO:'◆ Definitivo',
  COMPLETO:'✓ Completo', CON_FALLAS:'⚠ Con fallas', PRESTADO:'⇄ Prestado',
  INCOMPLETO:'◌ Incompleto', BAJA:'✕ Baja',
  ENTREGADO:'⇄ Entregado', EN_ESPERA:'⏳ En espera repuesto',
  INSTALACION:'⬇ Instalación', RETIRO:'⬆ Retiro', DEVOLUCION:'↩ Devolución', REEMPLAZO:'⇄ Reemplazo', INGRESO:'⊕ Ingreso',
  LAPTOP:'Laptop', DESKTOP:'Desktop', AIO:'AiO', MONITOR:'Monitor', IMPRESORA:'Impresora',
  SSD:'SSD', RAM:'RAM', PANTALLA:'Pantalla', BATERIA:'Batería', BOARD:'Board', TECLADO:'Teclado', OTRO:'Otro',
  ADMIN:'Admin', TECNICO:'Técnico',
}
export function Badge({ value }) {
  const v = (value || '').toUpperCase()
  const cls = BADGE_MAP[v] || 'gray'
  const text = LABEL_MAP[v] || value
  return <span className={`badge-${cls}`}>{text}</span>
}

// StatCard
export function StatCard({ label, value, sub, color='blue', icon }) {
  const colors = {
    blue:   'border-l-primary bg-blue-50 text-primary',
    green:  'border-l-ok bg-green-50 text-ok',
    yellow: 'border-l-warn bg-yellow-50 text-warn',
    red:    'border-l-danger bg-red-50 text-danger',
  }
  const [bg, tc] = [colors[color] || colors.blue]
  return (
    <div className={`bg-white rounded-xl border border-border shadow-sm border-l-4 ${colors[color]} overflow-hidden`}>
      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-t3 mb-2">{label}</div>
        <div className={`text-3xl font-bold mb-1 ${colors[color].split(' ').pop()}`}>{value ?? '—'}</div>
        {sub && <div className="text-sm text-t3">{sub}</div>}
      </div>
    </div>
  )
}

// PageHeader
export function PageHeader({ title, actions, subtitle }) {
  return (
    <div className="bg-white border-b border-border sticky top-0 md:top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-4">
        <div>
          <div className="font-bold text-t1 text-lg leading-tight">{title}</div>
          {subtitle && <div className="text-sm text-t3 mt-0.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">{actions}</div>}
      </div>
    </div>
  )
}

// SearchBox
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-border2 rounded-lg px-3 py-2.5 min-w-[180px] shadow-sm focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all">
      <span className="text-t3 text-sm">⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Buscar...'}
        className="bg-transparent outline-none text-t1 text-sm w-full placeholder:text-t3" />
    </div>
  )
}

// FormGroup
export function FormGroup({ label, children, hint }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <div className="text-xs text-t3 mt-1.5">{hint}</div>}
    </div>
  )
}

// Spinner
export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-3 border-gray4 border-t-primary rounded-full animate-spin" style={{borderWidth:'3px'}} />
      <div className="text-sm text-t3">Cargando...</div>
    </div>
  )
}

// EmptyState
export function EmptyState({ msg = 'Sin resultados', icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-4xl">{icon}</div>
      <div className="text-sm text-t3 font-medium">{msg}</div>
    </div>
  )
}

// Timeline
const TL = {
  INSTALACION: { dot:'border-ok',      bg:'bg-green-50',  icon:'⬇' },
  RETIRO:      { dot:'border-danger',  bg:'bg-red-50',    icon:'⬆' },
  DEVOLUCION:  { dot:'border-primary', bg:'bg-blue-50',   icon:'↩' },
  REEMPLAZO:   { dot:'border-warn',    bg:'bg-yellow-50', icon:'⇄' },
  INGRESO:     { dot:'border-purple',  bg:'bg-purple-50', icon:'⊕' },
}
export function Timeline({ movimientos = [] }) {
  if (!movimientos.length) return <EmptyState msg="Sin movimientos registrados" icon="📋" />
  return (
    <div className="space-y-0">
      {movimientos.map((m, i) => {
        const t = TL[m.tipo_movimiento] || { dot:'border-gray5', bg:'bg-gray3', icon:'·' }
        return (
          <div key={m.id} className="flex gap-4 pb-6 relative">
            {i < movimientos.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border2" />}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 ${t.dot} ${t.bg}`}>
              {t.icon}
            </div>
            <div className="flex-1 pt-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge value={m.tipo_movimiento} />
                {m.uso_tipo && m.uso_tipo !== 'NA' && <Badge value={m.uso_tipo} />}
                <Badge value={m.status} />
              </div>
              <div className="text-xs text-t3">{m.usuario?.nombre} · {new Date(m.creado_en).toLocaleString('es-CO')}</div>
              {m.numero_caso && <div className="text-xs text-primary font-medium mt-0.5">Caso: {m.numero_caso}</div>}
              {(m.origen || m.destino) && <div className="text-xs text-t2 mt-0.5">{m.origen?.serial || 'BODEGA'} → {m.destino?.serial || 'BODEGA'}</div>}
              {m.observaciones && <div className="text-xs text-t3 mt-1 italic">{m.observaciones}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}