import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { movimientos as api, equipos as eqApi } from '../../services/api'
import { PageHeader, Badge, Modal, FormGroup, Spinner, EmptyState } from '../../components/ui'

const EMPTY = { componente_id:'', equipo_completo:false, numero_caso:'', origen_id:'', uso_tipo:'TEMPORAL', tecnico:'', ct_bueno:'', fecha_entrega:'', observaciones:'' }
const STATUSES = ['ENTREGADO','INSTALADO','EN_ESPERA','PENDIENTE_DEVOLUCION','CERRADO']

function diasDesde(fecha) {
  if (!fecha) return null
  const diff = Math.floor((Date.now() - new Date(fecha)) / 86400000)
  return diff
}

function AntigüedadBadge({ fecha, status }) {
  if (status === 'CERRADO' || !fecha) return null
  const dias = diasDesde(fecha)
  if (dias === null) return null
  const cls = dias >= 10 ? 'text-danger' : dias >= 5 ? 'text-warn' : 'text-t3'
  return <span className={`text-[10px] ${cls}`}>⏱ {dias}d</span>
}

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

export default function Movimientos() {
  const [list, setList]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [eqList, setEqList]         = useState([])
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [serialOrigen, setSerialOrigen]         = useState('')
  const [compOrigen, setCompOrigen]             = useState([])
  const [loadingComps, setLoadingComps]         = useState(false)
  const [equipoOrigenInfo, setEquipoOrigenInfo] = useState(null)
  const [compSeleccionado, setCompSeleccionado] = useState(null)
  const [sort, setSort]             = useState({ col: 'fecha_entrega', dir: 'desc' })
  const [filters, setFilters]       = useState({ caso:'', status:'', tecnico:'', serial:'' })

  useEffect(() => { load(); eqApi.list({}).then(r => setEqList(r.data)) }, [])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [filters])

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filters.caso)   params.numero_caso = filters.caso
      if (filters.status) params.status      = filters.status
      const { data } = await api.list(params)
      // Filtrar por técnico y serial en cliente
      let filtered = data
      if (filters.tecnico) filtered = filtered.filter(m => m.tecnico?.toLowerCase().includes(filters.tecnico.toLowerCase()))
      if (filters.serial)  filtered = filtered.filter(m => m.origen?.serial?.toLowerCase().includes(filters.serial.toLowerCase()))
      setList(filtered)
    } catch { toast.error('Error cargando movimientos') }
    finally { setLoading(false) }
  }

  function handleSort(field) {
    setSort(s => s.col === field ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: field, dir: 'asc' })
  }

  const sortedList = [...list].sort((a, b) => {
    let av, bv
    if (sort.col === 'fecha_entrega') {
      av = new Date(a.fecha_entrega ?? 0)
      bv = new Date(b.fecha_entrega ?? 0)
    } else if (sort.col === 'origen_serial') {
      av = (a.origen?.serial ?? '').toLowerCase()
      bv = (b.origen?.serial ?? '').toLowerCase()
    } else {
      av = (a[sort.col] ?? '').toString().toLowerCase()
      bv = (b[sort.col] ?? '').toString().toLowerCase()
    }
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  async function buscarEquipoOrigen(serial) {
    setSerialOrigen(serial.toUpperCase())
    setCompOrigen([]); setEquipoOrigenInfo(null)
    sf('origen_id', ''); sf('componente_id', ''); setCompSeleccionado(null)

    if (serial.length < 3) return
    setLoadingComps(true)
    try {
      const eq = eqList.find(e => e.serial.toUpperCase() === serial.toUpperCase())
      if (eq) {
        const { data } = await eqApi.get(eq.id)
        setEquipoOrigenInfo(data)
        setCompOrigen(data.componentes_actuales || [])
        sf('origen_id', eq.id)
      }
    } catch { toast.error('Error buscando equipo') }
    finally { setLoadingComps(false) }
  }

  function seleccionarComponente(compId) {
    sf('componente_id', compId)
    const comp = compOrigen.find(c => c.id === compId)
    setCompSeleccionado(comp || null)
    sf('ct_bueno', comp?.ct || '')
  }

  function resetModal() {
    setForm(EMPTY); setSerialOrigen(''); setCompOrigen([])
    setEquipoOrigenInfo(null); setCompSeleccionado(null); setModal(false)
  }

  async function handleSave() {
    if (!form.origen_id)    return toast.error('Selecciona el equipo origen')
    if (!form.equipo_completo && !form.componente_id) return toast.error('Selecciona un componente o marca equipo completo')
    if (!form.equipo_completo && !form.ct_bueno) return toast.error('El CT del componente es obligatorio')
    if (!form.numero_caso)  return toast.error('El caso DAAS es requerido')
    if (!form.tecnico)      return toast.error('El nombre del técnico es requerido')
    setSaving(true)
    try {
      await api.create(form)
      toast.success('Movimiento registrado')
      resetModal(); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const sf2 = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const activos  = list.filter(m => m.status !== 'CERRADO').length
  const cerrados = list.filter(m => m.status === 'CERRADO').length

  return (
    <>
      <PageHeader title="Movimientos" actions={
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            <span className="badge-info">{activos} activos</span>
            <span className="badge-gray">{cerrados} cerrados</span>
          </div>
          <button className="btn-primary" onClick={() => setModal(true)}>⇄ Nuevo Movimiento</button>
        </div>
      } />
      <div className="p-4 md:p-7">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-5 flex-wrap">
          <input className="input w-44" value={filters.caso} onChange={e => sf2('caso', e.target.value)}
            placeholder="Caso DAAS..." />
          <input className="input w-44" value={filters.serial} onChange={e => sf2('serial', e.target.value)}
            placeholder="Serial equipo..." />
          <input className="input w-44" value={filters.tecnico} onChange={e => sf2('tecnico', e.target.value)}
            placeholder="Técnico..." />
          <select className="input w-52" value={filters.status} onChange={e => sf2('status', e.target.value)}>
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filters.caso || filters.serial || filters.tecnico || filters.status) && (
            <button className="btn-ghost text-xs" onClick={() => setFilters({ caso:'', status:'', tecnico:'', serial:'' })}>✕ Limpiar</button>
          )}
        </div>

        <div className="card overflow-x-auto table-wrap">
          {loading ? <Spinner /> : sortedList.length === 0 ? <EmptyState msg="Sin movimientos" /> :
            <table className="w-full">
              <thead><tr>
                <SortTh field="fecha_entrega" sort={sort} onSort={handleSort}>Fecha entrega</SortTh>
                <SortTh field="origen_serial" sort={sort} onSort={handleSort}>Equipo origen</SortTh>
                <th className="th">Componente</th>
                <SortTh field="tecnico" sort={sort} onSort={handleSort}>Técnico</SortTh>
                <SortTh field="numero_caso" sort={sort} onSort={handleSort}>Caso</SortTh>
                <th className="th">Modalidad</th>
                <SortTh field="status" sort={sort} onSort={handleSort}>Status</SortTh>
                <th className="th">Antigüedad</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>{sortedList.map(m => (
                <tr key={m.id} className="tr">
                  <td className="td text-t3 text-[11px]">{m.fecha_entrega ? new Date(m.fecha_entrega).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
                  <td className="td">
                    {m.origen
                      ? <Link to={`/intranet/daas/equipos/${m.origen.id}`} className="font-mono text-primary text-xs hover:underline">{m.origen.serial}</Link>
                      : <span className="text-t3">—</span>}
                  </td>
                  <td className="td">
                    {m.equipo_completo
                      ? <span className="badge-info">⬡ Equipo completo</span>
                      : <><span className="tag">{m.componente?.categoria}</span><Link to={`/intranet/daas/componentes/${m.componente_id}`} className="font-mono text-primary text-xs hover:underline">{m.componente?.part_number}</Link></>
                    }
                  </td>
                  <td className="td text-t2 text-xs">{m.tecnico||'—'}</td>
                  <td className="td font-mono text-primary text-xs">{m.numero_caso}</td>
                  <td className="td">{m.uso_tipo&&m.uso_tipo!=='NA'?<Badge value={m.uso_tipo} />:'—'}</td>
                  <td className="td"><Badge value={m.status} /></td>
                  <td className="td"><AntigüedadBadge fecha={m.fecha_entrega} status={m.status} /></td>
                  <td className="td"><Link to={`/intranet/daas/movimientos/${m.id}`} className="btn-ghost text-[11px] px-3 py-1.5">Ver →</Link></td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>

      <Modal open={modal} onClose={resetModal} title="⇄ Nuevo Movimiento" wide
        footer={<><button className="btn-ghost" onClick={resetModal}>Cancelar</button><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Registrando...':'Registrar'}</button></>}>
        <div className="space-y-4">
          <FormGroup label="Serial del equipo origen *">
            <input className="input" value={serialOrigen} onChange={e => buscarEquipoOrigen(e.target.value)}
              list="eq-list" placeholder="Escribe o selecciona el serial..." />
            <datalist id="eq-list">{eqList.map(eq=><option key={eq.id} value={eq.serial}>{eq.serial} — {eq.modelo}</option>)}</datalist>
            {loadingComps && <div className="text-[10px] text-t3 mt-1">Buscando...</div>}
            {equipoOrigenInfo && (
              <div className="mt-2 bg-gray3 border border-accent/20 rounded-lg px-3 py-2 text-xs flex items-center gap-3">
                <span className="font-mono text-primary">{equipoOrigenInfo.serial}</span>
                <span className="text-t2">{equipoOrigenInfo.modelo}</span>
                <Badge value={equipoOrigenInfo.estado} />
                <span className="text-t3">{compOrigen.length} componentes</span>
              </div>
            )}
          </FormGroup>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.equipo_completo}
              onChange={e => { sf('equipo_completo', e.target.checked); if(e.target.checked){sf('componente_id',''); sf('ct_bueno',''); setCompSeleccionado(null)} }}
              className="w-4 h-4 accent-cyan-400 cursor-pointer" />
            <span className="text-xs text-t1">⬡ Préstamo de equipo completo</span>
          </label>

          {!form.equipo_completo && (
            <FormGroup label="Componente *">
              {!equipoOrigenInfo
                ? <div className="input text-t3 text-xs">Ingresa un serial para ver los componentes</div>
                : compOrigen.length === 0
                  ? <div className="input text-warn text-xs">Este equipo no tiene componentes registrados</div>
                  : <select className="input" value={form.componente_id} onChange={e => seleccionarComponente(e.target.value)}>
                      <option value="">Seleccionar componente...</option>
                      {compOrigen.map(c => (
                        <option key={c.id} value={c.id}>
                          
                          {c.part_number} — {c.descripcion?.slice(0,20)} [{c.estado}]{c.ct ? ` · CT: ${c.ct}` : ' · Sin CT'}{c.numero_os ? ` · OS: ${c.numero_os}` : ''}
                        </option>
                      ))}
                    </select>
              }
            </FormGroup>
          )}

          {!form.equipo_completo && (
            <FormGroup label={`CT del componente *${compSeleccionado && !compSeleccionado.ct ? ' — Este componente no tiene CT, ingrésalo' : ''}`}>
              <input className={`input ${compSeleccionado && !compSeleccionado.ct ? 'border-warn' : ''}`}
                value={form.ct_bueno} onChange={e => sf('ct_bueno', e.target.value)}
                placeholder={compSeleccionado?.ct ? `CT actual: ${compSeleccionado.ct}` : 'Ingresa el CT'} />
            </FormGroup>
          )}

          <FormGroup label="Caso / Orden DAAS *">
            <input className="input" value={form.numero_caso} onChange={e=>sf('numero_caso',e.target.value)} placeholder="DAAS-4421" />
          </FormGroup>
          <FormGroup label="Técnico que recibe *">
            <input className="input" value={form.tecnico} onChange={e=>sf('tecnico',e.target.value)}
              list="tecnicos-list" placeholder="Nombre del técnico" />
            <datalist id="tecnicos-list">
              {[...new Set(list.map(m => m.tecnico).filter(Boolean))].map(t => <option key={t} value={t} />)}
            </datalist>
          </FormGroup>
          <FormGroup label="Modalidad">
            <select className="input" value={form.uso_tipo} onChange={e=>sf('uso_tipo',e.target.value)}>
              <option value="TEMPORAL">Temporal</option>
              <option value="DEFINITIVO">Definitivo</option>
            </select>
          </FormGroup>
          <FormGroup label="Fecha de entrega">
            <input className="input" type="datetime-local" value={form.fecha_entrega} onChange={e=>sf('fecha_entrega',e.target.value)} />
          </FormGroup>
          <FormGroup label="Observaciones">
            <input className="input" value={form.observaciones} onChange={e=>sf('observaciones',e.target.value)} placeholder="Notas adicionales..." />
          </FormGroup>
        </div>
      </Modal>
    </>
  )
}