import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { equipos as api, componentes as compApi, reportes } from '../../services/api'
import { PageHeader, Badge, Timeline, Spinner, EmptyState, Modal, FormGroup } from '../../components/ui'

const TABS = ['Resumen','Config. Original HP','Componentes Actuales','Historial']
const ESTADOS_COMP = [
  { value: 'BUENO',                label: 'Bueno' },
  { value: 'DANADO',               label: 'Dañado' },
  { value: 'EN_USO',               label: 'En uso' },
  { value: 'EN_REVISION',          label: 'En revisión' },
  { value: 'PENDIENTE_DEVOLUCION', label: 'Pendiente devolución' },
  { value: 'PENDIENTE_REPOSICION', label: 'Pendiente reposición' },
]

function SortTh({ children, field, sort, onSort }) {
  const active = sort.col === field
  return (
    <th className="th cursor-pointer select-none hover:text-t1 transition-colors" onClick={() => onSort(field)}>
      <span className="flex items-center gap-1">
        {children}
        <span className={`text-[10px] ${active ? 'text-primary' : 'text-t3'}`}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}

function sortData(data, col, dir) {
  return [...(data || [])].sort((a, b) => {
    const av = (a[col] ?? '').toString().toLowerCase()
    const bv = (b[col] ?? '').toString().toLowerCase()
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })
}

function toggleSort(sort, setSort, field) {
  if (sort.col === field) setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
  else setSort({ col: field, dir: 'asc' })
}

export default function DetalleEquipo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [equipo, setEquipo]       = useState(null)
  const [historial, setHistorial] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState(0)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [menuAcciones, setMenuAcciones] = useState(false)
  const [confirmText, setConfirmText]     = useState('')
  const [procesando, setProcesando]       = useState(false)
  const [seleccion, setSeleccion]         = useState({})
  const [editandoConfig, setEditandoConfig]   = useState(false)
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [editandoEstado, setEditandoEstado]   = useState({})

  const [modalEditar, setModalEditar] = useState(false)
  const [formEditar, setFormEditar]   = useState({})
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const [configSort, setConfigSort] = useState({ col: 'part_number', dir: 'asc' })
  const [compSort,   setCompSort]   = useState({ col: 'part_number', dir: 'asc' })

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const e = await api.get(id)
      setEquipo(e.data)
      const detalles    = e.data.configuraciones?.[0]?.detalles || []
      const actualesPNs = e.data.componentes_actuales.map(c => c.part_number)
      const sel = {}
      detalles.forEach(d => { sel[`${d.part_number}_${d.id}`] = actualesPNs.includes(d.part_number) })
      setSeleccion(sel)
      // Historial por separado para no bloquear si falla
      try {
        const h = await reportes.historialEquipo(id)
        setHistorial(h.data)
      } catch { setHistorial([]) }
    } catch { toast.error('Error cargando equipo') }
    finally { setLoading(false) }
  }

  function abrirEditar() {
    setFormEditar({
      modelo:         equipo.modelo,
      product_number: equipo.product_number || '',
      tipo_equipo:    equipo.tipo_equipo,
      cliente:        equipo.cliente || '',
      observaciones:  equipo.observaciones || '',
    })
    setModalEditar(true)
  }

  async function guardarEditar() {
    setGuardandoEdit(true)
    try {
      await api.update(id, formEditar)
      toast.success('Equipo actualizado')
      setModalEditar(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error guardando') }
    finally { setGuardandoEdit(false) }
  }

  async function guardarSeleccion() {
    setGuardandoConfig(true)
    try {
      const detalles    = equipo.configuraciones?.[0]?.detalles || []
      const actuales    = equipo.componentes_actuales || []
      const actualesPNs = actuales.map(c => c.part_number)
      const seleccionados   = detalles.filter(d =>  seleccion[`${d.part_number}_${d.id}`])
      const deseleccionados = detalles.filter(d => !seleccion[`${d.part_number}_${d.id}`])
      const aNuevos = seleccionados.filter(d => !actualesPNs.includes(d.part_number))
      for (const d of aNuevos) {
        await compApi.create({ part_number: d.part_number, descripcion: d.descripcion, categoria: d.categoria || 'OTRO', estado: 'BUENO', equipo_actual_id: id })
      }
      const pnsDesel = deseleccionados.map(d => d.part_number)
      const aQuitar  = actuales.filter(c => pnsDesel.includes(c.part_number))
      let quitados = 0, conMovs = 0
      for (const c of aQuitar) {
        try { await compApi.eliminar(c.id); quitados++ } catch { conMovs++ }
      }
      let msg = 'Componentes actualizados'
      if (aNuevos.length) msg += ` · +${aNuevos.length} agregado(s)`
      if (quitados)       msg += ` · -${quitados} quitado(s)`
      if (conMovs)        msg += ` · ${conMovs} con movimientos (no se quitaron)`
      toast.success(msg)
      setEditandoConfig(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error guardando') }
    finally { setGuardandoConfig(false) }
  }

  async function cambiarEstado(compId, nuevoEstado) {
    try {
      await compApi.update(compId, { estado: nuevoEstado })
      toast.success('Estado actualizado')
      load()
    } catch { toast.error('Error actualizando estado') }
  }

  async function handleArchivar() {
    if (!confirm('¿Archivar este equipo?')) return
    setProcesando(true)
    try { await api.archivar(id); toast.success('Equipo archivado'); navigate('/intranet/daas/equipos') }
    catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setProcesando(false) }
  }

  async function handleEliminar() {
    if (confirmText !== equipo.serial) return toast.error('El serial no coincide')
    setProcesando(true)
    try { await api.eliminar(id); toast.success('Equipo eliminado'); navigate('/intranet/daas/equipos') }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); setProcesando(false) }
  }

  if (loading) return <><PageHeader title="Detalle Equipo" /><Spinner /></>
  if (!equipo)  return <div className="p-7 text-danger">Equipo no encontrado</div>

  const configOriginal = equipo.configuraciones?.[0]?.detalles || []
  const actuales       = equipo.componentes_actuales || []
  const actualesPNs    = actuales.map(c => c.part_number)

  // Stats para resumen

  // Datos ordenables
  const configConActivo = configOriginal.map(d => ({
    ...d,
    activo:   seleccion[`${d.part_number}_${d.id}`] ? 'Activo' : 'Inactivo',
    presente: actualesPNs.includes(d.part_number) ? 'Sí' : 'No',
  }))
  const sortedConfig   = sortData(configConActivo, configSort.col, configSort.dir)
  const sortedActuales = sortData(actuales, compSort.col, compSort.dir)

  return (
    <>
      <PageHeader title={equipo.serial} actions={
        <div className="flex gap-2 items-center">
          <Link to="/intranet/daas/equipos" className="btn-ghost">← Volver</Link>
          <div className="relative">
            <button className="btn-primary" onClick={() => setMenuAcciones(m => !m)}>
              Acciones ▾
            </button>
            {menuAcciones && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-48 py-1" onClick={() => setMenuAcciones(false)}>
                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" onClick={abrirEditar}>✎ Editar</button>
                {equipo.estado !== 'BAJA' && (
                  <button className="w-full text-left px-4 py-2.5 text-sm text-yellow-600 hover:bg-yellow-50 transition-colors" onClick={handleArchivar} disabled={procesando}>⬒ Archivar</button>
                )}
                <hr className="my-1 border-gray-100" />
                <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => { setConfirmText(''); setModalEliminar(true) }}>✕ Eliminar</button>
              </div>
            )}
          </div>
        </div>
      } />

      <div className="p-4 md:p-7">
        <div className="card p-4 md:p-5 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><div className="label">Serial</div><div className="font-mono text-primary text-sm">{equipo.serial}</div></div>
            <div><div className="label">Modelo</div><div className="text-sm">{equipo.modelo}</div></div>
            <div><div className="label">Product #</div><div className="font-mono text-t2 text-sm">{equipo.product_number||'—'}</div></div>
            <div><div className="label">Tipo / Cliente</div><div className="text-sm text-t2">{equipo.tipo_equipo} · {equipo.cliente||'—'}</div></div>
            <div><div className="label">Estado</div><Badge value={equipo.estado} /></div>
          </div>
          {equipo.observaciones && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="label">Observaciones</div>
              <div className="text-xs text-t2 italic">{equipo.observaciones}</div>
            </div>
          )}
        </div>

        <div className="flex border-b border-border mb-5">
          {TABS.map((t,i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-xs transition-all border-b-2 -mb-px ${i===tab?'text-primary border-accent':'text-t2 border-transparent hover:text-t1'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab 0: Resumen */}
        {tab===0 && (() => {
          const stats = [
            { label: 'Config. Original',        value: configOriginal.length, sub: 'partes en PartSurfer',        color: 'text-primary',  items: [] },
            { label: 'Buenas',                  value: actuales.filter(c=>c.estado==='BUENO').length,                sub: 'en buen estado',              color: 'text-ok',     items: actuales.filter(c=>c.estado==='BUENO') },
            { label: 'Dañadas',                 value: actuales.filter(c=>c.estado==='DANADO').length,               sub: 'requieren reposición',         color: 'text-danger', items: actuales.filter(c=>c.estado==='DANADO') },
            { label: 'En Uso',                  value: actuales.filter(c=>c.estado==='EN_USO').length,               sub: 'instaladas en cliente',        color: 'text-warn',   items: actuales.filter(c=>c.estado==='EN_USO') },
            { label: 'En Revisión',             value: actuales.filter(c=>c.estado==='EN_REVISION').length,          sub: 'pendientes de diagnóstico',    color: 'text-purple', items: actuales.filter(c=>c.estado==='EN_REVISION') },
            { label: 'Pend. Devolución',        value: actuales.filter(c=>c.estado==='PENDIENTE_DEVOLUCION').length, sub: 'deben ser retornadas',         color: 'text-warn',   items: actuales.filter(c=>c.estado==='PENDIENTE_DEVOLUCION') },
            { label: 'Pend. Reposición',        value: actuales.filter(c=>c.estado==='PENDIENTE_REPOSICION').length, sub: 'esperando repuesto HP',        color: 'text-danger', items: actuales.filter(c=>c.estado==='PENDIENTE_REPOSICION') },
          ]
          return (
            <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {stats.filter((s, i) => i === 0 || s.value > 0).map((s, i) => (
                <div key={i} className="card p-4">
                  <div className="label">{s.label}</div>
                  <div className={`font-display text-2xl font-bold ${s.value > 0 || i === 0 ? s.color : 'text-t3'}`}>{s.value}</div>
                  {s.items.length > 0
                    ? <div className="mt-2 flex flex-wrap gap-1">{s.items.slice(0,4).map((c,j) => <span key={j} className="tag">{c.part_number}</span>)}{s.items.length > 4 && <span className="tag text-t3">+{s.items.length-4}</span>}</div>
                    : <div className="text-xs text-t3 mt-1">{s.sub}</div>
                  }
                </div>
              ))}
            </div>
          )
        })()}

        {/* Tab 1: Config Original */}
        {tab===1 && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="font-display font-bold text-sm">Config. Original HP — PartSurfer</div>
                <div className="text-[10px] text-t3 mt-0.5">Activa o desactiva partes para controlar qué aparece en Componentes Actuales.</div>
              </div>
              <div className="flex gap-2">
                {!editandoConfig
                  ? <button className="btn-ghost" onClick={() => setEditandoConfig(true)}>✎ Editar</button>
                  : <>
                      <button className="btn-ghost text-[11px] px-3" onClick={() => {
                        const all = {}
                        configOriginal.forEach(d => { all[`${d.part_number}_${d.id}`] = true })
                        setSeleccion(all)
                      }}>✓ Todos</button>
                      <button className="btn-ghost text-[11px] px-3" onClick={() => {
                        const none = {}
                        configOriginal.forEach(d => { none[`${d.part_number}_${d.id}`] = false })
                        setSeleccion(none)
                      }}>✕ Ninguno</button>
                      <button className="btn-ghost" onClick={() => { setEditandoConfig(false); load() }}>Cancelar</button>
                      <button className="btn-primary" onClick={guardarSeleccion} disabled={guardandoConfig}>{guardandoConfig?'Guardando...':'Aplicar cambios'}</button>
                    </>
                }
              </div>
            </div>
            {configOriginal.length === 0
              ? <EmptyState msg="Sin configuración HP. Agrega el equipo desde PartSurfer." />
              : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th" style={{width:'50px'}}>Activo</th>
                      <SortTh field="part_number" sort={configSort} onSort={f => toggleSort(configSort, setConfigSort, f)}>Part Number</SortTh>
                      <SortTh field="descripcion"  sort={configSort} onSort={f => toggleSort(configSort, setConfigSort, f)}>Descripción</SortTh>
                      <SortTh field="categoria"    sort={configSort} onSort={f => toggleSort(configSort, setConfigSort, f)}>Categoría</SortTh>
                      <SortTh field="presente"     sort={configSort} onSort={f => toggleSort(configSort, setConfigSort, f)}>En Comp. Actuales</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedConfig.map((d, i) => {
                      const key    = `${d.part_number}_${d.id}`
                      const activo = !!seleccion[key]
                      return (
                        <tr key={i} className={`tr ${!activo ? 'opacity-40' : ''}`}>
                          <td className="td text-center">
                            {editandoConfig
                              ? <input type="checkbox" checked={activo}
                                  onChange={e => setSeleccion(s => ({ ...s, [key]: e.target.checked }))}
                                  className="cursor-pointer accent-cyan-400 w-4 h-4" />
                              : <span className={activo ? 'text-ok' : 'text-t3'}>{activo ? '✓' : '—'}</span>
                            }
                          </td>
                          <td className="td font-mono text-primary">{d.part_number}</td>
                          <td className="td text-t2">{d.descripcion}</td>
                          <td className="td"><span className="tag">{d.categoria}</span></td>
                          <td className="td">
                            {!activo
                              ? <span className="badge-gray">Inactivo</span>
                              : actualesPNs.includes(d.part_number)
                                ? <span className="badge-ok">✓ Sí</span>
                                : <span className="badge-warn">Pendiente</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* Tab 2: Componentes Actuales */}
        {tab===2 && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="font-display font-bold text-sm">Componentes Actuales</div>
                <div className="text-[10px] text-t3 mt-0.5">Haz clic en el estado para modificarlo. Haz clic en los encabezados para ordenar.</div>
              </div>
            </div>
            {actuales.length === 0
              ? <EmptyState msg='Sin componentes activos. Ve a "Config. Original HP", activa las partes y guarda.' />
              : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <SortTh field="part_number" sort={compSort} onSort={f => toggleSort(compSort, setCompSort, f)}>Part Number</SortTh>
                      <SortTh field="descripcion"  sort={compSort} onSort={f => toggleSort(compSort, setCompSort, f)}>Descripción</SortTh>
                      <SortTh field="ct"           sort={compSort} onSort={f => toggleSort(compSort, setCompSort, f)}>CT</SortTh>
                      <SortTh field="categoria"    sort={compSort} onSort={f => toggleSort(compSort, setCompSort, f)}>Categoría</SortTh>
                      <SortTh field="estado"       sort={compSort} onSort={f => toggleSort(compSort, setCompSort, f)}>Estado</SortTh>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedActuales.map(c => (
                      <tr key={c.id} className="tr">
                        <td className="td font-mono text-primary">{c.part_number}</td>
                        <td className="td text-t2">{c.descripcion}</td>
                        <td className="td font-mono text-t3">{c.ct||'—'}</td>
                        <td className="td"><span className="tag">{c.categoria}</span></td>
                        <td className="td">
                          {editandoEstado[c.id] !== undefined
                            ? (
                              <div className="flex gap-1.5 items-center">
                                <select className="input py-1 text-[11px] w-auto"
                                  value={editandoEstado[c.id]}
                                  onChange={e => setEditandoEstado(s => ({ ...s, [c.id]: e.target.value }))}>
                                  {ESTADOS_COMP.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                                <button className="btn-primary text-[10px] px-2 py-1"
                                  onClick={() => { cambiarEstado(c.id, editandoEstado[c.id]); setEditandoEstado(s => { const n={...s}; delete n[c.id]; return n }) }}>✓</button>
                                <button className="btn-ghost text-[10px] px-2 py-1"
                                  onClick={() => setEditandoEstado(s => { const n={...s}; delete n[c.id]; return n })}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditandoEstado(s => ({ ...s, [c.id]: c.estado }))}
                                className="flex items-center gap-1.5 group cursor-pointer">
                                <Badge value={c.estado} />
                                <span className="text-[9px] text-t3 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                              </button>
                            )
                          }
                        </td>
                        <td className="td">
                          <Link to={`/intranet/daas/componentes/${c.id}`} className="btn-ghost text-[11px] px-3 py-1.5">Ver →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* Tab 3: Historial */}
        {tab===3 && <div className="card p-4 md:p-6"><Timeline movimientos={historial?.historial||[]} /></div>}
      </div>

      {/* Modal Editar */}
      <Modal open={modalEditar} onClose={() => setModalEditar(false)} title="✎ Editar Equipo"
        footer={<>
          <button className="btn-ghost" onClick={() => setModalEditar(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardarEditar} disabled={guardandoEdit}>
            {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FormGroup label="Modelo">
            <input className="input" value={formEditar.modelo || ''} onChange={e => setFormEditar(f => ({ ...f, modelo: e.target.value }))} placeholder="HP EliteBook 840 G8" />
          </FormGroup>
          <FormGroup label="Product Number">
            <input className="input" value={formEditar.product_number || ''} onChange={e => setFormEditar(f => ({ ...f, product_number: e.target.value }))} placeholder="8B9C1AV" />
          </FormGroup>
          <FormGroup label="Tipo de equipo">
            <select className="input" value={formEditar.tipo_equipo || 'LAPTOP'} onChange={e => setFormEditar(f => ({ ...f, tipo_equipo: e.target.value }))}>
              <option value="LAPTOP">Laptop</option>
              <option value="DESKTOP">Desktop</option>
              <option value="AIO">AiO</option>
              <option value="MONITOR">Monitor</option>
              <option value="IMPRESORA">Impresora</option>
            </select>
          </FormGroup>
          <FormGroup label="Cliente">
            <input className="input" value={formEditar.cliente || ''} onChange={e => setFormEditar(f => ({ ...f, cliente: e.target.value }))} placeholder="HP DAAS Pool" />
          </FormGroup>
          <div className="col-span-2">
            <FormGroup label="Observaciones">
              <textarea className="input h-20 resize-none" value={formEditar.observaciones || ''} onChange={e => setFormEditar(f => ({ ...f, observaciones: e.target.value }))} placeholder="Notas sobre el equipo..." />
            </FormGroup>
          </div>
        </div>
      </Modal>

      <Modal open={modalEliminar} onClose={() => setModalEliminar(false)} title="✕ Eliminar Equipo Permanentemente"
        footer={<>
          <button className="btn-ghost" onClick={() => setModalEliminar(false)}>Cancelar</button>
          <button className="text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer border"
            style={{ background: confirmText.trim() === equipo.serial.trim() ? '#dc2626' : '#f1f5f9', color: confirmText.trim() === equipo.serial.trim() ? 'white' : '#94a3b8', borderColor: confirmText.trim() === equipo.serial.trim() ? '#dc2626' : '#cbd5e1', cursor: confirmText.trim() === equipo.serial.trim() ? 'pointer' : 'not-allowed' }}
            onClick={handleEliminar} disabled={confirmText.trim() !== equipo.serial.trim() || procesando}>
            {procesando ? 'Eliminando...' : 'Eliminar definitivamente'}
          </button>
        </>}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
          <div className="text-xs text-danger font-medium mb-1">⚠ Esta acción no se puede deshacer</div>
          <div className="text-xs text-t2">Se eliminarán el equipo, su configuración original y sus componentes.</div>
        </div>
        <FormGroup label={`Escribe el serial para confirmar: ${equipo.serial}`}>
          <input className="input" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder={equipo.serial} />
        </FormGroup>
      </Modal>
    </>
  )
}