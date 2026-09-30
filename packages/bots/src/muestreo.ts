import { calcularEnvido, equipoDe, fuerza, tieneFlor, type Carta } from '@truco/engine'
import { jugoEnPrimera, memo, type Contexto } from './contexto'
import { mismasSenias, seniasDeMano } from './senias'

/** Qué información usa el bot para imaginar las manos ajenas. */
export interface OpcionesMuestreo {
  /** Exigir que el tanto coincida con lo declarado en el envido. */
  declarado: boolean
  /** Pesar cada mano según lo probable que es que el rival haya cantado lo que cantó. */
  pesos: boolean
  /** Exigir que la mano del compañero coincida con sus señas. */
  senias: boolean
}

/** Un reparto posible de las cartas que el bot no ve. */
export interface Muestra {
  /** Mano completa de la mano actual (jugadas + sin jugar). */
  completas: Map<number, Carta[]>
  /** Cartas que le quedan a cada uno. */
  restantes: Map<number, Carta[]>
}

interface Candidatas {
  asiento: number
  conocidas: Carta[]
  combos: number[][]
  acumulado: number[]
  total: number
}

function combinaciones(n: number, k: number, cb: (idx: number[]) => void) {
  const idx = Array.from({ length: k }, (_, i) => i)
  if (k === 0) {
    cb([])
    return
  }
  if (k > n) return
  for (;;) {
    cb([...idx])
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]!++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1
  }
}

const sig = (x: number) => 1 / (1 + Math.exp(-x))

/** Fuerza de las cartas que le quedan a alguien, entre 0 y 1. */
function potencia(ctx: Contexto, cartas: readonly Carta[]): number {
  if (cartas.length === 0) return 0.5
  const fs = cartas.map((c) => fuerza(c, ctx.muestra)).sort((a, b) => b - a)
  return (0.65 * fs[0]!) / 19 + (0.35 * (fs[1] ?? 0)) / 19
}

function filtroYPeso(ctx: Contexto, asiento: number, op: OpcionesMuestreo) {
  const { e, config, muestra } = ctx
  const normal = !config.modoSucio
  const cantoFlor = e.flor.cantadas.some((x) => x.asiento === asiento)
  const noTieneFlor =
    normal && config.florObligatoria && !cantoFlor && jugoEnPrimera(e, asiento) && e.flor.estado !== 'noQuerida'
  const declaro = e.envido.declaraciones.find((d) => d.asiento === asiento)
  const senias = ctx.senias.get(asiento)
  const esRival = equipoDe(asiento) !== ctx.equipo

  const cantosEnvido = e.envido.cantos.filter((c) => c.asiento === asiento).map((c) => c.canto)
  const pasoElEnvido = e.envido.estado === 'libre' && jugoEnPrimera(e, asiento) && e.flor.cantadas.length === 0
  const mejorNuestro = Math.max(
    -1,
    ...e.envido.declaraciones.filter((d) => d.tanto !== null && equipoDe(d.asiento) !== equipoDe(asiento)).map((d) => d.tanto!),
  )
  const tr = e.truco
  const rivalCantoTruco =
    esRival &&
    ((tr.pendiente !== null && tr.pendiente.equipo === equipoDe(asiento) && tr.pendiente.asiento === asiento) ||
      (tr.pendiente === null && tr.valor > 1 && tr.puedeSubir === ctx.equipo))
  const rivalAceptoTruco = esRival && tr.valor > 1 && tr.puedeSubir === equipoDe(asiento)

  const filtro = (completa: Carta[]): boolean => {
    if (normal && cantoFlor && !tieneFlor(completa, muestra)) return false
    if (noTieneFlor && tieneFlor(completa, muestra)) return false
    if (op.senias && senias && !mismasSenias(seniasDeMano(completa, muestra), senias)) return false
    if (op.declarado && normal && declaro && declaro.tanto !== null && calcularEnvido(completa, muestra) !== declaro.tanto) {
      return false
    }
    return true
  }

  const peso = (completa: Carta[], restantes: Carta[]): number => {
    if (!op.pesos || !esRival) return 1
    let w = 1
    const t = calcularEnvido(completa, muestra)
    for (const canto of cantosEnvido) {
      const centro = canto === 'envido' ? 25 : canto === 'realEnvido' ? 27 : 29
      w *= 0.1 + 0.9 * sig((t - centro) / 2.5)
    }
    if (pasoElEnvido && !tieneFlor(completa, muestra)) w *= 1 - 0.6 * sig((t - 29) / 2)
    if (declaro && declaro.tanto === null && t > mejorNuestro) w *= 0.15
    const s = potencia(ctx, restantes)
    if (rivalCantoTruco) w *= 0.15 + 0.85 * sig((s - 0.55) * 10)
    if (rivalAceptoTruco) w *= 0.3 + 0.7 * sig((s - 0.45) * 10)
    return w
  }
  return { filtro, peso }
}

function candidatas(ctx: Contexto, asiento: number, op: OpcionesMuestreo, relajar: boolean): Candidatas {
  const conocidas = ctx.jugadas.get(asiento) ?? []
  const faltan = ctx.vista.jugadores[asiento]!.cartasEnMano
  const { filtro, peso } = filtroYPeso(ctx, asiento, op)
  const combos: number[][] = []
  const acumulado: number[] = []
  let total = 0
  combinaciones(ctx.pool.length, faltan, (idx) => {
    const restantes = idx.map((i) => ctx.pool[i]!)
    const completa = [...conocidas, ...restantes]
    if (!relajar && !filtro(completa)) return
    const w = relajar ? 1 : peso(completa, restantes)
    if (w <= 0) return
    total += w
    combos.push(idx)
    acumulado.push(total)
  })
  return { asiento, conocidas, combos, acumulado, total }
}

function elegir(c: Candidatas, r: number): number[] {
  const x = r * c.total
  let lo = 0
  let hi = c.acumulado.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (c.acumulado[mid]! < x) lo = mid + 1
    else hi = mid
  }
  return c.combos[lo]!
}

/**
 * Repartos posibles de las cartas ocultas entre los otros participantes, coherentes
 * con lo que el bot sabe. Si la información es contradictoria (por ejemplo, alguien
 * mintió), se relaja para ese jugador.
 */
export function muestrear(ctx: Contexto, cantidad: number, op: OpcionesMuestreo): Muestra[] {
  const clave = `cand:${op.declarado}:${op.pesos}:${op.senias}`
  const cands = memo(ctx, clave, () =>
    ctx.otros
      .map((a) => {
        const c = candidatas(ctx, a, op, false)
        return c.combos.length > 0 ? c : candidatas(ctx, a, op, true)
      })
      .sort((a, b) => a.combos.length - b.combos.length),
  )
  const muestras: Muestra[] = []
  const usadas = new Uint8Array(ctx.pool.length)
  for (let intento = 0; intento < cantidad * 10 && muestras.length < cantidad; intento++) {
    usadas.fill(0)
    const m: Muestra = { completas: new Map(), restantes: new Map() }
    let ok = true
    for (const c of cands) {
      let combo: number[] | null = null
      for (let t = 0; t < 40; t++) {
        const cand = elegir(c, ctx.rng.sig())
        if (cand.every((i) => usadas[i] === 0)) {
          combo = cand
          break
        }
      }
      if (!combo) {
        ok = false
        break
      }
      for (const i of combo) usadas[i] = 1
      const restantes = combo.map((i) => ctx.pool[i]!)
      m.restantes.set(c.asiento, restantes)
      m.completas.set(c.asiento, [...c.conocidas, ...restantes])
    }
    if (ok) muestras.push(m)
  }
  return muestras
}
