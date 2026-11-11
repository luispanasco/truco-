import { fuerza, type Carta } from '@truco/engine'
import type { Senia } from '@truco/bots'

export { GESTO, SIGNIFICADO, significadoDe } from '@truco/bots'

/** Piezas y matas: las cartas que las ayudas resaltan. */
export function esPiezaOMata(c: Carta, muestra: Carta): boolean {
  return fuerza(c, muestra) >= 11
}

/** Cómo se lee una seña mandada como emote en el chat del grupo: lo que anuncia, gritado. */
export const NOMBRE_EMOTE: Record<Senia, string> = {
  pieza2: '¡El 2 de la muestra!',
  pieza4: '¡El 4 de la muestra!',
  pieza5: '¡El 5 de la muestra!',
  perico: '¡Perico!',
  perica: '¡Perica!',
  unoBravo: '¡La espadilla o el bastillo!',
  sieteBravo: '¡El 7 de espadas o el 7 de oros!',
  tres: '¡Un 3!',
  dosComun: '¡Un 2!',
  unoFalso: '¡El 1 de copas o el 1 de oros!',
  flor: '¡Flor!',
  envido: '¡Envido!',
}
