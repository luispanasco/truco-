import type { Carta } from './cartas'

/** Números que son pieza cuando son del palo de la muestra, de mayor a menor. */
export const NUMEROS_PIEZA = [2, 4, 5, 11, 10] as const
export type NumeroPieza = (typeof NUMEROS_PIEZA)[number]

function esNumeroPieza(n: number): n is NumeroPieza {
  return (NUMEROS_PIEZA as readonly number[]).includes(n)
}

/**
 * Qué pieza es la carta, o null si no es pieza. Si la muestra es una pieza,
 * el 12 de ese palo ocupa su lugar.
 */
export function piezaDe(c: Carta, muestra: Carta): NumeroPieza | null {
  if (c.palo !== muestra.palo) return null
  if (esNumeroPieza(c.numero)) return c.numero === muestra.numero ? null : c.numero
  if (c.numero === 12 && esNumeroPieza(muestra.numero)) return muestra.numero
  return null
}

export function esPieza(c: Carta, muestra: Carta): boolean {
  return piezaDe(c, muestra) !== null
}

const FUERZA_PIEZA: Record<NumeroPieza, number> = { 2: 19, 4: 18, 5: 17, 11: 16, 10: 15 }

/**
 * Fuerza para ganar vueltas: mayor gana, igual es parda.
 * Sigue la tabla de jerarquía de la especificación (19 = 2 de la muestra, 1 = los 4).
 */
export function fuerza(c: Carta, muestra: Carta): number {
  const pieza = piezaDe(c, muestra)
  if (pieza !== null) return FUERZA_PIEZA[pieza]
  switch (c.numero) {
    case 1:
      if (c.palo === 'espada') return 14
      if (c.palo === 'basto') return 13
      return 8
    case 7:
      if (c.palo === 'espada') return 12
      if (c.palo === 'oro') return 11
      return 4
    case 3:
      return 10
    case 2:
      return 9
    case 12:
      return 7
    case 11:
      return 6
    case 10:
      return 5
    case 6:
      return 3
    case 5:
      return 2
    case 4:
      return 1
  }
}
