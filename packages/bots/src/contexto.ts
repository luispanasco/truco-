import {
  crearBaraja,
  equipoDe,
  fuerza,
  mismaCarta,
  siguienteAleatorio,
  type Carta,
  type ConfigSala,
  type Equipo,
  type VistaEnfrentamiento,
  type VistaPartida,
} from '@truco/engine'
import type { Senia, SeniasRecibidas } from './senias'

export class Aleatorio {
  constructor(private estado: number) {}
  sig(): number {
    const [r, nuevo] = siguienteAleatorio(this.estado)
    this.estado = nuevo
    return r
  }
  /** true con probabilidad p. */
  chance(p: number): boolean {
    return this.sig() < p
  }
}

/** Todo lo que el bot sabe en este momento, sacado solo de su vista y de las señas. */
export interface Contexto {
  vista: VistaPartida
  config: ConfigSala
  yo: number
  equipo: Equipo
  rival: Equipo
  n: number
  e: VistaEnfrentamiento
  muestra: Carta
  misCartas: Carta[]
  miTanto: { envido: number; flor: number | null }
  /** Cartas jugadas por cada asiento en esta mano (todos los duelos). */
  jugadas: Map<number, Carta[]>
  /** Cartas que el bot no vio: pueden estar en manos ajenas o en el mazo. */
  pool: Carta[]
  /** Participantes del enfrentamiento actual, sin contar al bot. */
  otros: number[]
  companeros: number[]
  rivales: number[]
  senias: Map<number, Senia[]>
  rng: Aleatorio
  cache: Map<string, unknown>
}

export function crearContexto(vista: VistaPartida, senias: SeniasRecibidas | undefined, rng: Aleatorio): Contexto {
  const yo = vista.yo.asiento
  const equipo = vista.yo.equipo
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const jugadas = new Map<number, Carta[]>()
  for (const enf of vista.mano.enfrentamientos) {
    for (const v of enf.vueltas) {
      for (const j of v.jugadas) jugadas.set(j.asiento, [...(jugadas.get(j.asiento) ?? []), j.carta])
    }
  }
  const vistas = [vista.mano.muestra, ...vista.mano.misCartas, ...[...jugadas.values()].flat()]
  const pool = crearBaraja().filter((c) => !vistas.some((v) => mismaCarta(v, c)))
  const otros = e.participantes.filter((a) => a !== yo)
  return {
    vista,
    config: vista.config,
    yo,
    equipo,
    rival: equipo === 0 ? 1 : 0,
    n: vista.jugadores.length,
    e,
    muestra: vista.mano.muestra,
    misCartas: vista.mano.misCartas,
    miTanto: vista.mano.miTanto,
    jugadas,
    pool,
    otros,
    companeros: otros.filter((a) => equipoDe(a) === equipo),
    rivales: otros.filter((a) => equipoDe(a) !== equipo),
    senias: new Map(Object.entries(senias ?? {}).map(([a, s]) => [Number(a), s])),
    rng,
    cache: new Map(),
  }
}

export function memo<T>(ctx: Contexto, clave: string, f: () => T): T {
  if (!ctx.cache.has(clave)) ctx.cache.set(clave, f())
  return ctx.cache.get(clave) as T
}

export type PendienteVista = 'flor' | 'envido' | 'declaracion' | 'truco'

export function pendiente(e: VistaEnfrentamiento): PendienteVista | null {
  if (e.flor.estado === 'pendiente') return 'flor'
  if (e.envido.estado === 'pendiente') return 'envido'
  if (e.envido.estado === 'declarando') return 'declaracion'
  if (e.truco.pendiente) return 'truco'
  return null
}

export function jugoEnPrimera(e: VistaEnfrentamiento, asiento: number): boolean {
  return e.vueltas[0]?.jugadas.some((j) => j.asiento === asiento) ?? false
}

/** Carta más alta jugada en la vuelta en curso y el equipo que la tiró; null si nadie jugó. */
export function mejorDeLaVuelta(ctx: Contexto): { f: number; equipo: Equipo | 'parda' } | null {
  const vuelta = ctx.e.vueltas[ctx.e.vueltas.length - 1]!
  if (vuelta.jugadas.length === 0) return null
  const f = Math.max(...vuelta.jugadas.map((j) => fuerza(j.carta, ctx.muestra)))
  const equipos = new Set(vuelta.jugadas.filter((j) => fuerza(j.carta, ctx.muestra) === f).map((j) => equipoDe(j.asiento)))
  return { f, equipo: equipos.size > 1 ? 'parda' : [...equipos][0]! }
}

export function f(ctx: Contexto, c: Carta): number {
  return fuerza(c, ctx.muestra)
}

/** Cartas ordenadas de menor a mayor fuerza. */
export function ordenadas(ctx: Contexto, cartas: readonly Carta[]): Carta[] {
  return [...cartas].sort((a, b) => f(ctx, a) - f(ctx, b))
}

/** Lo que vale la falta envido ahora, para el equipo `ganador`. */
export function valorFalta(ctx: Contexto, ganador: Equipo): number {
  const { puntosPartida, puntosMalas, faltaEnvidoEnMalas } = ctx.config
  const [a, b] = ctx.vista.puntos
  const lider = Math.max(a, b)
  if (faltaEnvidoEnMalas === 'ganaPartido' && a <= puntosMalas && b <= puntosMalas) {
    return puntosPartida - ctx.vista.puntos[ganador]
  }
  if (faltaEnvidoEnMalas === 'completarMalas' && lider < puntosMalas) return puntosMalas - lider
  return puntosPartida - lider
}

/** Puntos que le faltan al equipo para ganar. */
export function faltanPara(ctx: Contexto, equipo: Equipo): number {
  return ctx.config.puntosPartida - ctx.vista.puntos[equipo]
}
