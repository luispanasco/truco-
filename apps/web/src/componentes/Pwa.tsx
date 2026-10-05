import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useJuego } from '../estado'
import {
  abiertaComoApp,
  ayudaIOSCerrada,
  cerrarAyudaIOS,
  instalar,
  mostrarAyudaIOS,
  puedeAvisarActualizacion,
  usePwa,
} from '../pwa'
import '../estilos-pwa.css'

/**
 * "Hay una versión nueva · Actualizar", arriba y chiquito. Solo fuera de la partida: en el
 * inicio o con la partida terminada (nunca se recarga solo, y menos jugando).
 */
export function AvisoActualizacion() {
  const { versionNueva, actualizar } = usePwa()
  const ruta = useLocation().pathname
  const terminada = useJuego((s) => s.vista?.ganador != null)
  const navegar = useNavigate()
  if (!versionNueva || !puedeAvisarActualizacion(ruta, terminada)) return null
  return (
    <div className="aviso-version" role="status">
      <span>Hay una versión nueva</span>
      <button
        type="button"
        className="aviso-version-boton"
        onClick={() => {
          // Desde el fin de partida se sale de la mesa: la versión nueva arranca en el inicio.
          if (ruta === '/mesa') {
            useJuego.getState().salir()
            navegar('/', { replace: true })
          }
          actualizar()
        }}
      >
        Actualizar
      </button>
    </div>
  )
}

/**
 * En el inicio: "Instalar la app" cuando el navegador lo permite, o en Safari de iPhone/iPad
 * cómo agregarla a la pantalla de inicio (se puede cerrar y no vuelve).
 */
export function InstalarApp() {
  const evento = usePwa((s) => s.eventoInstalar)
  const [ayudaIOS, setAyudaIOS] = useState(() =>
    typeof navigator === 'undefined' ? false : mostrarAyudaIOS(navigator, abiertaComoApp(), ayudaIOSCerrada()),
  )

  if (evento) {
    return (
      <button type="button" className="boton boton-secundario boton-instalar" onClick={() => void instalar()}>
        <span aria-hidden="true">📲</span> Instalar la app
      </button>
    )
  }
  if (!ayudaIOS) return null
  return (
    <div className="ayuda-instalar" role="note">
      <p>
        <strong>Instalala en tu {/iPhone|iPod/.test(navigator.userAgent) ? 'iPhone' : 'iPad'}:</strong> tocá Compartir{' '}
        <svg className="icono-compartir" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2v11M6 6l4-4 4 4M5 9H3.5v9h13V9H15" />
        </svg>{' '}
        y después «Agregar a inicio».
      </p>
      <button
        type="button"
        className="ayuda-instalar-cerrar"
        aria-label="Cerrar"
        onClick={() => {
          cerrarAyudaIOS()
          setAyudaIOS(false)
        }}
      >
        ×
      </button>
    </div>
  )
}
