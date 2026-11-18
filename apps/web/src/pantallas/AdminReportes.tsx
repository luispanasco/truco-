import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MAX_MENSAJE_SOLUCIONADO, MENSAJE_SOLUCIONADO, PREMIO_REPORTE, textoTipoReporte, type ReporteListado } from '@truco/shared'
import { CabeceraOnline } from '../componentes/Online'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { listarReportes, solucionarReporte } from '../reportes'
import '../estilos-reportes.css'

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Marcar un reporte solucionado: quien lo mandó ve el mensaje al abrir la app y, si tiene cuenta
 * y se premia, cobra las monedas.
 */
function Solucionar({ reporte, alSolucionar }: { reporte: ReporteListado; alSolucionar: (r: ReporteListado) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState(MENSAJE_SOLUCIONADO)
  const [premiar, setPremiar] = useState(reporte.cuentaId !== null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (reporte.solucionado) {
    return (
      <span className="reporte-solucionado">
        ✔ Solucionado el {fecha(reporte.solucionado)}
        {reporte.premio > 0 ? ` · +${reporte.premio} monedas` : ''}
      </span>
    )
  }
  if (!abierto) {
    return (
      <button type="button" className="boton boton-secundario" onClick={() => setAbierto(true)}>
        Marcar solucionado
      </button>
    )
  }
  const confirmar = async () => {
    setEnviando(true)
    setError(null)
    try {
      const r = await solucionarReporte(reporte.id, mensaje, premiar)
      alSolucionar({ ...reporte, ...r })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo')
      setEnviando(false)
    }
  }
  return (
    <div className="reporte-solucionar" role="group" aria-label={`Solucionar el reporte ${reporte.id}`}>
      <label>
        <small>Lo que ve {reporte.apodo} al abrir la app</small>
        <textarea value={mensaje} maxLength={MAX_MENSAJE_SOLUCIONADO} rows={2} onChange={(e) => setMensaje(e.target.value)} />
      </label>
      {reporte.cuentaId ? (
        <label className="reporte-premiar">
          <input type="checkbox" checked={premiar} onChange={(e) => setPremiar(e.target.checked)} />
          Darle {PREMIO_REPORTE} monedas
        </label>
      ) : (
        <small>Es invitado: ve el aviso, pero no tiene dónde cobrar monedas.</small>
      )}
      {error && <small className="reporte-error">⚠ {error}</small>}
      <div className="reporte-solucionar-botones">
        <button type="button" className="boton" disabled={enviando} onClick={() => void confirmar()}>
          {enviando ? 'Marcando…' : 'Confirmar'}
        </button>
        <button type="button" className="boton boton-secundario" disabled={enviando} onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

/** Solo el admin: los reportes de problemas de los testers, del más nuevo al más viejo. */
export function AdminReportes() {
  const navegar = useNavigate()
  const estado = useCuenta((s) => s.estado)
  const admin = useCuenta((s) => s.cuenta?.admin === true)
  const [reportes, setReportes] = useState<ReporteListado[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => void iniciarCuenta(), [])
  useEffect(() => {
    if (estado !== 'adentro' || !admin) return
    listarReportes().then(setReportes, (e: unknown) => setError(e instanceof Error ? e.message : 'No se pudieron traer'))
  }, [estado, admin])

  const aviso =
    estado === 'cargando' || estado === 'entrando'
      ? 'Cargando…'
      : !admin
        ? 'Esta pantalla es solo para el admin.'
        : (error ?? (reportes === null ? 'Cargando…' : reportes.length === 0 ? 'No hay reportes.' : null))

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Reportes" />
      {aviso ? (
        <section className="tarjeta">
          <p className="nota-izq">{aviso}</p>
        </section>
      ) : (
        <ul className="lista-reportes">
          {reportes!.map((r) => (
            <li key={r.id} className="tarjeta reporte-item">
              <div className="reporte-item-cabeza">
                <span className="reporte-tipo">{textoTipoReporte(r.tipo)}</span>
                <small>
                  #{r.id} · {fecha(r.fecha)}
                </small>
              </div>
              <strong>
                {r.apodo}
                {r.email ? <small> · {r.email}</small> : <small> · invitado</small>}
              </strong>
              {r.descripcion ? <p className="reporte-descripcion">{r.descripcion}</p> : <small>(sin descripción)</small>}
              <small>
                {r.donde}
                {r.ruta ? ` · ${r.ruta}` : ''}
                {r.version ? ` · ${r.version}` : ''}
              </small>
              {r.conRepeticion && (
                <button type="button" className="boton boton-secundario" onClick={() => navegar(`/admin/reportes/${r.id}/partida`)}>
                  Ver la partida
                </button>
              )}
              <Solucionar reporte={r} alSolucionar={(nuevo) => setReportes((rs) => rs!.map((x) => (x.id === nuevo.id ? nuevo : x)))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
