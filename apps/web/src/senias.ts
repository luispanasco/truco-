import { fuerza, type Carta } from '@truco/engine'

export { GESTO, SIGNIFICADO } from '@truco/bots'

/** Piezas y matas: las cartas que las ayudas resaltan. */
export function esPiezaOMata(c: Carta, muestra: Carta): boolean {
  return fuerza(c, muestra) >= 11
}
