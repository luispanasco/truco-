import { create } from 'zustand'

/**
 * La app instalable: aviso de versión nueva e instalación. El service worker se registra en
 * registrarSW.ts (solo en la versión compilada); acá queda la lógica, para poder probarla.
 */

/** El evento `beforeinstallprompt` (no está en los tipos del DOM porque no es estándar). */
export interface EventoInstalar extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface EstadoPwa {
  /** Hay una versión nueva esperando (o ya activa, si se actualizó desde otra pestaña). */
  versionNueva: boolean
  /** Pasa a la versión nueva y recarga. Se llama solo cuando la persona toca "Actualizar". */
  actualizar: () => void
  /** Pedido de instalación que guardó el navegador (Chrome, Edge, Android). */
  eventoInstalar: EventoInstalar | null
}

export const usePwa = create<EstadoPwa>(() => ({
  versionNueva: false,
  actualizar: () => window.location.reload(),
  eventoInstalar: null,
}))

/**
 * Pantallas donde se puede recargar sin perder nada: fuera de una sala. En la mesa, solo con la
 * partida terminada; en la espera de una sala o buscando partida, nunca.
 */
const RUTAS_LIBRES = ['/', '/crear', '/unirme', '/baraja']

export function puedeAvisarActualizacion(ruta: string, partidaTerminada: boolean): boolean {
  return RUTAS_LIBRES.includes(ruta) || (ruta === '/mesa' && partidaTerminada)
}

// ── Instalar ─────────────────────────────────────────────────────────

/** Guarda el pedido de instalación del navegador para ofrecerlo con un botón propio. */
export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    usePwa.setState({ eventoInstalar: e as EventoInstalar })
  })
  window.addEventListener('appinstalled', () => usePwa.setState({ eventoInstalar: null }))
}

/** Abre el diálogo de instalación del navegador. El pedido sirve una sola vez. */
export async function instalar() {
  const evento = usePwa.getState().eventoInstalar
  if (!evento) return
  usePwa.setState({ eventoInstalar: null })
  await evento.prompt()
  await evento.userChoice.catch(() => null)
}

interface Navegador {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
}

/** iPhone o iPad. Los iPad nuevos dicen ser una Mac, pero tienen pantalla táctil. */
export function esIOS(n: Navegador): boolean {
  return /iPhone|iPad|iPod/.test(n.userAgent) || (n.platform === 'MacIntel' && (n.maxTouchPoints ?? 0) > 1)
}

/** Safari de verdad: en iOS, Chrome, Firefox y compañía también dicen "Safari". */
export function esSafari(ua: string): boolean {
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)
}

/** Ya abierta como app (desde el ícono del inicio). */
export function abiertaComoApp(): boolean {
  if (typeof window === 'undefined') return false
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true
}

const CLAVE_AYUDA_IOS = 'truco.ayudaInstalarCerrada'

export function ayudaIOSCerrada(): boolean {
  try {
    return localStorage.getItem(CLAVE_AYUDA_IOS) === '1'
  } catch {
    return false
  }
}

export function cerrarAyudaIOS() {
  try {
    localStorage.setItem(CLAVE_AYUDA_IOS, '1')
  } catch {
    // Sin almacenamiento: se cierra igual, pero vuelve a aparecer la próxima vez.
  }
}

/** En Safari de iPhone/iPad no hay `beforeinstallprompt`: se explica cómo agregarla a mano. */
export function mostrarAyudaIOS(n: Navegador, comoApp: boolean, cerrada: boolean): boolean {
  return esIOS(n) && esSafari(n.userAgent) && !comoApp && !cerrada
}
