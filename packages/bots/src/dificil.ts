import type { CantoEnvido } from '@truco/engine'
import type { Estrategia } from './bot'
import { faltanPara, valorFalta, type Contexto } from './contexto'
import { estimarTruco, mejorCarta, probEnvido, probFlor, type OpcionesEstimacion } from './estimaciones'
import { nivelPendiente, valoresEnvido } from './evaluacion'

/**
 * Imagina cientos de repartos coherentes con todo lo que sabe (cartas vistas, tantos
 * declarados, flor, señas del compañero) y los pesa según lo probable que es que el
 * rival haya cantado lo que cantó. Con cada reparto simula el resto de la mano jugando
 * perfecto, y decide por probabilidad y valor esperado. Va de farol con frecuencia medida.
 */
export interface AjustesDificil {
  farolTruco: number
  farolEnvido: number
  /** Probabilidad mínima de ganar para cantar truco. */
  cantarTruco: number
  /** Margen sobre el umbral de valor esperado para querer un truco. */
  margenQuerer: number
  muestras: { '1v1': number; equipos: number; '3v3': number }
}

export const AJUSTES_DIFICIL: AjustesDificil = {
  farolTruco: 0.1,
  farolEnvido: 0.12,
  cantarTruco: 0.62,
  margenQuerer: 0.05,
  muestras: { '1v1': 80, equipos: 40, '3v3': 30 },
}

export function crearDificil(permitirMentiras: boolean, parcial: Partial<AjustesDificil> = {}): Estrategia {
  const aj = { ...AJUSTES_DIFICIL, ...parcial }
  const opciones = (ctx: Contexto): OpcionesEstimacion => {
    const jugadores = ctx.e.participantes.length
    const base = { declarado: true, pesos: true, senias: true }
    if (jugadores === 2) return { ...base, muestras: aj.muestras['1v1'], metodo: 'minimax' }
    if (jugadores === 4) return { ...base, muestras: aj.muestras.equipos, metodo: 'minimax' }
    return { ...base, muestras: aj.muestras['3v3'], metodo: 'golosa' }
  }
  const truco = (ctx: Contexto) => estimarTruco(ctx, opciones(ctx))
  const pEnvido = (ctx: Contexto) => probEnvido(ctx, { ...opciones(ctx), muestras: 150 })
  const pFlor = (ctx: Contexto) => probFlor(ctx, { ...opciones(ctx), muestras: 150 })

  return {
    cantarFlor(ctx, puede) {
      const p = pFlor(ctx)
      if (puede.alResto && p > 0.85 && valorFalta(ctx, ctx.equipo) <= 12) return 'contraflorAlResto'
      if (puede.contraflor && p > 0.65) return 'contraflor'
      return 'flor'
    },

    responderContraflor(ctx, puedeSubir) {
      const p = pFlor(ctx)
      if (puedeSubir && p > 0.85) return 'subir'
      // Querer entrega 6 si pierde y gana 6 si gana; no querer entrega 3.
      return p > 0.3 || faltanPara(ctx, ctx.rival) <= 3 ? 'quiero' : 'noQuiero'
    },

    cantarEnvido(ctx, posibles) {
      const p = pEnvido(ctx)
      const falta = valorFalta(ctx, ctx.equipo)
      if (posibles.includes('faltaEnvido') && p > 0.9 && (falta <= 8 || faltanPara(ctx, ctx.equipo) <= falta)) {
        return 'faltaEnvido'
      }
      if (p > 0.75 && posibles.includes('realEnvido')) return 'realEnvido'
      if (p > 0.55 && posibles.includes('envido')) return 'envido'
      if (p < 0.35 && posibles.includes('envido') && ctx.rng.chance(aj.farolEnvido)) return 'envido'
      return null
    },

    responderEnvido(ctx, subidas): 'quiero' | 'noQuiero' | CantoEnvido {
      const p = pEnvido(ctx)
      if (p > 0.93 && subidas.includes('faltaEnvido') && valorFalta(ctx, ctx.equipo) <= 10) return 'faltaEnvido'
      if (p > 0.85 && subidas.includes('realEnvido')) return 'realEnvido'
      const { querido, noQuerido } = valoresEnvido(ctx)
      // Si no querer le da el partido al rival, no hay nada que perder.
      if (faltanPara(ctx, ctx.rival) <= noQuerido) return 'quiero'
      // Querer vale la pena si p·Q − (1−p)·Q > −N.
      return p > (querido - noQuerido) / (2 * querido) ? 'quiero' : 'noQuiero'
    },

    cantarTruco(ctx) {
      const { p } = truco(ctx)
      if (p >= aj.cantarTruco) return true
      return p < 0.3 && ctx.rng.chance(aj.farolTruco)
    },

    responderTruco(ctx, puedeSubir) {
      const { p } = truco(ctx)
      const nivel = nivelPendiente(ctx)
      if (puedeSubir && p > (nivel === 2 ? 0.72 : 0.8)) return 'subir'
      if (faltanPara(ctx, ctx.rival) <= nivel - 1) return 'quiero'
      // Querer vale la pena si p·L − (1−p)·L > −(L−1), o sea p > 1/(2L). Un margen chico por prudencia.
      return p > 1 / (2 * nivel) + aj.margenQuerer ? 'quiero' : 'noQuiero'
    },

    elegirCarta: (ctx) => mejorCarta(ctx, truco(ctx)),

    pedirVer: () => permitirMentiras && false,

    mentirTanto(ctx) {
      if (!permitirMentiras || !ctx.rng.chance(0.25)) return null
      const mejor = Math.max(0, ...ctx.e.envido.declaraciones.map((d) => d.tanto ?? 0))
      return mejor < 33 ? mejor + 1 + Math.floor(ctx.rng.sig() * 3) : null
    },
  }
}
