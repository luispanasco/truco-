import { useEffect, useRef, useState } from 'react'
import { useCuenta } from '../cuenta/cuenta'
import { fechaNovedad, marcarNovedadesVistas, NOVEDADES, novedadesPorVer, type Novedad, type TipoCambio } from '../novedades'
import { yaUsoLaApp } from '../recorrido/bandera'
import { useAvisoReportes } from './AvisoReportes'
import { Hoja } from './Hoja'
import '../estilos-novedades.css'

const ETIQUETA: Record<TipoCambio, string> = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' }

/** Las novedades de cada versión: la versión, el día, el título y los cambios con su etiqueta. */
export function ListaNovedades({ novedades }: { novedades: readonly Novedad[] }) {
  return (
    <div className="lista-novedades">
      {novedades.map((n) => (
        <section key={n.version} className="novedad" aria-label={`Versión ${n.version}`}>
          <header className="novedad-cabeza">
            <strong>Versión {n.version}</strong>
            <small>{fechaNovedad(n.fecha)}</small>
          </header>
          <h3 className="novedad-titulo">{n.titulo}</h3>
          <ul className="novedad-cambios">
            {n.cambios.map((c) => (
              <li key={c.texto}>
                <span className={`novedad-tipo ${c.tipo}`}>{ETIQUETA[c.tipo]}</span>
                <span>{c.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Todas las novedades (desde Ajustes). */
export function HojaNovedades({ alCerrar }: { alCerrar: () => void }) {
  useEffect(() => marcarNovedadesVistas(), [])
  return (
    <Hoja titulo="Novedades" alCerrar={alCerrar} clase="hoja-menu hoja-novedades" claseFondo="hoja-fija">
      <ListaNovedades novedades={NOVEDADES} />
    </Hoja>
  )
}

/**
 * Al abrir la app: si salió una versión que no viste, lo nuevo desde tu última visita. Espera al
 * aviso de reportes solucionados (no salen dos hojas juntas) y a saber si tenés la cuenta abierta
 * (para no tratarte de nuevo). Al cerrarla no vuelve hasta la próxima versión.
 */
export function AvisoNovedades() {
  const estadoCuenta = useCuenta((s) => s.estado)
  const reportesTerminado = useAvisoReportes((s) => s.terminado)
  const [porVer, setPorVer] = useState<Novedad[]>([])
  const decidido = useRef(false)

  useEffect(() => {
    if (decidido.current || estadoCuenta === 'cargando' || estadoCuenta === 'entrando' || !reportesTerminado) return
    decidido.current = true
    setPorVer(novedadesPorVer(estadoCuenta !== 'adentro' && !yaUsoLaApp()))
  }, [estadoCuenta, reportesTerminado])

  if (porVer.length === 0) return null
  const cerrar = () => {
    marcarNovedadesVistas()
    setPorVer([])
  }
  return (
    <Hoja titulo="¡Novedades!" alCerrar={cerrar} clase="hoja-menu hoja-novedades" claseFondo="hoja-fija">
      <ListaNovedades novedades={porVer} />
      <button type="button" className="boton boton-grande boton-relieve novedades-listo" onClick={cerrar}>
        ¡Dale!
      </button>
    </Hoja>
  )
}
