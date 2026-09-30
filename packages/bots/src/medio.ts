import { crearBaraja, fuerza, mismaCarta, type Carta, type CantoEnvido } from '@truco/engine'
import type { Estrategia } from './bot'
import { faltanPara, mejorDeLaVuelta, ordenadas, type Contexto } from './contexto'
import { estimarTruco, probEnvido, type OpcionesEstimacion } from './estimaciones'
import { cartaGolosa, nivelPendiente, valoresEnvido, vueltasPrevias } from './evaluacion'
import { seniaDeCarta } from './senias'

/**
 * Estima la fuerza de su propia mano imaginando las manos ajenas al azar: solo descarta
 * las cartas vistas. No saca conclusiones de lo que canta el rival, y las señas del
 * compañero las usa solo para dejarle la vuelta cuando tiene con qué matar. Juega con
 * reglas simples y va de farol más o menos una de cada siete veces.
 */
const OPCIONES: OpcionesEstimacion = { muestras: 24, metodo: 'golosa', declarado: false, pesos: false, senias: false }
const FAROL = 0.15

/** Mejor carta que el compañero dijo tener por señas y que todavía no jugó. */
function mejorSeniadaDelCompanero(ctx: Contexto, asiento: number): number {
  const senias = ctx.senias.get(asiento)
  if (!senias) return -1
  const jugadas = ctx.jugadas.get(asiento) ?? []
  let mejor = -1
  for (const c of crearBaraja()) {
    const s = seniaDeCarta(c, ctx.muestra)
    if (!s || !senias.includes(s) || jugadas.some((j) => mismaCarta(j, c))) continue
    if (!ctx.pool.some((p) => mismaCarta(p, c))) continue
    // Con señas compartidas (unos o sietes bravos) se asume la más baja del par.
    const x = fuerza(c, ctx.muestra)
    const par = crearBaraja().filter((d) => seniaDeCarta(d, ctx.muestra) === s).map((d) => fuerza(d, ctx.muestra))
    mejor = Math.max(mejor, Math.min(x, ...par))
  }
  return mejor
}

export function crearMedio(): Estrategia {
  const pTruco = (ctx: Contexto) => estimarTruco(ctx, OPCIONES).p
  const pEnvido = (ctx: Contexto) => probEnvido(ctx, { ...OPCIONES, muestras: 40 })

  return {
    cantarFlor(ctx, puede) {
      const flor = ctx.miTanto.flor ?? 0
      if (puede.alResto && flor >= 40) return 'contraflorAlResto'
      if (puede.contraflor && flor >= 34) return 'contraflor'
      return 'flor'
    },

    responderContraflor(ctx, puedeSubir) {
      const flor = ctx.miTanto.flor ?? 0
      if (puedeSubir && flor >= 40) return 'subir'
      return flor >= 33 ? 'quiero' : 'noQuiero'
    },

    cantarEnvido(ctx, posibles) {
      const p = pEnvido(ctx)
      const atras = ctx.vista.puntos[ctx.rival] - ctx.vista.puntos[ctx.equipo]
      if (posibles.includes('faltaEnvido') && atras >= 10 && p > 0.7) return 'faltaEnvido'
      if (p > 0.8) return posibles.includes('realEnvido') ? 'realEnvido' : (posibles[0] ?? null)
      if (p > 0.6 && posibles.includes('envido')) return 'envido'
      if (ctx.rng.chance(FAROL) && posibles.includes('envido')) return 'envido'
      return null
    },

    responderEnvido(ctx, subidas): 'quiero' | 'noQuiero' | CantoEnvido {
      const p = pEnvido(ctx)
      if (p > 0.85 && subidas.length > 0) return subidas.includes('realEnvido') ? 'realEnvido' : subidas[0]!
      const { querido, noQuerido } = valoresEnvido(ctx)
      const umbral = (querido - noQuerido) / (2 * querido) + 0.2
      return p > umbral ? 'quiero' : 'noQuiero'
    },

    cantarTruco(ctx) {
      const p = pTruco(ctx)
      if (p > 0.6) return true
      return p < 0.35 && ctx.rng.chance(FAROL)
    },

    responderTruco(ctx, puedeSubir) {
      const p = pTruco(ctx)
      if (puedeSubir && p > 0.78) return 'subir'
      const nivel = nivelPendiente(ctx)
      const umbral = nivel === 2 ? 0.4 : nivel === 3 ? 0.35 : 0.3
      if (faltanPara(ctx, ctx.rival) <= nivel - 1) return 'quiero'
      return p > umbral ? 'quiero' : 'noQuiero'
    },

    elegirCarta(ctx): Carta {
      const cs = ordenadas(ctx, ctx.misCartas)
      const mejor = mejorDeLaVuelta(ctx)
      if (!mejor) {
        const previas = vueltasPrevias(ctx)
        if (previas.length === 0) return cs.length === 3 ? cs[1]! : cs[cs.length - 1]!
        // Ganó la primera: guarda la brava.
        if (previas[0] === 'gane') return cs[0]!
        return cs[cs.length - 1]!
      }
      if (mejor.equipo === ctx.equipo) return cs[0]!
      // Si un compañero que juega después dijo tener con qué matar, le deja la vuelta.
      const vuelta = ctx.e.vueltas[ctx.e.vueltas.length - 1]!
      const yaJugaron = new Set(vuelta.jugadas.map((j) => j.asiento))
      const despues = ctx.companeros.filter((a) => !yaJugaron.has(a))
      if (despues.some((a) => mejorSeniadaDelCompanero(ctx, a) > mejor.f)) return cs[0]!
      return cartaGolosa(ctx)
    },

    pedirVer: () => false,
    mentirTanto: () => null,
  }
}
