import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { textoTipoReporte, type ReporteListado } from '@truco/shared'
import { CabeceraOnline } from '../componentes/Online'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { listarReportes } from '../reportes'
import '../estilos-reportes.css'

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
