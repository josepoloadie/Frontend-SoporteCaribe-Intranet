import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { partsurfer as psApi, equipos as eqApi } from '../../services/api'
import { PageHeader, FormGroup } from '../../components/ui'

export default function PartSurfer() {
  const [serial, setSerial]     = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [importing, setImporting] = useState(false)
  const navigate = useNavigate()

  async function consultar() {
    if (!serial.trim()) return toast.error('Ingresa un número de serie')
    setLoading(true); setResult(null)
    try { const { data } = await psApi.consultar(serial.trim().toUpperCase()); setResult(data) }
    catch (err) { toast.error(err.response?.data?.error || 'Error consultando HP PartSurfer') }
    finally { setLoading(false) }
  }

  async function importar() {
    if (!result) return
    setImporting(true)
    try {
      const { data: eq } = await eqApi.create({ serial: result.serial, modelo: result.modelo||'Sin modelo', tipo_equipo:'LAPTOP', estado:'COMPLETO' })
      await eqApi.saveConfig(eq.id, { raw_data: result, detalles: result.partes })
      toast.success(`Equipo importado con ${result.partes.length} componentes`)
      navigate(`/equipos/${eq.id}`)
    } catch (err) { toast.error(err.response?.data?.error || 'Error importando') }
    finally { setImporting(false) }
  }

  return (
    <>
      <PageHeader title="PartSurfer HP" />
      <div className="p-7 max-w-3xl">
        <div className="card p-6 mb-5">
          <div className="text-[10px] tracking-[0.15em] uppercase text-t3 mb-1">Consulta de Configuración Original</div>
          <div className="text-xs text-t2 mb-4">Consulta HP PartSurfer por número de serie para obtener los componentes originales de fábrica.</div>
          <div className="flex gap-2">
            <input className="input flex-1" value={serial} onChange={e=>setSerial(e.target.value.toUpperCase())} placeholder="Número de serie (Ej: 5CD40551BM)" onKeyDown={e=>e.key==='Enter'&&consultar()} />
            <button className="btn-primary px-6" onClick={consultar} disabled={loading}>{loading?'Consultando...':'⊕ Consultar HP'}</button>
          </div>
          {loading && <div className="mt-3 h-0.5 bg-border rounded overflow-hidden"><div className="h-full bg-accent rounded animate-pulse w-3/4" /></div>}
        </div>
        {result && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-blue-50">
              <div>
                <div className="font-display font-bold text-sm">{result.modelo||'HP Equipment'}</div>
                <div className="text-xs text-t3 mt-0.5">S/N: <span className="text-primary font-mono">{result.serial}</span> · {result.partes?.length} componentes</div>
              </div>
              <button className="btn-primary" onClick={importar} disabled={importing}>{importing?'Importando...':'⬇ Importar como Equipo Donante'}</button>
            </div>
            <table className="w-full">
              <thead><tr><th className="th">Part Number</th><th className="th">Descripción</th><th className="th">Categoría</th></tr></thead>
              <tbody>{result.partes?.map((p,i) => (<tr key={i} className="tr"><td className="td font-mono text-primary">{p.part_number}</td><td className="td text-t2">{p.descripcion}</td><td className="td"><span className="tag">{p.categoria}</span></td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}