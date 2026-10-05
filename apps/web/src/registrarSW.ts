import { registerSW } from 'virtual:pwa-register'
import { guardarBarajaSinConexion } from './baraja'
import { usePwa } from './pwa'

/** Cada cuánto se fija si hay una versión nueva, con la app abierta mucho rato (instalada). */
const REVISAR_CADA_MS = 60 * 60 * 1000

/**
 * Registra el service worker (solo existe en la versión compilada). Nunca recarga solo: cuando
 * hay una versión nueva, la deja esperando y avisa (AvisoActualizacion), que la ofrece fuera de
 * la partida.
 */
export function registrarSW() {
  if (!('serviceWorker' in navigator)) return
  // Si la persona tocó "Actualizar" en esta pestaña, se recarga al tomar el control la versión nueva.
  let pedida = false
  const activarNueva = registerSW({
    onNeedRefresh() {
      usePwa.setState({
        versionNueva: true,
        actualizar: () => {
          pedida = true
          void activarNueva(true)
        },
      })
    },
    // La versión nueva tomó el control: si la activó otra pestaña, esta no se recarga sola
    // (puede estar en plena partida); queda el aviso, que ahora solo recarga.
    onNeedReload() {
      if (pedida) window.location.reload()
      else usePwa.setState({ versionNueva: true, actualizar: () => window.location.reload() })
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return
      setInterval(() => {
        if (navigator.onLine && !registro.installing) void registro.update()
      }, REVISAR_CADA_MS)
    },
  })

  // Con el service worker al mando (enseguida, o recién instalado), la baraja clásica queda guardada.
  if (navigator.serviceWorker.controller) void guardarBarajaSinConexion()
  navigator.serviceWorker.addEventListener('controllerchange', () => void guardarBarajaSinConexion())
}
