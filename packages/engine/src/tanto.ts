import type { Carta } from './cartas'
import { piezaDe, type NumeroPieza } from './jerarquia'
import type { ReglaFlorConPiezas } from './config'

const ENVIDO_PIEZA: Record<NumeroPieza, number> = { 2: 30, 4: 29, 5: 28, 11: 27, 10: 27 }

/** Valor de una carta común para el tanto: su número hasta el 7; 10, 11 y 12 valen 0. */
export function valorComun(c: Carta): number {
  return c.numero <= 7 ? c.numero : 0
}

/** Valor de envido de una carta, teniendo en cuenta si es pieza. */
export function valorEnvido(c: Carta, muestra: Carta): number {
  const pieza = piezaDe(c, muestra)
  return pieza !== null ? ENVIDO_PIEZA[pieza] : valorComun(c)
}

function separarPiezas(cartas: readonly Carta[], muestra: Carta) {
  const piezas = cartas
    .filter((c) => piezaDe(c, muestra) !== null)
    .sort((a, b) => valorEnvido(b, muestra) - valorEnvido(a, muestra))
  const comunes = cartas.filter((c) => piezaDe(c, muestra) === null)
  return { piezas, comunes }
}

/**
 * Hay flor con tres cartas del mismo palo. Las piezas son comodín: una pieza más
 * dos cartas del mismo palo, dos piezas más cualquier carta, o tres piezas.
 */
export function tieneFlor(cartas: readonly Carta[], muestra: Carta): boolean {
  if (cartas.length !== 3) return false
  const { piezas, comunes } = separarPiezas(cartas, muestra)
  if (piezas.length >= 2) return true
  const palos = new Set(comunes.map((c) => c.palo))
  return palos.size === 1
}

/**
 * Tanto de envido. Con una pieza: la pieza más la carta más alta de las otras,
 * de cualquier palo. Sin piezas: 20 más el mejor par del mismo palo, o la carta
 * más alta si no hay par.
 */
export function calcularEnvido(cartas: readonly Carta[], muestra: Carta): number {
  const { piezas } = separarPiezas(cartas, muestra)
  const mejorPieza = piezas[0]
  if (mejorPieza) {
    const otras = cartas.filter((c) => c !== mejorPieza)
    return valorEnvido(mejorPieza, muestra) + Math.max(0, ...otras.map(valorComun))
  }
  let mejor = Math.max(0, ...cartas.map(valorComun))
  for (let i = 0; i < cartas.length; i++) {
    for (let j = i + 1; j < cartas.length; j++) {
      const a = cartas[i] as Carta
      const b = cartas[j] as Carta
      if (a.palo === b.palo) mejor = Math.max(mejor, 20 + valorComun(a) + valorComun(b))
    }
  }
  return mejor
}

/** Tanto de la flor, o null si no hay flor. */
export function calcularFlor(
  cartas: readonly Carta[],
  muestra: Carta,
  regla: ReglaFlorConPiezas,
): number | null {
  if (!tieneFlor(cartas, muestra)) return null
  const { piezas, comunes } = separarPiezas(cartas, muestra)
  const [mayor, ...otrasPiezas] = piezas
  if (!mayor) return 20 + comunes.reduce((s, c) => s + valorComun(c), 0)
  const sumaComunes = comunes.reduce((s, c) => s + valorComun(c), 0)
  const sumaOtras =
    regla === 'piezaMayorMasDigitos'
      ? otrasPiezas.reduce((s, c) => s + (valorEnvido(c, muestra) % 10), 0)
      : otrasPiezas.reduce((s, c) => s + valorComun(c), 0)
  return valorEnvido(mayor, muestra) + sumaOtras + sumaComunes
}
