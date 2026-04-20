import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { equipos as api, partsurfer as psApi, componentes as compApi } from '../../services/api'
import { PageHeader, Badge, SearchBox, Modal, FormGroup, Spinner, EmptyState } from '../../components/ui'
import { useImportStore } from '../../store/importStore'

const TIPOS   = ['LAPTOP','DESKTOP','AIO','MONITOR','IMPRESORA']
const ESTADOS = ['COMPLETO','CON_FALLAS','INCOMPLETO','PRESTADO','BAJA']

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

export default function Equipos() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ serial:'', modelo:'', estado:'', cliente:'', tipo_equipo:'' })
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ serial:'', modelo:'', product_number:'', tipo_equipo:'LAPTOP', cliente:'', estado:'COMPLETO', observaciones:'' })
  const [psResult, setPsResult]     = useState(null)
  const [opcionesPS, setOpcionesPS] = useState(null)
  const [psLoading, setPsLoading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [sort, setSort]             = useState({ col: 'serial', dir: 'asc' })
  const [modalImport, setModalImport] = useState(false)
  const [importRows, setImportRows]   = useState([])
  const [importando, setImportando]   = useState(false)
  const fileRef = useRef()

  const { progreso, seleccionPendiente, setProgreso, setSeleccionPendiente, limpiar } = useImportStore()

  function handleSort(field) {
    setSort(s => s.col === field ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: field, dir: 'asc' })
  }

  const sortedList = [...list].sort((a, b) => {
    const av = (a[sort.col] ?? '').toString().toLowerCase()
    const bv = (b[sort.col] ?? '').toString().toLowerCase()
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  useEffect(() => { load() }, [filters])

  async function load() {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
      const { data } = await api.list(params)
      setList(data)
    } catch { toast.error('Error cargando equipos') }
    finally { setLoading(false) }
  }

  async function consultarPS() {
    if (!form.serial) return toast.error('Ingresa un serial')
    setPsLoading(true); setPsResult(null); setOpcionesPS(null)
    try {
      const { data } = await psApi.consultar(form.serial)
      if (data.requiere_seleccion) {
        setOpcionesPS(data.opciones)
      } else {
        setPsResult(data)
        if (data.modelo)         setForm(f => ({ ...f, modelo: data.modelo }))
        if (data.product_number) setForm(f => ({ ...f, product_number: data.product_number }))
        toast.success(`${data.partes?.length} componentes encontrados`)
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Error consultando PartSurfer') }
    finally { setPsLoading(false) }
  }

  async function seleccionarProducto(pn) {
    setPsLoading(true); setOpcionesPS(null)
    try {
      const { data } = await psApi.seleccionar(form.serial, pn)
      setPsResult(data)
      if (data.modelo)         setForm(f => ({ ...f, modelo: data.modelo }))
      if (data.product_number) setForm(f => ({ ...f, product_number: data.product_number }))
      toast.success(`${data.partes?.length} componentes encontrados`)
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setPsLoading(false) }
  }

  async function handleSave() {
    if (!form.serial || !form.modelo || !form.tipo_equipo) return toast.error('Serial, modelo y tipo requeridos')
    setSaving(true)
    try {
      const { data: eq } = await api.create(form)
      if (psResult?.partes?.length) {
        await api.saveConfig(eq.id, { raw_data: psResult, detalles: psResult.partes })
        toast.success('Equipo creado con configuración HP importada')
      } else { toast.success('Equipo creado') }
      setModal(false); setPsResult(null); setOpcionesPS(null)
      setForm({ serial:'', modelo:'', product_number:'', tipo_equipo:'LAPTOP', cliente:'', estado:'COMPLETO', observaciones:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error guardando') }
    finally { setSaving(false) }
  }

  function leerExcel(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb  = XLSX.read(ev.target.result, { type: 'binary' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const rows = raw.map(r => {
        const find = (keys) => {
          for (const k of Object.keys(r)) {
            if (keys.some(key => k.toUpperCase().includes(key))) return String(r[k]).trim()
          }
          return ''
        }
        return {
          serial:         find(['SERIAL']).toUpperCase(),
          tipo_equipo:    find(['TIPO']).toUpperCase() || 'LAPTOP',
          product_number: find(['PRODUCT']),
          modelo:         find(['MODELO','MODEL']),
          cliente:        find(['CLIENTE','CLIENT']),
        }
      }).filter(r => r.serial)
      setImportRows(rows)
      setModalImport(true)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // Procesar importación uno por uno
  async function iniciarImport() {
    setModalImport(false)
    setProgreso({ items: [], actual: 0, total: importRows.length, fin: false })

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i]
      setProgreso(p => ({ ...p, actual: i + 1, procesando: row.serial }))

      // 1. Crear equipo en BD
      let eq
      try {
        const tipo = TIPOS.includes(row.tipo_equipo) ? row.tipo_equipo : 'LAPTOP'
        const { data } = await api.create({ ...row, tipo_equipo: tipo, estado: 'INCOMPLETO' })
        eq = data
      } catch (err) {
        const msg = err.response?.data?.error || 'Error'
        setProgreso(p => ({ ...p, items: [...p.items, { serial: row.serial, tipo: 'error', msg }] }))
        continue
      }

      // 2. Consultar PartSurfer
      try {
        const busqueda = row.product_number || row.serial
        let psData

        // Buscar por product_number si lo tiene, si no por serial
        if (row.product_number) {
          const { data } = await psApi.seleccionar(row.serial, row.product_number)
          psData = data
        } else {
          const { data } = await psApi.consultar(row.serial)

          if (data.requiere_seleccion && data.opciones?.length) {
            // Pausar y pedir selección
            const productNumber = await new Promise(resolve => {
              setSeleccionPendiente({ serial: row.serial, opciones: data.opciones, resolve })
            })
            setSeleccionPendiente(null)
            if (productNumber) {
              const { data: d2 } = await psApi.seleccionar(row.serial, productNumber)
              psData = d2
            }
          } else {
            psData = data
          }
        }

        if (psData?.partes?.length) {
          // Actualizar modelo si lo encontró
          if (psData.modelo && (!row.modelo || row.modelo === 'Sin modelo')) {
            await api.update(eq.id, { modelo: psData.modelo, product_number: psData.product_number || row.product_number })
          }
          await api.saveConfig(eq.id, { raw_data: psData, detalles: psData.partes })

          // Añadir partes a Componentes Actuales
          for (const parte of psData.partes) {
            try {
              await compApi.create({
                part_number:     parte.part_number,
                descripcion:     parte.descripcion,
                categoria:       parte.categoria || 'OTRO',
                estado:          'BUENO',
                equipo_actual_id: eq.id,
              })
            } catch { /* ignorar duplicados */ }
          }

          setProgreso(p => ({ ...p, items: [...p.items, { serial: row.serial, tipo: 'ok', partes: psData.partes.length, modelo: psData.modelo || row.modelo }] }))
        } else {
          setProgreso(p => ({ ...p, items: [...p.items, { serial: row.serial, tipo: 'sin_partes', msg: 'Sin partes en PartSurfer' }] }))
        }
      } catch (err) {
        setProgreso(p => ({ ...p, items: [...p.items, { serial: row.serial, tipo: 'ps_error', msg: 'Error en PartSurfer' }] }))
      }
    }

    setProgreso(p => ({ ...p, fin: true, procesando: null }))
    setImportRows([])
    load()
  }

  const sf   = (k,v) => setForm(f => ({ ...f, [k]: v }))
  const setF = (k)   => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <PageHeader title="Equipos Donantes" actions={
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={leerExcel} />
          <button className="btn-ghost" onClick={() => fileRef.current.click()}>⬆ Importar Excel</button>
          <button className="btn-primary" onClick={() => setModal(true)}>+ Agregar Equipo</button>
        </div>
      } />
      <div className="p-4 md:p-7">
        <div className="flex gap-2 mb-5 flex-wrap">
          <SearchBox value={filters.serial}  onChange={v => setFilters(f=>({...f,serial:v}))}  placeholder="Serial..." />
          <SearchBox value={filters.modelo}  onChange={v => setFilters(f=>({...f,modelo:v}))}  placeholder="Modelo..." />
          <SearchBox value={filters.cliente} onChange={v => setFilters(f=>({...f,cliente:v}))} placeholder="Cliente..." />
          <select className="input w-auto" value={filters.tipo_equipo} onChange={setF('tipo_equipo')}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={filters.estado} onChange={setF('estado')}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="card overflow-x-auto table-wrap">
          {loading ? <Spinner /> : list.length === 0 ? <EmptyState msg="No hay equipos registrados" /> :
            <table className="w-full">
              <thead><tr>
                <SortTh field="serial"         sort={sort} onSort={handleSort}>Serial</SortTh>
                <SortTh field="modelo"         sort={sort} onSort={handleSort}>Modelo</SortTh>
                <SortTh field="product_number" sort={sort} onSort={handleSort}>Product #</SortTh>
                <th className="th">Tipo</th>
                <SortTh field="cliente"        sort={sort} onSort={handleSort}>Cliente</SortTh>
                <SortTh field="estado"         sort={sort} onSort={handleSort}>Estado</SortTh>
                <th className="th">Componentes</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>{sortedList.map(eq => (
                <tr key={eq.id} className="tr">
                  <td className="td"><Link to={`/intranet/daas/equipos/${eq.id}`} className="font-mono text-primary hover:underline cursor-pointer">{eq.serial}</Link></td>
                  <td className="td">{eq.modelo}</td>
                  <td className="td font-mono text-t3">{eq.product_number || '—'}</td>
                  <td className="td"><span className="tag">{eq.tipo_equipo}</span></td>
                  <td className="td text-t2">{eq.cliente || '—'}</td>
                  <td className="td"><Badge value={eq.estado} /></td>
                  <td className="td text-t2">{eq.componentes_actuales?.length ?? 0}</td>
                  <td className="td"><Link to={`/intranet/daas/equipos/${eq.id}`} className="btn-ghost text-[11px] px-3 py-1.5">Ver →</Link></td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>

      {/* Modal registro individual */}
      <Modal open={modal} onClose={() => { setModal(false); setPsResult(null); setOpcionesPS(null) }} title="⬡ Registrar Equipo Donante"
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
        </>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FormGroup label="Número de Serie *">
            <div className="flex gap-2">
              <input className="input flex-1" value={form.serial} onChange={e => sf('serial', e.target.value.toUpperCase())} placeholder="Ej: 5CD40551BM" />
              <button className="btn-ghost px-3" onClick={consultarPS} disabled={psLoading}>{psLoading ? '...' : '⊕ PS'}</button>
            </div>
            {psLoading && <div className="text-[10px] text-t3 mt-1">Consultando PartSurfer...</div>}
            {psResult && (
              <div className="mt-2 bg-gray3 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-ok">✓ {psResult.partes?.length} componentes encontrados</div>
                <div className="text-t2 mt-1">{psResult.modelo}</div>
              </div>
            )}
            {opcionesPS && (
              <div className="mt-2 bg-gray3 border border-accent/30 rounded-lg p-3">
                <div className="text-xs text-primary mb-2">⬡ Selecciona el modelo:</div>
                <div className="space-y-1.5">
                  {opcionesPS.map(op => (
                    <button key={op.value} onClick={() => seleccionarProducto(op.value)}
                      className="w-full text-left text-xs bg-white border border-border2 rounded px-3 py-2 hover:border-accent hover:text-primary transition-colors cursor-pointer">
                      <span className="font-mono text-primary">{op.value}</span>
                      <span className="text-t2 ml-2">{op.label.split(' - ').slice(1).join(' - ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FormGroup>
          <FormGroup label="Modelo *">
            <input className="input" value={form.modelo} onChange={e => sf('modelo', e.target.value)} placeholder="HP EliteBook 840 G8" />
          </FormGroup>
          <FormGroup label="Product Number">
            <input className="input" value={form.product_number} onChange={e => sf('product_number', e.target.value)} placeholder="8B9C1AV" />
          </FormGroup>
          <FormGroup label="Tipo *">
            <select className="input" value={form.tipo_equipo} onChange={e => sf('tipo_equipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Cliente">
            <input className="input" value={form.cliente} onChange={e => sf('cliente', e.target.value)} placeholder="HP DAAS Pool" />
          </FormGroup>
          <FormGroup label="Estado">
            <select className="input" value={form.estado} onChange={e => sf('estado', e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <div className="col-span-2">
            <FormGroup label="Observaciones">
              <textarea className="input h-20 resize-none" value={form.observaciones || ''} onChange={e => sf('observaciones', e.target.value)} placeholder="Notas sobre el equipo..." />
            </FormGroup>
          </div>
        </div>
      </Modal>

      {/* Modal previsualización importación */}
      <Modal open={modalImport} onClose={() => { setModalImport(false); setImportRows([]) }}
        title={`⬆ Importar ${importRows.length} equipos desde Excel`} wide
        footer={<>
          <button className="btn-ghost" onClick={() => { setModalImport(false); setImportRows([]) }}>Cancelar</button>
          <button className="btn-primary" onClick={iniciarImport} disabled={!importRows.length}>
            Iniciar importación
          </button>
        </>}>
        <div className="text-xs text-t3 mb-3">Se crearán los equipos uno por uno consultando PartSurfer en tiempo real.</div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead><tr>
              <th className="th">Serial</th><th className="th">Tipo</th>
              <th className="th">Product #</th><th className="th">Modelo</th><th className="th">Cliente</th>
            </tr></thead>
            <tbody>{importRows.map((r, i) => (
              <tr key={i} className="tr">
                <td className="td font-mono text-primary text-xs">{r.serial}</td>
                <td className="td"><span className="tag">{r.tipo_equipo}</span></td>
                <td className="td font-mono text-t3 text-xs">{r.product_number || '—'}</td>
                <td className="td text-t2 text-xs">{r.modelo || '—'}</td>
                <td className="td text-t2 text-xs">{r.cliente || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>

    </>
  )
}