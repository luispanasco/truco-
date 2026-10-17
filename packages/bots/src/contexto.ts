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
  /** El envido que le marcó cada uno con la seña de envido (compañeros, o rivales pescados). */
  envidoMarcado: Map<number, number>
  rng: Aleatorio
  cache: Map<string, unknown>
}

export function crearContexto(vista: VistaPartida, senias: SeniasRecibidas | undefined, rng: Aleatorio): Contexto {
  const yo = vista.yo.asiento
  const equipo = vista.yo.equipo
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const jugadas = new Map<number, Carta[]>()
  // Las cartas que no se ven (tapadas, piezas de otros duelos) siguen en el pool de las posibles.
  for (const enf of vista.mano.enfrentamientos) {
    for (const v of enf.vueltas) {
      for (const j of v.jugadas) if (j.carta) jugadas.set(j.asiento, [...(jugadas.get(j.asiento) ?? []), j.carta])
    }
  }
  const muestra = vista.mano.muestra
  if (!muestra) throw new Error('Todavía no se cortó el mazo')
  const vistas = [muestra, ...vista.mano.misCartas, ...[...jugadas.values()].flat()]
  const pool = crearBaraja().filter((c) => !vistas.some((v) => mismaCarta(v, c)))
  const otros = e.participantes.filter((a) => a !== yo && !e.retirados.includes(a))
  return {
    vista,
    config: vista.config,
    yo,
    equipo,
    rival: equipo === 0 ? 1 : 0,
    n: vista.jugadores.length,
    e,
    muestra,
    misCartas: vista.mano.misCartas,
    miTanto: vista.mano.miTanto,
    jugadas,
    pool,
    otros,
    companeros: otros.filter((a) => equipoDe(a) === equipo),
    rivales: otros.filter((a) => equipoDe(a) !== equipo),
    senias: new Map(
      Object.entries(senias ?? {})
        .filter(([a]) => a !== 'envido')
        .map(([a, s]) => [Number(a), s as Senia[]]),
    ),
    envidoMarcado: new Map(Object.entries(senias?.envido ?? {}).map(([a, t]) => [Number(a), t])),
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

/** Fuerza de una carta jugada; las tapadas no ganan (-1). */
export function fuerzaJugada(ctx: Contexto, j: { carta: Carta | null; tapada?: boolean }): number {
  return j.carta && !j.tapada ? fuerza(j.carta, ctx.muestra) : -1
}

/** Carta más alta jugada en la vuelta en curso y el equipo que la tiró; null si nadie jugó. */
export function mejorDeLaVuelta(ctx: Contexto): { f: number; equipo: Equipo | 'parda' } | null {
  const vuelta = ctx.e.vueltas[ctx.e.vueltas.length - 1]!
  const jugadas = vuelta.jugadas.filter((j) => fuerzaJugada(ctx, j) >= 0)
  if (jugadas.length === 0) return null
  const f = Math.max(...jugadas.map((j) => fuerzaJugada(ctx, j)))
  const equipos = new Set(jugadas.filter((j) => fuerzaJugada(ctx, j) === f).map((j) => equipoDe(j.asiento)))
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
