import { calcularEnvido, calcularFlor, equipoDe, type Carta } from '@truco/engine'
import { f, memo, type Contexto } from './contexto'
import { muestrear, type Muestra, type OpcionesMuestreo } from './muestreo'
import { crearMesa, minimax, rollout, valorTrasJugar } from './simulacion'

export interface OpcionesEstimacion extends OpcionesMuestreo {
  muestras: number
  metodo: 'minimax' | 'golosa'
}

function muestrasDe(ctx: Contexto, op: OpcionesEstimacion): Muestra[] {
  return memo(ctx, `m:${op.muestras}:${op.declarado}:${op.pesos}:${op.senias}`, () => muestrear(ctx, op.muestras, op))
}

/** Gana la comparación el tanto mayor; si empatan, el más cercano al mano. */
function ganaMiEquipo(ctx: Contexto, tantos: { asiento: number; tanto: number }[]): boolean {
  let mejor: { asiento: number; tanto: number } | null = null
  for (const t of tantos) {
    if (
      !mejor ||
      t.tanto > mejor.tanto ||
      (t.tanto === mejor.tanto && ctx.e.participantes.indexOf(t.asiento) < ctx.e.participantes.indexOf(mejor.asiento))
    ) {
      mejor = t
    }
  }
  return mejor !== null && equipoDe(mejor.asiento) === ctx.equipo
}

/** Probabilidad de que el equipo del bot gane el envido. */
export function probEnvido(ctx: Contexto, op: OpcionesEstimacion): number {
  return memo(ctx, `env:${op.muestras}:${op.declarado}:${op.pesos}`, () => {
    const muestras = muestrasDe(ctx, op)
    if (muestras.length === 0) return 0.5
    const declarados = new Map(
      ctx.e.envido.declaraciones.filter((d) => d.tanto !== null).map((d) => [d.asiento, d.tanto!] as const),
    )
    let gana = 0
    for (const m of muestras) {
      const tantos = ctx.e.participantes.map((a) => ({
        asiento: a,
        tanto:
          a === ctx.yo
            ? ctx.miTanto.envido
            : (declarados.get(a) ?? calcularEnvido(m.completas.get(a) ?? [], ctx.muestra)),
      }))
      if (ganaMiEquipo(ctx, tantos)) gana++
    }
    return gana / muestras.length
  })
}

/** Probabilidad de que el equipo del bot gane la comparación de flores. */
export function probFlor(ctx: Contexto, op: OpcionesEstimacion): number {
  return memo(ctx, `flor:${op.muestras}:${op.declarado}:${op.pesos}`, () => {
    const muestras = muestrasDe(ctx, op)
    if (muestras.length === 0) return 0.5
    const cantaron = new Set(ctx.e.flor.cantadas.map((x) => x.asiento))
    cantaron.add(ctx.yo)
    let gana = 0
    for (const m of muestras) {
      const tantos: { asiento: number; tanto: number }[] = []
      for (const a of ctx.e.participantes) {
        if (!cantaron.has(a)) continue
        const t =
          a === ctx.yo
            ? ctx.miTanto.flor
            : calcularFlor(m.completas.get(a) ?? [], ctx.muestra, ctx.config.florConPiezas)
        if (t !== null) tantos.push({ asiento: a, tanto: t })
      }
      if (ganaMiEquipo(ctx, tantos)) gana++
    }
    return gana / muestras.length
  })
}

export interface EstimacionTruco {
  /** Probabilidad de ganar la mano jugando lo mejor posible desde ahora. */
  p: number
  /** Si es el turno del bot: probabilidad de ganar tirando cada carta (por fuerza). */
  porFuerza: Map<number, number>
}

/** Probabilidad de ganar el truco, y cuánto vale tirar cada carta si le toca al bot. */
export function estimarTruco(ctx: Contexto, op: OpcionesEstimacion): EstimacionTruco {
  return memo(ctx, `truco:${op.muestras}:${op.metodo}:${op.declarado}:${op.pesos}`, () => {
    const muestras = muestrasDe(ctx, op)
    const evaluar = op.metodo === 'minimax' ? minimax : rollout
    const miTurno = ctx.e.turno === ctx.yo
    const fuerzas = [...new Set(ctx.misCartas.map((c) => f(ctx, c)))]
    const suma = new Map(fuerzas.map((x) => [x, 0]))
    let sumaGeneral = 0
    for (const m of muestras) {
      const mesa = crearMesa(ctx, m.restantes)
      if (miTurno) {
        for (const x of fuerzas) suma.set(x, suma.get(x)! + valorTrasJugar(mesa, ctx.yo, x, ctx.equipo, evaluar))
      } else {
        sumaGeneral += evaluar(mesa, ctx.equipo)
      }
    }
    const n = Math.max(1, muestras.length)
    const porFuerza = new Map([...suma].map(([x, s]) => [x, s / n]))
    const p = miTurno ? Math.max(0, ...porFuerza.values()) : sumaGeneral / n
    return { p: muestras.length === 0 ? 0.5 : p, porFuerza }
  })
}

/** La carta con mejor probabilidad de ganar; ante empate, la más baja. */
export function mejorCarta(ctx: Contexto, est: EstimacionTruco): Carta {
  const cartas = [...ctx.misCartas].sort((a, b) => f(ctx, a) - f(ctx, b))
  let mejor = cartas[0]!
  let pMejor = est.porFuerza.get(f(ctx, mejor)) ?? 0
  for (const c of cartas.slice(1)) {
    const p = est.porFuerza.get(f(ctx, c)) ?? 0
    if (p > pMejor + 1e-9) {
      mejor = c
      pMejor = p
    }
  }
  return mejor
}
