import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportes } from '../../services/api'
import { PageHeader, StatCard, Badge, Spinner } from '../../components/ui'

export default function Dashboard() {
  const [kpi, setKpi]   = useState(null)
  const [pDev, setPDev] = useState([])
  const [dInc, setDInc] = useState([])

  useEffect(() => {
    Promise.all([reportes.dashboard(), reportes.pendientesDevolucion(), reportes.donantesIncompletos()])
      .then(([k, d, i]) => { setKpi(k.data); setPDev(d.data.slice(0,5)); setDInc(i.data.slice(0,5)) })
  }, [])

  if (!kpi) return <><PageHeader title="Dashboard" /><Spinner /></>

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="p-4 md:p-7">
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
          <StatCard label="Equipos Donantes"       value={kpi.equipos.total}               sub={`${kpi.equipos.completos} completos`}             color="blue" />
          <StatCard label="Componentes Disponibles" value={kpi.componentes.disponibles}     sub={`${kpi.componentes.total} total en pool`}          color="green" />
          <StatCard label="En Uso"                  value={kpi.componentes.en_uso}          sub={`${kpi.movimientos_abiertos} movimientos abiertos`} color="yellow" />
          <StatCard label="Pendientes"              value={(kpi.componentes.pendiente_devolucion||0)+(kpi.componentes.pendiente_reposicion||0)} sub={`${kpi.repuestos_en_camino} repuestos HP en camino`} color="red" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-display font-bold text-sm">Pendientes de Devolución</div>
              <Link to="/intranet/daas/reportes" className="text-[10px] text-primary hover:underline">Ver todos →</Link>
            </div>
            {pDev.length === 0
              ? <div className="text-center py-10 text-xs text-t3">Sin pendientes ✓</div>
              : <table className="w-full"><thead><tr><th className="th">Componente</th><th className="th">Caso</th><th className="th">Desde</th></tr></thead>
                <tbody>{pDev.map(m => (
                  <tr key={m.id} className="tr">
                    <td className="td"><span className="tag">{m.componente?.categoria}</span><span className="text-primary font-mono text-xs">{m.componente?.part_number}</span></td>
                    <td className="td text-primary font-mono">{m.numero_caso}</td>
                    <td className="td text-t3">{new Date(m.creado_en).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </div>
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-display font-bold text-sm">Donantes Incompletos</div>
              <Link to="/intranet/daas/equipos" className="text-[10px] text-primary hover:underline">Ver todos →</Link>
            </div>
            {dInc.length === 0
              ? <div className="text-center py-10 text-xs text-t3">Todos completos ✓</div>
              : <table className="w-full"><thead><tr><th className="th">Serial</th><th className="th">Modelo</th><th className="th">Estado</th><th className="th">Faltantes</th></tr></thead>
                <tbody>{dInc.map(eq => (
                  <tr key={eq.id} className="tr">
                    <td className="td"><Link to={`/intranet/daas/equipos/${eq.id}`} className="text-primary font-mono hover:underline">{eq.serial}</Link></td>
                    <td className="td text-t2">{eq.modelo}</td>
                    <td className="td"><Badge value={eq.estado} /></td>
                    <td className="td text-warn">{eq.piezas_faltantes?.length ?? '?'}</td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </div>
        </div>
      </div>
    </>
  )
}