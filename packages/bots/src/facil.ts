import type { Estrategia } from './bot'
import type { Contexto } from './contexto'
import { bravas, cartaGolosa, vueltasPrevias } from './evaluacion'

/** Juega lo obvio: la carta que gana si puede, canta solo con juego claro y casi nunca sube. */
export function crearFacil(): Estrategia {
  return {
    cantarFlor: () => 'flor',
    responderContraflor: (ctx) => ((ctx.miTanto.flor ?? 0) >= 35 ? 'quiero' : 'noQuiero'),
    cantarEnvido: (ctx, posibles) => (ctx.miTanto.envido >= 30 && posibles.includes('envido') ? 'envido' : null),
    responderEnvido: (ctx) => (ctx.miTanto.envido >= 27 ? 'quiero' : 'noQuiero'),
    // Solo el primer truco: subir un truco aceptado sería "subir".
    cantarTruco: (ctx) => ctx.e.truco.valor === 1 && bravas(ctx) >= 2,
    responderTruco(ctx: Contexto, puedeSubir) {
      if (puedeSubir && bravas(ctx) >= 2 && ctx.rng.chance(0.03)) return 'subir'
      const gane = vueltasPrevias(ctx).includes('gane')
      return bravas(ctx) >= 1 || gane ? 'quiero' : 'noQuiero'
    },
    elegirCarta: cartaGolosa,
    pedirVer: () => false,
    mentirTanto: () => null,
  }
}
