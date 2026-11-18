/**
 * Las novedades de cada versión, de la más nueva a la más vieja. Se agrega una entrada cada vez
 * que se publica algo que el jugador nota (con `main`); la primera es la versión de la app.
 * Los textos son para jugadores: qué cambia para ellos, no cómo se hizo.
 */

export type TipoCambio = 'nuevo' | 'mejora' | 'arreglo'

export interface Novedad {
  /** "1.0", "1.1"… (para un cambio grande, "2.0"). */
  version: string
  /** El día que se publicó (AAAA-MM-DD). */
  fecha: string
  titulo: string
  cambios: { tipo: TipoCambio; texto: string }[]
}

export const NOVEDADES: Novedad[] = [
  {
    version: '1.1',
    fecha: '2026-11-18',
    titulo: 'Más cómodo en pantallas chicas',
    cambios: [
      { tipo: 'arreglo', texto: 'Las novedades y el aviso de reportes arreglados ahora se pueden deslizar, y el botón para cerrarlos queda siempre a la vista.' },
    ],
  },
  {
    version: '1.0',
    fecha: '2026-11-18',
    titulo: 'Online en equipo y gracias por avisar',
    cambios: [
      { tipo: 'nuevo', texto: 'Online 2 vs 2 y 3 vs 3 con desconocidos: buscá partida solo, o salí con los de tu sala a buscar rivales.' },
      { tipo: 'nuevo', texto: 'Si reportás un problema y lo arreglamos, te avisamos al abrir la app y, con cuenta, te llevás 100 monedas.' },
      { tipo: 'nuevo', texto: 'Estas novedades: cada vez que haya cambios, te los contamos acá. Están siempre en Ajustes.' },
      { tipo: 'nuevo', texto: 'Podés borrar tu cuenta desde Ajustes.' },
      { tipo: 'arreglo', texto: 'Las señas de la partida anterior ya no aparecen en la siguiente (parecía que tu compañero tenía 5 cartas).' },
      { tipo: 'arreglo', texto: 'Al contestar un envido se puede subir aunque ya hayas tirado tu carta.' },
      { tipo: 'arreglo', texto: 'Tocar muchas veces la misma seña ya no la manda de nuevo ni traba la mesa.' },
      { tipo: 'arreglo', texto: 'En 3 vs 3 el mazo queda siempre a la izquierda del mano.' },
    ],
  },
]

export const VERSION_ACTUAL = NOVEDADES[0]!.version

/** Compara "1.10" con "1.9" como números: negativo si `a` es más vieja. */
export function compararVersiones(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** "18 de noviembre" (o "18 nov." corto). */
export function fechaNovedad(fecha: string, corta = false): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString('es-UY', corta ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long' })
}

/** Lo que salió después de la última versión que viste (las más nuevas primero). */
export function novedadesDesde(vista: string, todas = NOVEDADES): Novedad[] {
  return todas.filter((n) => compararVersiones(n.version, vista) > 0)
}

export const CLAVE_NOVEDADES = 'truco.novedades'

export function leerVersionVista(): string | null | undefined {
  try {
    return localStorage.getItem(CLAVE_NOVEDADES)
  } catch {
    return undefined
  }
}

export function marcarNovedadesVistas(version = VERSION_ACTUAL) {
  try {
    localStorage.setItem(CLAVE_NOVEDADES, version)
  } catch {
    // Sin almacenamiento: no pasa nada (tampoco se muestran solas, ver `novedadesPorVer`).
  }
}

/** En los tests (vitest) no salen solas, salvo que el test lo pida. */
let automaticas = import.meta.env.MODE !== 'test'
export const novedadesAutomaticas = (si: boolean) => void (automaticas = si)

/** Cuántas versiones, como mucho, salen juntas al abrir la app (el resto está en Ajustes). */
const MAX_AL_ABRIR = 3

/**
 * Las que hay que mostrar al abrir la app. A quien es nuevo (`nuevo`) no le sale nada: para él
 * todo es nuevo; queda anotada la versión actual. Sin almacenamiento, tampoco (saldrían siempre).
 */
export function novedadesPorVer(nuevo: boolean): Novedad[] {
  if (!automaticas) return []
  const vista = leerVersionVista()
  if (vista === undefined) return []
  if (vista === null) {
    if (nuevo) {
      marcarNovedadesVistas()
      return []
    }
    return NOVEDADES.slice(0, 1)
  }
  return novedadesDesde(vista).slice(0, MAX_AL_ABRIR)
}
