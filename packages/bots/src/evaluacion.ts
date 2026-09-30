import { puntosEnvidoNoQuerido, puntosEnvidoQuerido, type Carta } from '@truco/engine'
import { f, mejorDeLaVuelta, ordenadas, valorFalta, type Contexto } from './contexto'

/** Cartas bravas: piezas y matas. */
export function bravas(ctx: Contexto, cartas: readonly Carta[] = ctx.misCartas): number {
  return cartas.filter((c) => f(ctx, c) >= 11).length
}

/** Lo que se gana si se quiere el envido cantado y lo que se entrega si no. */
export function valoresEnvido(ctx: Contexto): { querido: number; noQuerido: number } {
  const cantos = ctx.e.envido.cantos
  return {
    querido: puntosEnvidoQuerido(cantos, valorFalta(ctx, ctx.equipo)),
    noQuerido: puntosEnvidoNoQuerido(cantos),
  }
}

/** Nivel del truco que está esperando respuesta (2, 3 o 4). */
export function nivelPendiente(ctx: Contexto): number {
  return ctx.e.truco.pendiente?.nivel ?? ctx.e.truco.valor + 1
}

/** Resultados de las vueltas ya jugadas, desde el punto de vista del bot. */
export function vueltasPrevias(ctx: Contexto): ('gane' | 'perdi' | 'parda')[] {
  return ctx.e.vueltas
    .slice(0, -1)
    .map((v) => (v.resultado === 'parda' ? 'parda' : v.resultado === ctx.equipo ? 'gane' : 'perdi'))
}

/** Tirar la más baja que gana la vuelta; si ninguna gana o el equipo ya va ganando, la más baja. */
export function cartaGolosa(ctx: Contexto): Carta {
  const cs = ordenadas(ctx, ctx.misCartas)
  const mejor = mejorDeLaVuelta(ctx)
  if (!mejor) return cs[cs.length - 1]!
  if (mejor.equipo === ctx.equipo) return cs[0]!
  return cs.find((c) => f(ctx, c) > mejor.f) ?? cs[0]!
}
