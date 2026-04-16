import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { componentes as api } from '../../services/api'
import { PageHeader, Badge, Timeline, Spinner, Modal, FormGroup } from '../../components/ui'

const ESTADOS = [
  { value: 'BUENO',                label: 'Bueno' },
  { value: 'DANADO',               label: 'Dañado' },
  { value: 'EN_USO',               label: 'En uso' },
  { value: 'EN_REVISION',          label: 'En revisión' },
  { value: 'PENDIENTE_DEVOLUCION', label: 'Pendiente devolución' },
  { value: 'PENDIENTE_REPOSICION', label: 'Pendiente reposición' },
]

export default function DetalleComponente() {
  const { id } = useParams()
  const [comp, setComp]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalEditar, setModalEditar] = useState(false)
  const [formEditar, setFormEditar]   = useState({})
  const [guardando, setGuardando]     = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    api.get(id).then(r => setComp(r.data)).catch(() => toast.error('Error')).finally(() => setLoading(false))
  }

  function abrirEditar() {
    setFormEditar({ ct: comp.ct || '', estado: comp.estado, numero_os: comp.numero_os || '', observaciones: comp.observaciones || '' })
    setModalEditar(true)
  }

  async function guardarEditar() {
    setGuardando(true)
    try {
      await api.update(id, formEditar)
      toast.success('Componente actualizado')
      setModalEditar(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setGuardando(false) }
  }

  if (loading) return <><PageHeader title="Detalle Componente" /><Spinner /></>
  if (!comp) return <div className="p-7 text-danger">Componente no encontrado</div>

  return (
    <>
      <PageHeader title={comp.part_number} actions={
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={abrirEditar}>✎ Editar</button>
          <Link to="/intranet/daas/componentes" className="btn-ghost">← Volver</Link>
        </div>
      } />
      <div className="p-4 md:p-7">
        <div className="card p-4 md:p-6 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><div className="label">Part Number</div><div className="font-mono text-primary text-sm">{comp.part_number}</div></div>
            <div><div className="label">CT</div><div className="font-mono text-t2 text-sm">{comp.ct||'—'}</div></div>
            <div><div className="label">Categoría</div><span className="tag text-xs">{comp.categoria}</span></div>
            <div><div className="label">Estado</div><Badge value={comp.estado} /></div>
            <div>
              <div className="label">Ubicación actual</div>
              {comp.equipo_actual
                ? <Link to={`/intranet/daas/equipos/${comp.equipo_actual.id}`} className="font-mono text-primary text-sm hover:underline">{comp.equipo_actual.serial}</Link>
                : <span className="text-t3 text-sm">BODEGA</span>}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="label">Descripción</div>
            <div className="text-sm text-t2">{comp.descripcion}</div>
          </div>
          {comp.numero_os && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="label">Número de OS</div>
              <div className="font-mono text-sm text-primary font-semibold">{comp.numero_os}</div>
            </div>
          )}
          {comp.observaciones && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="label">Observaciones</div>
              <div className="text-xs text-t2 italic">{comp.observaciones}</div>
            </div>
          )}
        </div>
        <div className="card p-4 md:p-6">
          <div className="font-display font-bold text-sm mb-4">◎ Historial de Movimientos</div>
          <Timeline movimientos={comp.movimientos||[]} />
        </div>
        {comp.historial_ct?.length > 0 && (
          <div className="card p-5 mt-5">
            <div className="font-display font-bold text-sm mb-4">⊕ Historial de CT</div>
            <table className="w-full">
              <thead><tr>
                <th className="th">Fecha</th>
                <th className="th">CT</th>
                <th className="th">Motivo</th>
              </tr></thead>
              <tbody>
                {comp.historial_ct.map(h => (
                  <tr key={h.id} className="tr">
                    <td className="td text-t3 text-[11px]">{new Date(h.creado_en).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}</td>
                    <td className="td font-mono text-primary">{h.ct}</td>
                    <td className="td text-t2 text-xs">{h.motivo||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalEditar} onClose={() => setModalEditar(false)} title="✎ Editar Componente"
        footer={<>
          <button className="btn-ghost" onClick={() => setModalEditar(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardarEditar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
        </>}>
        <div className="space-y-4">
          <FormGroup label="CT (Identificador físico)">
            <input className="input" value={formEditar.ct || ''} onChange={e => setFormEditar(f => ({ ...f, ct: e.target.value }))} placeholder="CT-SSD-001" />
          </FormGroup>
          <FormGroup label="Estado">
            <select className="input" value={formEditar.estado || ''} onChange={e => setFormEditar(f => ({ ...f, estado: e.target.value }))}>
              {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Número de OS">
            <input className="input" value={formEditar.numero_os || ''} onChange={e => setFormEditar(f => ({ ...f, numero_os: e.target.value }))} placeholder="OS-2024-001" />
          </FormGroup>
          <FormGroup label="Observaciones">
            <textarea className="input h-20 resize-none" value={formEditar.observaciones || ''} onChange={e => setFormEditar(f => ({ ...f, observaciones: e.target.value }))} placeholder="Notas sobre el componente..." />
          </FormGroup>
        </div>
      </Modal>
    </>
  )
}