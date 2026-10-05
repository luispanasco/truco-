import type { Carta } from './cartas'
import type { ConfigSala } from './config'
import { fuerza } from './jerarquia'
import type {
  CantoEnvido,
  CantoHecho,
  Declaracion,
  Enfrentamiento,
  Equipo,
  EstadoPartida,
  Jugada,
  ResultadoVuelta,
} from './tipos'

export function equipoDe(asiento: number): Equipo {
  return (asiento % 2) as Equipo
}

export function otroEquipo(e: Equipo): Equipo {
  return e === 0 ? 1 : 0
}

export function ultimo<T>(xs: readonly T[]): T {
  const x = xs[xs.length - 1]
  if (x === undefined) throw new Error('Lista vacía')
  return x
}

/** Asientos ordenados en sentido antihorario empezando por `inicio`. */
export function ordenDesde(asientos: readonly number[], inicio: number, n: number): number[] {
  return [...asientos].sort((a, b) => ((a - inicio + n) % n) - ((b - inicio + n) % n))
}

/** Resultado de una vuelta completa: el equipo de la carta más alta, o parda si empatan equipos distintos. */
export function resolverVuelta(
  jugadas: readonly Jugada[],
  muestra: Carta,
): { resultado: ResultadoVuelta; ganador: number | null } {
  const max = Math.max(...jugadas.map((j) => fuerza(j.carta, muestra)))
  const top = jugadas.filter((j) => fuerza(j.carta, muestra) === max)
  const equipos = new Set(top.map((j) => equipoDe(j.asiento)))
  if (equipos.size > 1) return { resultado: 'parda', ganador: null }
  const primero = top[0] as Jugada
  return { resultado: equipoDe(primero.asiento), ganador: primero.asiento }
}

/**
 * Equipo que gana la mano según las vueltas jugadas, o null si todavía no se define.
 * - Gana quien gana 2.
 * - Primera parda: define la segunda; si también es parda, la tercera; todas pardas, gana el mano.
 * - Primera con ganador y segunda parda: gana el de la primera.
 * - Una y una con tercera parda: gana el de la primera.
 */
export function ganadorPorVueltas(resultados: readonly ResultadoVuelta[], equipoMano: Equipo): Equipo | null {
  const [a, b, c] = resultados
  if (a === undefined || b === undefined) return null
  if (a === 'parda') {
    if (b !== 'parda') return b
    if (c === undefined) return null
    return c === 'parda' ? equipoMano : c
  }
  if (b === 'parda' || a === b) return a
  if (c === undefined) return null
  return c === 'parda' ? a : c
}

const VALOR_ENVIDO: Record<Exclude<CantoEnvido, 'faltaEnvido'>, number> = { envido: 2, realEnvido: 3 }

/** Si `canto` se puede agregar a la cadena de envido ya cantada. */
export function puedeEncadenarEnvido(
  cantos: readonly CantoHecho<CantoEnvido>[],
  canto: CantoEnvido,
  config: ConfigSala,
): boolean {
  const hay = (c: CantoEnvido) => cantos.filter((x) => x.canto === c).length
  if (hay('faltaEnvido') > 0) return false
  if (canto === 'faltaEnvido') return true
  if (canto === 'realEnvido') return hay('realEnvido') === 0
  return hay('realEnvido') === 0 && hay('envido') < (config.envidoEnvido ? 2 : 1)
}

/** No querido: 1 si era el primer canto, o lo acumulado antes del último. */
export function puntosEnvidoNoQuerido(cantos: readonly CantoHecho<CantoEnvido>[]): number {
  if (cantos.length <= 1) return 1
  return cantos.slice(0, -1).reduce((s, c) => s + (c.canto === 'faltaEnvido' ? 0 : VALOR_ENVIDO[c.canto]), 0)
}

/** Querido: la suma de los cantos, o la falta si se cantó falta envido. */
export function puntosEnvidoQuerido(cantos: readonly CantoHecho<CantoEnvido>[], falta: number): number {
  if (cantos.some((c) => c.canto === 'faltaEnvido')) return falta
  return cantos.reduce((s, c) => s + (c.canto === 'faltaEnvido' ? 0 : VALOR_ENVIDO[c.canto]), 0)
}

/** Lo que vale la falta envido para el equipo que la gana. */
export function valorFalta(estado: EstadoPartida, ganador: Equipo): number {
  const { puntosPartida, puntosMalas, faltaEnvidoEnMalas } = estado.config
  const [a, b] = estado.puntos
  const lider = Math.max(a, b)
  if (faltaEnvidoEnMalas === 'ganaPartido' && a <= puntosMalas && b <= puntosMalas) {
    return puntosPartida - estado.puntos[ganador]
  }
  // Con 15 ya se completaron las malas: de ahí en más la falta es para ganar.
  if (faltaEnvidoEnMalas === 'completarMalas' && lider < puntosMalas) return puntosMalas - lider
  return puntosPartida - lider
}

/** Lo que vale la contraflor al resto: lo que le falta al que va ganando. */
export function valorResto(estado: EstadoPartida): number {
  return estado.config.puntosPartida - Math.max(...estado.puntos)
}

/** Si una declaración le gana a otra: tanto mayor, o igual y más cerca del mano. */
export function supera(e: Enfrentamiento, nueva: Declaracion, mejor: Declaracion): boolean {
  const t1 = nueva.tanto ?? -1
  const t2 = mejor.tanto ?? -1
  if (t1 !== t2) return t1 > t2
  return e.participantes.indexOf(nueva.asiento) < e.participantes.indexOf(mejor.asiento)
}

export function mejorDeclaracion(e: Enfrentamiento): Declaracion | null {
  let mejor: Declaracion | null = null
  for (const d of e.envido.declaraciones) {
    if (d.tanto === null) continue
    if (mejor === null || supera(e, d, mejor)) mejor = d
  }
  return mejor
}

/** Próximo asiento que tiene que declarar, o null si ya se definió el envido. */
export function siguienteDeclarante(e: Enfrentamiento): number | null {
  const mejor = mejorDeclaracion(e)
  const equipoMejor = mejor ? equipoDe(mejor.asiento) : null
  return e.envido.porDeclarar.find((a) => equipoDe(a) !== equipoMejor) ?? null
}

/** Qué está esperando respuesta en el enfrentamiento, de lo más reciente a lo más viejo. */
export type Pendiente = 'flor' | 'envido' | 'declaracion' | 'truco'

export function pendienteActual(e: Enfrentamiento): Pendiente | null {
  if (e.flor.estado === 'pendiente') return 'flor'
  if (e.envido.estado === 'pendiente') return 'envido'
  if (e.envido.estado === 'declarando') return 'declaracion'
  if (e.truco.pendiente) return 'truco'
  return null
}

/** Equipo que cantó lo pendiente (el que espera respuesta). */
export function equipoQueCanto(e: Enfrentamiento, p: Exclude<Pendiente, 'declaracion'>): Equipo {
  if (p === 'truco') return (e.truco.pendiente as NonNullable<typeof e.truco.pendiente>).equipo
  if (p === 'envido') return ultimo(e.envido.cantos).equipo
  return ultimo(e.flor.contra).equipo
}
