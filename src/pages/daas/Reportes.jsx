import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { reportes as api, componentes as compApi, equipos as eqApi } from '../../services/api'
import { PageHeader, Badge, Spinner, EmptyState } from '../../components/ui'

// const TABS = ['Pendientes Devolución','Pendientes Reposición','Donantes Incompletos']
const TABS = []

async function exportarInventario() {
  try {
    toast('Generando inventario...', { icon: '⏳' })
    const { data } = await compApi.list({})
    const rows = data.map(c => ({
      'Part Number':     c.part_number,
      'Descripción':     c.descripcion,
      'Categoría':       c.categoria,
      'CT':              c.ct || '—',
      'Estado':          c.estado,
      'Equipo (Serial)': c.equipo_actual?.serial || 'BODEGA',
      'Equipo (Modelo)': c.equipo_actual?.modelo || '—',
      'Fecha registro':  new Date(c.creado_en).toLocaleDateString('es-CO'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch:16 },{ wch:45 },{ wch:12 },{ wch:14 },{ wch:22 },{ wch:16 },{ wch:28 },{ wch:14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_componentes_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Inventario exportado')
  } catch { toast.error('Error exportando inventario') }
}

async function exportarEquipos() {
  try {
    toast('Generando reporte de equipos...', { icon: '⏳' })
    const { data: equipos } = await eqApi.list({})

    // Una fila por componente actual de cada equipo
    const rows = []
    for (const eq of equipos) {
      if (!eq.componentes_actuales?.length) {
        rows.push({
          'Serial':          eq.serial,
          'Modelo':          eq.modelo,
          'Product #':       eq.product_number || '—',
          'Tipo':            eq.tipo_equipo,
          'Cliente':         eq.cliente || '—',
          'Estado equipo':   eq.estado,
          'Part Number':     '—',
          'Descripción':     '—',
          'Categoría':       '—',
          'CT':              '—',
          'Estado componente': '—',
        })
      } else {
        for (const c of eq.componentes_actuales) {
          rows.push({
            'Serial':          eq.serial,
            'Modelo':          eq.modelo,
            'Product #':       eq.product_number || '—',
            'Tipo':            eq.tipo_equipo,
            'Cliente':         eq.cliente || '—',
            'Estado equipo':   eq.estado,
            'Part Number':     c.part_number,
            'Descripción':     c.descripcion,
            'Categoría':       c.categoria,
            'CT':              c.ct || '—',
            'Estado componente': c.estado,
          })
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch:16 },{ wch:30 },{ wch:12 },{ wch:10 },{ wch:18 },{ wch:22 },{ wch:16 },{ wch:40 },{ wch:12 },{ wch:14 },{ wch:22 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos Donantes')
    XLSX.writeFile(wb, `equipos_donantes_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Reporte de equipos exportado')
  } catch { toast.error('Error exportando equipos') }
}

export default function Reportes() {
  const [tab, setTab]       = useState(0)
  const [data, setData]     = useState({})
  const [loading, setLoading] = useState({})

  useEffect(() => {
    if (data[tab] !== undefined) return
    setLoading(l => ({ ...l, [tab]: true }))
    const calls = [api.pendientesDevolucion, api.pendientesReponer, api.donantesIncompletos, api.estatusComponentes]
    calls[tab]().then(r => setData(d => ({ ...d, [tab]: r.data }))).catch(() => toast.error('Error')).finally(() => setLoading(l => ({ ...l, [tab]: false })))
  }, [tab])

  const rows = data[tab]
  const isLoading = loading[tab]

  return (
    <>
      <PageHeader title="Reportes" actions={
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={exportarInventario}>⬇ Inventario componentes</button>
          <button className="btn-ghost" onClick={exportarEquipos}>⬇ Equipos donantes</button>
        </div>
      } />
      <div className="p-4 md:p-7">
        <div className="flex border-b border-border mb-5">
          {TABS.map((t,i) => <button key={t} onClick={() => setTab(i)}
            className={`px-5 py-2.5 text-xs transition-all border-b-2 -mb-px ${i===tab?'text-primary border-accent':'text-t2 border-transparent hover:text-t1'}`}>
            {t}{data[i]&&<span className="ml-1.5 text-[10px] text-t3">({data[i].length})</span>}
          </button>)}
        </div>
        <div className="card overflow-x-auto table-wrap">
          {isLoading ? <Spinner /> : !rows ? null : rows.length===0 ? <EmptyState msg="Sin registros ✓" /> : <>
            {tab===0 && <table className="w-full"><thead><tr><th className="th">Componente</th><th className="th">Caso</th><th className="th">Origen</th><th className="th">Técnico</th><th className="th">Desde</th><th className="th">Días</th></tr></thead>
              <tbody>{rows.map(m => { const dias=Math.floor((Date.now()-new Date(m.creado_en))/86400000); return (
                <tr key={m.id} className="tr">
                  <td className="td"><span className="tag">{m.componente?.categoria}</span><span className="font-mono text-primary text-xs">{m.componente?.part_number}</span></td>
                  <td className="td font-mono text-primary">{m.numero_caso}</td>
                  <td className="td font-mono text-t3">{m.origen?.serial||'BODEGA'}</td>
                  <td className="td text-t2">{m.usuario?.nombre}</td>
                  <td className="td text-t3">{new Date(m.creado_en).toLocaleDateString('es-CO')}</td>
                  <td className="td"><span className={dias>7?'text-danger':dias>3?'text-warn':'text-ok'}>{dias}d</span></td>
                </tr>
              )})}</tbody></table>}
            {tab===1 && <table className="w-full"><thead><tr><th className="th">Part Number</th><th className="th">Descripción</th><th className="th">CT</th><th className="th">Categoría</th><th className="th">Ubicación</th><th className="th"></th></tr></thead>
              <tbody>{rows.map(c => (<tr key={c.id} className="tr">
                <td className="td font-mono text-primary">{c.part_number}</td><td className="td text-t2">{c.descripcion}</td>
                <td className="td font-mono text-t3">{c.ct||'—'}</td><td className="td"><span className="tag">{c.categoria}</span></td>
                <td className="td font-mono text-t2">{c.equipo_actual?.serial||'BODEGA'}</td>
                <td className="td"><Link to={`/intranet/daas/componentes/${c.id}`} className="btn-ghost text-[11px] px-2.5 py-1">Ver →</Link></td>
              </tr>))}</tbody></table>}
            {tab===2 && <table className="w-full"><thead><tr><th className="th">Serial</th><th className="th">Modelo</th><th className="th">Estado</th><th className="th">Faltantes</th><th className="th"></th></tr></thead>
              <tbody>{rows.map(eq => (<tr key={eq.id} className="tr">
                <td className="td font-mono text-primary">{eq.serial}</td><td className="td text-t2">{eq.modelo}</td>
                <td className="td"><Badge value={eq.estado} /></td>
                <td className="td"><div className="flex flex-wrap gap-1">{eq.piezas_faltantes?.slice(0,3).map((f,i)=><span key={i} className="tag text-warn">{f.part_number}</span>)}{eq.piezas_faltantes?.length>3&&<span className="tag text-t3">+{eq.piezas_faltantes.length-3}</span>}</div></td>
                <td className="td"><Link to={`/intranet/daas/equipos/${eq.id}`} className="btn-ghost text-[11px] px-2.5 py-1">Ver →</Link></td>
              </tr>))}</tbody></table>}
            {tab===3 && <table className="w-full"><thead><tr><th className="th">Part Number</th><th className="th">Descripción</th><th className="th">CT</th><th className="th">Categoría</th><th className="th">Estado</th><th className="th">Ubicación</th><th className="th">Caso activo</th><th className="th"></th></tr></thead>
              <tbody>{rows.map(c => (<tr key={c.id} className="tr">
                <td className="td font-mono text-primary">{c.part_number}</td><td className="td text-t2 max-w-[160px] truncate">{c.descripcion}</td>
                <td className="td font-mono text-t3">{c.ct||'—'}</td><td className="td"><span className="tag">{c.categoria}</span></td>
                <td className="td"><Badge value={c.estado} /></td>
                <td className="td font-mono text-t2">{c.equipo_actual?.serial||'BODEGA'}</td>
                <td className="td font-mono text-primary">{c.movimientos?.[0]?.numero_caso||'—'}</td>
                <td className="td"><Link to={`/intranet/daas/componentes/${c.id}`} className="btn-ghost text-[11px] px-2.5 py-1">Ver →</Link></td>
              </tr>))}</tbody></table>}
          </>}
        </div>
      </div>
    </>
  )
}