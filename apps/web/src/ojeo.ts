/**
 * Ojeo de la mano: las tres cartas llegan apiladas y se descubren de a poco, deslizando la de
 * adelante hacia abajo para que la de atrás se asome por arriba (primero los cortes del marco,
 * que dicen el palo, y después el número). Acá está la lógica pura, sin DOM: zonas de la carta,
 * límites del arrastre y cuándo una carta cuenta como "ojeada". Las posiciones son el
 * desplazamiento hacia abajo (px) de cada carta desde la pila; el índice 0 es la de adelante.
 */

/** Zonas verticales de la carta, en fracción de su altura medida desde el borde superior. */
export const ZONA_CORTES = { desde: 0, hasta: 0.08 } as const
export const ZONA_INDICE = { desde: 0.08, hasta: 0.25 } as const

/** Espera antes de abrir la mano en abanico cuando ya se ojearon todas. */
export const ESPERA_ABRIR_MS = 600
/** Vibración corta al ojear una carta (si el dispositivo la tiene). */
export const VIBRACION_MS = 10
/** Movimiento mínimo para que un toque cuente como arrastre y no como toque. */
export const UMBRAL_ARRASTRE_PX = 6

/** Tolerancia de redondeo (px) para comparar posiciones. */
const EPS = 0.5

/** Alto de la franja que tiene que asomar para ver cortes y número (px). */
export function franja(alto: number): number {
  return ZONA_INDICE.hasta * alto
}

export function posicionesIniciales(n: number): number[] {
  return Array.from({ length: n }, () => 0)
}

/**
 * Cuánto se ve (px) de la carta `i` por encima de las que tiene adelante. La de adelante se ve
 * entera (Infinity). Puede dar 0 o negativo si está tapada.
 */
export function visibleArriba(i: number, pos: readonly number[]): number {
  if (i === 0) return Infinity
  return Math.min(...pos.slice(0, i)) - pos[i]!
}

/** Una carta está ojeada cuando su ZONA_INDICE quedó completamente a la vista. */
export function estaOjeada(i: number, pos: readonly number[], alto: number): boolean {
  return visibleArriba(i, pos) >= franja(alto) - EPS
}

/** Qué se alcanza a ver de la carta `i`: nada, los cortes (el palo), el número, o toda. */
export function zonaVisible(i: number, pos: readonly number[], alto: number): 'nada' | 'cortes' | 'indice' | 'toda' {
  const v = visibleArriba(i, pos)
  if (v === Infinity) return 'toda'
  if (v >= franja(alto) - EPS) return 'indice'
  return v > EPS ? 'cortes' : 'nada'
}

/**
 * Límites (px) entre los que puede moverse la carta `i`:
 * - Arriba: no sube más arriba de su posición inicial ni de la carta de atrás; y si la de atrás
 *   ya bajó, tampoco le tapa el número.
 * - Abajo: el escalonado completo (cada carta asoma su franja de cortes y número). Una carta
 *   de atrás cuyo número todavía tapa la de adelante no puede bajar más (solo volver).
 */
export function limitesArrastre(i: number, pos: readonly number[], alto: number): { min: number; max: number } {
  const n = pos.length
  const f = franja(alto)
  const actual = pos[i]!
  let min = 0
  const atras = pos[i + 1]
  if (atras !== undefined) {
    const separada = atras > (pos[i + 2] ?? 0) + EPS
    min = Math.min(actual, separada ? atras + f : atras)
  }
  let max = (n - 1 - i) * f
  if (i > 0 && pos[i - 1]! - actual < f - EPS) max = actual
  return { min, max: Math.max(min, max) }
}

/**
 * Lleva la carta `i` a `y` (acotada por sus límites). Si al bajar por detrás de las de adelante
 * les llega al borde, las empuja: así nunca le tapan el número. Devuelve posiciones nuevas.
 */
export function moverCarta(i: number, y: number, pos: readonly number[], alto: number): number[] {
  const { min, max } = limitesArrastre(i, pos, alto)
  const f = franja(alto)
  const nuevas = [...pos]
  nuevas[i] = Math.min(max, Math.max(min, y))
  for (let j = i - 1; j >= 0; j--) {
    const separada = nuevas[j + 1]! > (nuevas[j + 2] ?? 0) + EPS
    if (separada && nuevas[j]! < nuevas[j + 1]! + f) nuevas[j] = nuevas[j + 1]! + f
  }
  return nuevas
}
