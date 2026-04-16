import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { componentes as api, equipos as eqApi, partsurfer as psApi } from '../../services/api'
import { PageHeader, Badge, SearchBox, Modal, FormGroup, Spinner, EmptyState } from '../../components/ui'

const CATS    = ['SSD','RAM','PANTALLA','BATERIA','BOARD','TECLADO','OTRO']
const ESTADOS = ['BUENO','DANADO','EN_USO','EN_REVISION','PENDIENTE_DEVOLUCION','PENDIENTE_REPOSICION']

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

export default function Componentes() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ part_number:'', categoria:'', estado:'', serial:'' })
  const [modal, setModal]       = useState(false)
  const [eqList, setEqList]     = useState([])
  const [compatPN, setCompatPN] = useState('')
  const [compatRes, setCompatRes] = useState(null)
  const [form, setForm]         = useState({ part_number:'', descripcion:'', categoria:'SSD', ct:'', estado:'BUENO', equipo_actual_id:'', numero_os:'', observaciones:'' })
  const [saving, setSaving]     = useState(false)
  const [psLoading, setPsLoading] = useState(false)

  const [sort, setSort]         = useState({ col: 'part_number', dir: 'asc' })

  function handleSort(field) {
    setSort(s => s.col === field ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: field, dir: 'asc' })
  }

  const sortedList = [...list].sort((a, b) => {
    const av = (a[sort.col] ?? '').toString().toLowerCase()
    const bv = (b[sort.col] ?? '').toString().toLowerCase()
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  // Búsqueda inmediata con debounce para part_number
  useEffect(() => {
    const timer = setTimeout(() => { load() }, 300)
    return () => clearTimeout(timer)
  }, [filters])

  useEffect(() => { eqApi.list({}).then(r => setEqList(r.data)) }, [])

  async function load() {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
      const { data } = await api.list(params)
      // Filtrar por serial de equipo en el cliente
      const filtered = params.serial
        ? data.filter(c => c.equipo_actual?.serial?.toLowerCase().includes(params.serial.toLowerCase()))
        : data
      setList(filtered)
    } catch { toast.error('Error cargando componentes') }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!form.part_number || !form.descripcion || !form.categoria) return toast.error('Campos requeridos faltantes')
    setSaving(true)
    try {
      await api.create({ ...form, equipo_actual_id: form.equipo_actual_id || null })
      toast.success('Componente registrado')
      setModal(false)
      setForm({ part_number:'', descripcion:'', categoria:'SSD', ct:'', estado:'BUENO', equipo_actual_id:'', numero_os:'', observaciones:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error guardando') }
    finally { setSaving(false) }
  }

  async function buscarCompat() {
    if (!compatPN) return
    try { const { data } = await api.buscarCompat(compatPN); setCompatRes(data) }
    catch { toast.error('Error buscando compatibles') }
  }

  async function buscarParte(pn) {
    if (!pn || pn.length < 4) return
    setPsLoading(true)
    try {
      const { data } = await psApi.buscarParte(pn)
      setForm(f => ({
        ...f,
        descripcion: data.descripcion || f.descripcion,
        categoria:   data.categoria   || f.categoria,
      }))
      toast.success(`Descripción encontrada ${data.fuente === 'bd' ? '(BD)' : '(PartSurfer)'}`)
    } catch {
      // silencioso — no interrumpir si no encuentra
    } finally { setPsLoading(false) }
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <PageHeader title="Componentes" actions={<button className="btn-primary" onClick={() => setModal(true)}>+ Componente</button>} />
      <div className="p-4 md:p-7">
        {/* Buscador de compatibilidad — para casos DAAS */}
        <div className="card mb-5 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-blue-50">
            <span className="text-primary text-lg">⊞</span>
            <div>
              <div className="font-display font-bold text-sm text-primary">Buscar Componente Compatible para Caso DAAS</div>
              <div className="text-[10px] text-t3 mt-0.5">Ingresa un número de parte y encuentra en qué equipo donante está disponible</div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" value={compatPN} onChange={e => setCompatPN(e.target.value.toUpperCase())} placeholder="Número de parte (Ej: L85366-005)" onKeyDown={e => e.key==='Enter'&&buscarCompat()} />
              <button className="btn-primary" onClick={buscarCompat}>Buscar en Pool</button>
            </div>
            {compatRes !== null && (compatRes.length === 0
              ? <div className="text-xs text-t3 py-2">No hay componentes disponibles con ese número de parte.</div>
              : <div className="space-y-2">{compatRes.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-gray3 border border-border2 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-display font-bold text-sm">{c.equipo_actual?.serial} — {c.equipo_actual?.modelo}</div>
                      <div className="text-xs text-t3 mt-0.5">{c.descripcion} · CT: {c.ct||'—'}</div>
                    </div>
                    <div className="flex items-center gap-2"><Badge value={c.estado} /><Link to={`/intranet/daas/componentes/${c.id}`} className="btn-ghost text-[11px] px-3 py-1.5">Ver →</Link></div>
                  </div>
                ))}</div>
            )}
          </div>
        </div>

        {/* Filtros del inventario general */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-widest uppercase text-t3">Filtrar inventario</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <SearchBox value={filters.part_number} onChange={v => setFilters(f=>({...f,part_number:v}))} placeholder="Número de parte..." />
          <SearchBox value={filters.serial}      onChange={v => setFilters(f=>({...f,serial:v}))}      placeholder="Serial de equipo..." />
          <select className="input w-auto" value={filters.categoria} onChange={e => setFilters(f=>({...f,categoria:e.target.value}))}>
            <option value="">Todas las categorías</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input w-auto" value={filters.estado} onChange={e => setFilters(f=>({...f,estado:e.target.value}))}>
            <option value="">Todos los estados</option>{ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="card overflow-x-auto table-wrap">
          {loading ? <Spinner /> : list.length===0 ? <EmptyState msg="No hay componentes registrados" /> :
            <table className="w-full">
              <thead><tr>
                <SortTh field="part_number" sort={sort} onSort={handleSort}>Part Number</SortTh>
                <SortTh field="descripcion"  sort={sort} onSort={handleSort}>Descripción</SortTh>
                <SortTh field="categoria"    sort={sort} onSort={handleSort}>Categoría</SortTh>
                <SortTh field="estado"       sort={sort} onSort={handleSort}>Estado</SortTh>
                <SortTh field="equipo_actual" sort={sort} onSort={handleSort}>Ubicación</SortTh>
              </tr></thead>
              <tbody>{sortedList.map(c => (
                <tr key={c.id} className="tr">
                  <td className="td"><Link to={`/intranet/daas/componentes/${c.id}`} className="font-mono text-primary hover:underline cursor-pointer">{c.part_number}</Link></td>
                  <td className="td text-t2 max-w-[240px] truncate">{c.descripcion}</td>
                  <td className="td"><span className="tag">{c.categoria}</span></td>
                  <td className="td"><Badge value={c.estado} /></td>
                  <td className="td font-mono text-t2">{c.equipo_actual?.serial||'BODEGA'}</td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="◧ Registrar Componente"
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'Registrar'}</button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FormGroup label="Part Number HP *">
            <div className="flex gap-2">
              <input className="input flex-1" value={form.part_number}
                onChange={e => sf('part_number', e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && buscarParte(form.part_number)}
                placeholder="L85366-005" />
              <button className="btn-ghost px-3" onClick={() => buscarParte(form.part_number)} disabled={psLoading}>
                {psLoading ? '...' : '⊕'}
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Categoría *"><select className="input" value={form.categoria} onChange={e => sf('categoria', e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></FormGroup>
          <div className="col-span-2"><FormGroup label="Descripción *"><input className="input" value={form.descripcion} onChange={e => sf('descripcion', e.target.value)} /></FormGroup></div>
          <FormGroup label="CT (Identificador físico)"><input className="input" value={form.ct} onChange={e => sf('ct', e.target.value)} placeholder="CT-SSD-001" /></FormGroup>
          <FormGroup label="Estado"><select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>{ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}</select></FormGroup>
          <div className="col-span-2"><FormGroup label="Equipo donante actual"><select className="input" value={form.equipo_actual_id} onChange={e => sf('equipo_actual_id', e.target.value)}>{eqList.map(eq=><option key={eq.id} value={eq.id}>{eq.serial} — {eq.modelo}</option>)}</select></FormGroup></div>
          <FormGroup label="Número de OS"><input className="input" value={form.numero_os} onChange={e => sf('numero_os', e.target.value)} placeholder="OS-2024-001" /></FormGroup>
          <div className="col-span-2"><FormGroup label="Observaciones"><input className="input" value={form.observaciones} onChange={e => sf('observaciones', e.target.value)} /></FormGroup></div>
        </div>
      </Modal>
    </>
  )
}