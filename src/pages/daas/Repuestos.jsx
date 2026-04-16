import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { repuestos as api, equipos as eqApi } from '../../services/api'
import { PageHeader, Badge, Modal, FormGroup, Spinner, EmptyState } from '../../components/ui'

export default function Repuestos() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [eqList, setEqList] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({ numero_caso:'', part_number:'', descripcion:'', equipo_destino_id:'', estado:'EN_CAMINO' })

  useEffect(() => { load(); eqApi.list({}).then(r=>setEqList(r.data)) }, [])

  async function load() {
    setLoading(true)
    try { const { data } = await api.list({}); setList(data) }
    catch { toast.error('Error cargando repuestos') }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!form.numero_caso || !form.part_number) return toast.error('Caso y número de parte requeridos')
    setSaving(true)
    try {
      await api.create({ ...form, equipo_destino_id: form.equipo_destino_id || null })
      toast.success('Repuesto registrado'); setModal(false)
      setForm({ numero_caso:'', part_number:'', descripcion:'', equipo_destino_id:'', estado:'EN_CAMINO' }); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <PageHeader title="Repuestos HP" actions={<button className="btn-primary" onClick={() => setModal(true)}>+ Registrar Repuesto</button>} />
      <div className="p-7">
        <div className="card">
          {loading ? <Spinner /> : list.length===0 ? <EmptyState msg="Sin repuestos registrados" /> :
            <table className="w-full">
              <thead><tr><th className="th">Part Number</th><th className="th">Descripción</th><th className="th">Caso</th><th className="th">Equipo destino</th><th className="th">Estado</th><th className="th">Recepción</th><th className="th">Acciones</th></tr></thead>
              <tbody>{list.map(r => (
                <tr key={r.id} className="tr">
                  <td className="td font-mono text-accent">{r.part_number}</td>
                  <td className="td text-t2">{r.descripcion||'—'}</td>
                  <td className="td font-mono text-accent">{r.numero_caso}</td>
                  <td className="td font-mono text-t3">{r.equipo_destino_id?`ID-${r.equipo_destino_id}`:'—'}</td>
                  <td className="td"><Badge value={r.estado} /></td>
                  <td className="td text-t3">{r.fecha_recepcion?new Date(r.fecha_recepcion).toLocaleDateString('es-CO'):'—'}</td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      {(r.estado==='EN_CAMINO'||r.estado==='EN_TRANSITO') && <button className="btn-success text-[11px] px-2.5 py-1" onClick={()=>api.recibir(r.id).then(()=>{toast.success('Recibido');load()})}>Recibido</button>}
                      {r.estado==='RECIBIDO' && <button className="btn-primary text-[11px] px-2.5 py-1" onClick={()=>api.instalar(r.id).then(()=>{toast.success('Instalado');load()})}>Instalar</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="⬒ Registrar Repuesto HP"
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'Registrar'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Número de Parte *"><input className="input" value={form.part_number} onChange={e=>sf('part_number',e.target.value.toUpperCase())} placeholder="L85366-005" /></FormGroup>
          <FormGroup label="Caso DAAS *"><input className="input" value={form.numero_caso} onChange={e=>sf('numero_caso',e.target.value)} placeholder="DAAS-4421" /></FormGroup>
          <div className="col-span-2"><FormGroup label="Descripción"><input className="input" value={form.descripcion} onChange={e=>sf('descripcion',e.target.value)} /></FormGroup></div>
          <FormGroup label="Equipo destino"><select className="input" value={form.equipo_destino_id} onChange={e=>sf('equipo_destino_id',e.target.value)}><option value="">Sin asignar</option>{eqList.map(eq=><option key={eq.id} value={eq.id}>{eq.serial} — {eq.modelo}</option>)}</select></FormGroup>
          <FormGroup label="Estado"><select className="input" value={form.estado} onChange={e=>sf('estado',e.target.value)}><option value="EN_CAMINO">En camino</option><option value="EN_TRANSITO">En tránsito</option><option value="RECIBIDO">Recibido</option></select></FormGroup>
        </div>
      </Modal>
    </>
  )
}