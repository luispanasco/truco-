import { equipoDe, ganadorPorVueltas, ordenDesde, type Carta, type Equipo, type ResultadoVuelta } from '@truco/engine'
import { f, type Contexto } from './contexto'

/**
 * La mano en curso con todas las cartas a la vista (un reparto imaginado),
 * reducida a fuerzas para simular rápido.
 */
export interface Mesa {
  n: number
  participantes: number[]
  equipoMano: Equipo
  manoAsiento: number
  pardaAlMano: boolean
  /** Fuerzas que le quedan a cada asiento. */
  manos: number[][]
  empieza: number
  jugadas: { a: number; f: number }[]
  resultados: ResultadoVuelta[]
}

export function crearMesa(ctx: Contexto, restantes: Map<number, Carta[]>): Mesa {
  const { e } = ctx
  const manos: number[][] = Array.from({ length: ctx.n }, () => [])
  manos[ctx.yo] = ctx.misCartas.map((c) => f(ctx, c))
  for (const [a, cs] of restantes) manos[a] = cs.map((c) => f(ctx, c))
  const vuelta = e.vueltas[e.vueltas.length - 1]!
  return {
    n: ctx.n,
    participantes: e.participantes,
    equipoMano: equipoDe(e.mano),
    manoAsiento: e.mano,
    pardaAlMano: ctx.config.empiezaTrasParda === 'mano',
    manos,
    empieza: vuelta.empieza,
    jugadas: vuelta.jugadas.map((j) => ({ a: j.asiento, f: f(ctx, j.carta) })),
    resultados: e.vueltas.slice(0, -1).map((v) => v.resultado!),
  }
}

type Politica = (mesa: Mesa, asiento: number) => number

/** Juega la vuelta completa si ya tiraron todos; devuelve el ganador de la mano o null. */
function cerrarVuelta(mesa: Mesa, sigue: () => number, equipo: Equipo): number {
  let max = -1
  for (const j of mesa.jugadas) if (j.f > max) max = j.f
  let ganador = -1
  const equipos = new Set<Equipo>()
  for (const j of mesa.jugadas) {
    if (j.f === max) {
      if (ganador < 0) ganador = j.a
      equipos.add(equipoDe(j.a))
    }
  }
  const res: ResultadoVuelta = equipos.size > 1 ? 'parda' : equipoDe(ganador)
  mesa.resultados.push(res)
  const g = ganadorPorVueltas(mesa.resultados, mesa.equipoMano)
  let v: number
  if (g !== null) {
    v = g === equipo ? 1 : 0
  } else {
    const jugadas = mesa.jugadas
    const empieza = mesa.empieza
    mesa.jugadas = []
    mesa.empieza = res === 'parda' ? (mesa.pardaAlMano ? mesa.manoAsiento : empieza) : ganador
    v = sigue()
    mesa.jugadas = jugadas
    mesa.empieza = empieza
  }
  mesa.resultados.pop()
  return v
}

/** 1 si el equipo gana la mano jugando todos perfecto con las cartas a la vista, 0 si no. */
export function minimax(mesa: Mesa, equipo: Equipo): number {
  const orden = ordenDesde(mesa.participantes, mesa.empieza, mesa.n)
  if (mesa.jugadas.length === orden.length) return cerrarVuelta(mesa, () => minimax(mesa, equipo), equipo)
  const p = orden[mesa.jugadas.length]!
  const mano = mesa.manos[p]!
  if (mano.length === 0) return 0
  const maximiza = equipoDe(p) === equipo
  for (let i = 0; i < mano.length; i++) {
    const x = mano[i]!
    if (mano.indexOf(x) < i) continue
    mano.splice(i, 1)
    mesa.jugadas.push({ a: p, f: x })
    const v = minimax(mesa, equipo)
    mesa.jugadas.pop()
    mano.splice(i, 0, x)
    if (maximiza && v === 1) return 1
    if (!maximiza && v === 0) return 0
  }
  return maximiza ? 0 : 1
}

/** Política simple: tirar la más alta al abrir; si el compañero va ganando, la más baja; si no, la más baja que gana. */
export const golosa: Politica = (mesa, asiento) => {
  const mano = mesa.manos[asiento]!
  let iMin = 0
  let iMax = 0
  for (let i = 1; i < mano.length; i++) {
    if (mano[i]! < mano[iMin]!) iMin = i
    if (mano[i]! > mano[iMax]!) iMax = i
  }
  if (mesa.jugadas.length === 0) return iMax
  let mejor = mesa.jugadas[0]!
  for (const j of mesa.jugadas) if (j.f > mejor.f) mejor = j
  if (equipoDe(mejor.a) === equipoDe(asiento)) return iMin
  let iGana = -1
  for (let i = 0; i < mano.length; i++) {
    if (mano[i]! > mejor.f && (iGana < 0 || mano[i]! < mano[iGana]!)) iGana = i
  }
  return iGana >= 0 ? iGana : iMin
}

/** 1 si el equipo gana la mano cuando todos juegan con la política golosa. */
export function rollout(mesa: Mesa, equipo: Equipo): number {
  const orden = ordenDesde(mesa.participantes, mesa.empieza, mesa.n)
  if (mesa.jugadas.length === orden.length) return cerrarVuelta(mesa, () => rollout(mesa, equipo), equipo)
  const p = orden[mesa.jugadas.length]!
  const mano = mesa.manos[p]!
  if (mano.length === 0) return 0
  const i = golosa(mesa, p)
  const x = mano[i]!
  mano.splice(i, 1)
  mesa.jugadas.push({ a: p, f: x })
  const v = rollout(mesa, equipo)
  mesa.jugadas.pop()
  mano.splice(i, 0, x)
  return v
}

/** Valor de la mesa si `asiento` tira la carta de fuerza `fuerzaCarta` ahora. */
export function valorTrasJugar(
  mesa: Mesa,
  asiento: number,
  fuerzaCarta: number,
  equipo: Equipo,
  evaluar: (m: Mesa, e: Equipo) => number,
): number {
  const mano = mesa.manos[asiento]!
  const i = mano.indexOf(fuerzaCarta)
  mano.splice(i, 1)
  mesa.jugadas.push({ a: asiento, f: fuerzaCarta })
  const v = evaluar(mesa, equipo)
  mesa.jugadas.pop()
  mano.splice(i, 0, fuerzaCarta)
  return v
}
