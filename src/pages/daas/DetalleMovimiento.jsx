import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { movimientos as api } from '../../services/api'
import { PageHeader, Badge, Spinner, Modal, FormGroup } from '../../components/ui'

const FLUJO = [
  { status: 'ENTREGADO',            label: 'Entregado al técnico',              color: 'text-primary'  },
  { status: 'INSTALADO',            label: 'Técnico devuelve repuesto malo',    color: 'text-ok'      },
  { status: 'EN_ESPERA',            label: 'Repuesto HP instalado en donante',  color: 'text-warn'    },
  { status: 'PENDIENTE_DEVOLUCION', label: 'Pendiente devolución',              color: 'text-danger'  },
  { status: 'CERRADO',              label: 'Cerrado',                           color: 'text-t3'      },
]

const TRANSICIONES = {
  ENTREGADO:            ['INSTALADO'],
  INSTALADO:            ['EN_ESPERA'],
  EN_ESPERA:            [],
  PENDIENTE_DEVOLUCION: ['CERRADO'],
  CERRADO:              [],
}

export default function DetalleMovimiento() {
  const { id } = useParams()
  const [mov, setMov]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // status objetivo
  const [form, setForm]       = useState({ ct_malo:'', fecha_instalacion:'', fecha_devolucion:'', observaciones:'', ct_bueno_nuevo:'', ct_malo_confirm:'' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try { const { data } = await api.get(id); setMov(data) }
    catch { toast.error('Error cargando movimiento') }
    finally { setLoading(false) }
  }

  async function avanzarEstado() {
    if (!modal) return

    if (modal === 'INSTALADO' && !mov.equipo_completo && !form.ct_malo)
      return toast.error('El CT malo es obligatorio')

    if (modal === 'EN_ESPERA' && !mov.equipo_completo) {
      if (!form.ct_bueno_nuevo) return toast.error('El CT del repuesto HP es obligatorio')
      if (mov.ct_malo && form.ct_malo_confirm !== mov.ct_malo)
        return toast.error('El CT malo no coincide — verifica el componente que se devuelve')
    }

    setSaving(true)
    try {
      const payload = { status: modal, ...form }
      if (modal === 'EN_ESPERA' && form.ct_bueno_nuevo) {
        payload.ct_bueno_hp = form.ct_bueno_nuevo
        payload.observaciones = `CT repuesto HP: ${form.ct_bueno_nuevo}${form.observaciones ? ' — ' + form.observaciones : ''}`
      }
      // Para CERRADO, incluir guía en observaciones
      if ((modal === 'CERRADO' || modal === 'PENDIENTE_DEVOLUCION') && form.guia) {
        payload.observaciones = `Guía: ${form.guia}${form.observaciones ? ' — ' + form.observaciones : ''}`
      }
      await api.actualizarEstado(id, payload)
      toast.success('Estado actualizado')
      setModal(null)
      setForm({ ct_malo:'', fecha_instalacion:'', fecha_devolucion:'', observaciones:'', ct_bueno_nuevo:'', ct_malo_confirm:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  if (loading) return <><PageHeader title="Detalle Movimiento" /><Spinner /></>
  if (!mov)    return <div className="p-7 text-danger">Movimiento no encontrado</div>

  const transiciones = TRANSICIONES[mov.status] || []
  const stepActual   = FLUJO.findIndex(f => f.status === mov.status)

  return (
    <>
      <PageHeader title={`Movimiento — ${mov.numero_caso}`} actions={<Link to="/intranet/daas/movimientos" className="btn-ghost">← Volver</Link>} />
      <div className="p-4 md:p-7">

        {/* Info principal */}
        <div className="card p-4 md:p-6 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div><div className="label">Caso DAAS</div><div className="font-mono text-primary text-sm">{mov.numero_caso}</div></div>
            <div><div className="label">Técnico</div><div className="text-sm text-t1">{mov.tecnico||'—'}</div></div>
            <div><div className="label">Modalidad</div><Badge value={mov.uso_tipo} /></div>
            <div><div className="label">Status</div><Badge value={mov.status} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
            <div>
              <div className="label">Equipo origen</div>
              {mov.origen
                ? <Link to={`/intranet/daas/equipos/${mov.origen.id}`} className="font-mono text-primary text-sm hover:underline">{mov.origen.serial}</Link>
                : <span className="text-t3 text-sm">—</span>}
            </div>
            <div>
              <div className="label">{mov.equipo_completo ? 'Préstamo' : 'Componente'}</div>
              {mov.equipo_completo
                ? <span className="badge-info">⬡ Equipo completo</span>
                : <div>
                    <Link to={`/intranet/daas/componentes/${mov.componente_id}`} className="font-mono text-primary text-sm hover:underline">{mov.componente?.part_number}</Link>
                    <div className="text-[10px] text-t3 mt-0.5">{mov.componente?.descripcion}</div>
                    {mov.ct_bueno && <div className="text-[10px] text-t2 mt-0.5">CT: {mov.ct_bueno}</div>}
                  </div>
              }
            </div>
            <div><div className="label">Fecha entrega</div><div className="text-sm text-t2">{mov.fecha_entrega ? new Date(mov.fecha_entrega).toLocaleString('es-CO') : '—'}</div></div>
            <div><div className="label">Fecha instalación</div><div className="text-sm text-t2">{mov.fecha_instalacion ? new Date(mov.fecha_instalacion).toLocaleString('es-CO') : '—'}</div></div>
          </div>
          {mov.ct_malo && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="label">CT Malo registrado</div>
              <div className="font-mono text-danger text-sm">{mov.ct_malo}</div>
            </div>
          )}
          {mov.observaciones && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="label">Observaciones</div>
              <div className="text-xs text-t2 italic">{mov.observaciones}</div>
            </div>
          )}
        </div>

        {/* Timeline de estados */}
        <div className="card p-4 md:p-6 mb-5">
          <div className="font-display font-bold text-sm mb-4">Progreso del movimiento</div>
          <div className="flex items-center gap-0">
            {FLUJO.map((step, i) => {
              const pasado  = i < stepActual
              const actual  = i === stepActual
              const futuro  = i > stepActual
              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${actual  ? 'bg-accent border-accent text-black' : ''}
                      ${pasado  ? 'bg-ok/20 border-ok text-ok' : ''}
                      ${futuro  ? 'bg-gray3 border-border2 text-t3' : ''}`}>
                      {pasado ? '✓' : i + 1}
                    </div>
                    <div className={`text-[9px] mt-1.5 text-center max-w-[70px] leading-tight
                      ${actual ? 'text-primary font-medium' : pasado ? 'text-ok' : 'text-t3'}`}>
                      {step.label}
                    </div>
                  </div>
                  {i < FLUJO.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < stepActual ? 'bg-ok' : 'bg-border2'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Acciones disponibles */}
        {transiciones.length > 0 && (
          <div className="card p-4 md:p-6">
            <div className="font-display font-bold text-sm mb-3">Acciones disponibles</div>
            <div className="flex gap-2 flex-wrap">
              {transiciones.map(t => {
                return (
                  <button key={t} onClick={() => setModal(t)}
                    className={`btn-ghost text-xs px-4 py-2 ${
                      t === 'CERRADO'              ? 'text-ok border-green-500/30' :
                      t === 'PENDIENTE_DEVOLUCION' ? 'text-danger border-red-500/30' :
                      t === 'EN_ESPERA'            ? 'text-warn border-yellow-500/30' : ''
                    }`}>
                    {t === 'INSTALADO'            ? '→ Técnico devuelve repuesto malo' :
                     t === 'EN_ESPERA'            ? '→ Repuesto HP instalado en donante' :
                     t === 'PENDIENTE_DEVOLUCION' ? '→ Marcar pendiente devolución' :
                     t === 'CERRADO'              ? '→ Cerrar movimiento' : `→ ${t}`}
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Modal de transición */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={
          modal === 'INSTALADO'            ? '→ Técnico devuelve repuesto malo' :
          modal === 'EN_ESPERA'            ? '→ Repuesto HP instalado en donante' :
          modal === 'PENDIENTE_DEVOLUCION' ? '→ Marcar pendiente de devolución' :
          modal === 'CERRADO'              ? '→ Cerrar movimiento' : '→ Avanzar estado'
        }
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn-primary" onClick={avanzarEstado} disabled={saving}>{saving?'Guardando...':'Confirmar'}</button>
        </>}>
        <div className="space-y-4">
          {modal === 'INSTALADO' && !mov.equipo_completo && (
            <FormGroup label="CT Malo (repuesto defectuoso que devuelve el técnico) *">
              <input className="input" value={form.ct_malo || ''}
                onChange={e => setForm(f=>({...f, ct_malo:e.target.value}))}
                placeholder="CT del componente defectuoso que devuelve el técnico" />
            </FormGroup>
          )}
          {modal === 'INSTALADO' && (
            <FormGroup label="Fecha en que el técnico devuelve la parte">
              <input className="input" type="datetime-local" value={form.fecha_instalacion}
                onChange={e => setForm(f=>({...f, fecha_instalacion:e.target.value}))} />
            </FormGroup>
          )}
          {modal === 'EN_ESPERA' && !mov.equipo_completo && (
            <>
              <FormGroup label="CT del repuesto nuevo enviado por HP *">
                <input className="input" value={form.ct_bueno_nuevo || ''}
                  onChange={e => setForm(f=>({...f, ct_bueno_nuevo:e.target.value}))}
                  placeholder="CT de la parte nueva que llega de HP" />
              </FormGroup>
              <FormGroup label={`Confirma el CT Malo que se va a devolver${mov.ct_malo ? ` (${mov.ct_malo})` : ''}`}>
                <input className={`input ${
                  form.ct_malo_confirm && mov.ct_malo && form.ct_malo_confirm === mov.ct_malo ? 'border-ok' :
                  form.ct_malo_confirm && mov.ct_malo && form.ct_malo_confirm !== mov.ct_malo ? 'border-danger' : ''}`}
                  value={form.ct_malo_confirm || ''}
                  onChange={e => setForm(f=>({...f, ct_malo_confirm:e.target.value}))}
                  placeholder="Escribe el CT malo para confirmar que es el correcto" />
                {form.ct_malo_confirm && mov.ct_malo && form.ct_malo_confirm === mov.ct_malo && (
                  <div className="text-[10px] text-ok mt-1">✓ CT confirmado correctamente</div>
                )}
                {form.ct_malo_confirm && mov.ct_malo && form.ct_malo_confirm !== mov.ct_malo && (
                  <div className="text-[10px] text-danger mt-1">✗ El CT no coincide con {mov.ct_malo}</div>
                )}
              </FormGroup>
            </>
          )}
          {(modal === 'PENDIENTE_DEVOLUCION' || modal === 'CERRADO') && (
            <>
              <FormGroup label="Fecha de devolución">
                <input className="input" type="datetime-local" value={form.fecha_devolucion}
                  onChange={e => setForm(f=>({...f, fecha_devolucion:e.target.value}))} />
              </FormGroup>
              <FormGroup label="Guía / Número de envío">
                <input className="input" value={form.guia || ''}
                  onChange={e => setForm(f=>({...f, guia:e.target.value}))}
                  placeholder="Número de guía o referencia del envío" />
              </FormGroup>
            </>
          )}
          <FormGroup label="Observaciones">
            <input className="input" value={form.observaciones}
              onChange={e => setForm(f=>({...f, observaciones:e.target.value}))}
              placeholder="Notas adicionales..." />
          </FormGroup>
        </div>
      </Modal>
    </>
  )
}