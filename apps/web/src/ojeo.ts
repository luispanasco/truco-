/**
 * Ojeo de la mano: las tres cartas llegan apiladas y se descubren de a poco, deslizando la de
 * adelante hacia abajo para que la de atrás se asome por arriba: primero los cortes del marco,
 * que dicen el palo, y recién después el número. Por eso entre las dos hay una franja vacía y,
 * al llegar a ella, un tope suave: es fácil quedarse viendo solo el palo. Acá está la lógica
 * pura, sin DOM: zonas de la carta, límites del arrastre, el tope y cuándo una carta cuenta como
 * "ojeada". Las posiciones son el desplazamiento hacia abajo (px) de cada carta desde la pila;
 * el índice 0 es la de adelante.
 *
 * Las zonas dependen de la baraja (ZONAS_OJEO): la propia está dibujada para el ojeo, con una
 * franja vacía entre los cortes y el número; en la clásica de Fournier el número está pegado a
 * la línea de los cortes. Todas las funciones reciben las zonas al final (por defecto, la propia).
 */
import type { Baraja } from './baraja'

/** Zonas verticales de la carta, en fracción de su altura medida desde el borde superior. */
export const ZONA_CORTES = { desde: 0, hasta: 0.08 } as const
/** Franja vacía entre los cortes y el número: mostrando hasta acá se ve el palo y nada más. */
export const ZONA_SEPARACION = { desde: ZONA_CORTES.hasta, hasta: 0.15 } as const
export const ZONA_INDICE = { desde: ZONA_SEPARACION.hasta, hasta: 0.3 } as const
/** Donde empieza el dibujo (palos o figura), por debajo del número. */
export const ZONA_DIBUJO_DESDE = 0.32
/** El tope cae a mitad de la separación: los cortes enteros a la vista y ni un pelo del número. */
export const TOPE_CORTES = (ZONA_SEPARACION.desde + ZONA_SEPARACION.hasta) / 2

interface Franja {
  readonly desde: number
  readonly hasta: number
}
/** Zonas de una baraja (fracciones de la altura de la carta, desde arriba) y dónde cae el tope. */
export interface ZonasOjeo {
  readonly cortes: Franja
  readonly separacion: Franja
  readonly indice: Franja
  readonly tope: number
}

export const ZONAS_PROPIA: ZonasOjeo = { cortes: ZONA_CORTES, separacion: ZONA_SEPARACION, indice: ZONA_INDICE, tope: TOPE_CORTES }

/**
 * Baraja clásica (Fournier 1878), medida en las 40 imágenes de public/barajas/fournier-1878
 * (400 × 600, ver scripts/baraja-fournier.py): la línea de arriba del marco, con sus cortes, va
 * de 0,018 a 0,020 de la altura (mediana; en las más corridas, hasta 0,037) y el número arranca
 * enseguida, en 0,032 (entre 0,015 y 0,048), y termina en 0,078. No hay una franja vacía que se
 * pueda separar con el dedo (son 1–2 px en la mano), así que el tope queda igual, justo debajo
 * de la línea: deja ver los cortes y, como mucho, el borde de arriba del número. El índice se
 * cuenta hasta 0,09 para que el número asome entero en todas.
 */
export const ZONAS_FOURNIER: ZonasOjeo = {
  cortes: { desde: 0, hasta: 0.026 },
  separacion: { desde: 0.026, hasta: 0.03 },
  indice: { desde: 0.03, hasta: 0.09 },
  tope: 0.028,
}

export const ZONAS_OJEO: Record<Baraja, ZonasOjeo> = { propia: ZONAS_PROPIA, fournier1878: ZONAS_FOURNIER }

/**
 * Alcance (px de dedo, para cada lado) del tope: adentro la carta casi no se mueve y hay que
 * empujar un poco más para pasarlo; afuera el arrastre vuelve a ser 1:1 exacto.
 */
export const TOPE_RADIO_PX = 9
/** A menos de esto (px) del tope, la carta "llegó" (para la vibración). */
export const TOPE_LLEGADA_PX = 1.5

/** Espera antes de abrir la mano en abanico cuando ya se ojearon todas. */
export const ESPERA_ABRIR_MS = 600
/** Vibración corta al ojear una carta (si el dispositivo la tiene). */
export const VIBRACION_MS = 10
/** Vibración más corta todavía al llegar al tope de los cortes. */
export const VIBRACION_TOPE_MS = 6
/** Movimiento mínimo para que un toque cuente como arrastre y no como toque. */
export const UMBRAL_ARRASTRE_PX = 6

/** Tolerancia de redondeo (px) para comparar posiciones. */
const EPS = 0.5

/** Alto de la franja que tiene que asomar para ver cortes y número (px). */
export function franja(alto: number, z: ZonasOjeo = ZONAS_PROPIA): number {
  return z.indice.hasta * alto
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
export function estaOjeada(i: number, pos: readonly number[], alto: number, z: ZonasOjeo = ZONAS_PROPIA): boolean {
  return visibleArriba(i, pos) >= franja(alto, z) - EPS
}

/**
 * Qué se alcanza a ver de la carta `i`: nada, los cortes (el palo, aunque sea en parte), un
 * pedazo del número (todavía no alcanza para leerlo), el número entero, o toda.
 */
export function zonaVisible(
  i: number,
  pos: readonly number[],
  alto: number,
  z: ZonasOjeo = ZONAS_PROPIA,
): 'nada' | 'cortes' | 'parte-indice' | 'indice' | 'toda' {
  const v = visibleArriba(i, pos)
  if (v === Infinity) return 'toda'
  if (v >= franja(alto, z) - EPS) return 'indice'
  if (v > z.indice.desde * alto + EPS) return 'parte-indice'
  return v > EPS ? 'cortes' : 'nada'
}

/**
 * Posición (px) de la carta `i` en la que la de atrás muestra justo los cortes. Solo hay tope
 * si la carta `i` es la que destapa a la de atrás (ninguna de adelante está más arriba).
 */
export function posicionTope(i: number, pos: readonly number[], alto: number, z: ZonasOjeo = ZONAS_PROPIA): number | null {
  const atras = pos[i + 1]
  if (atras === undefined) return null
  if (i > 0 && Math.min(...pos.slice(0, i)) < pos[i]! - EPS) return null
  return atras + z.tope * alto
}

/**
 * Aplica el tope a la posición que pide el dedo (`y`). Cerca del tope la carta se queda casi
 * quieta (curva cúbica: plana en el centro) y al salir del radio vuelve a seguir al dedo 1:1,
 * sin salto, porque en el borde del radio la curva vale exactamente lo mismo que el dedo.
 */
export function conTope(
  i: number,
  y: number,
  pos: readonly number[],
  alto: number,
  z: ZonasOjeo = ZONAS_PROPIA,
  radioMax = TOPE_RADIO_PX,
): number {
  const t = posicionTope(i, pos, alto, z)
  if (t === null) return y
  // Si el tope está muy cerca de donde arranca (la baraja clásica), el radio se achica: así al
  // empezar a arrastrar la carta no pega un salto.
  const radio = Math.min(radioMax, t - pos[i + 1]!)
  if (radio <= 0) return y
  const d = y - t
  if (Math.abs(d) >= radio) return y
  return t + radio * (d / radio) ** 3
}

/** Si la carta `i` está en el tope (la de atrás muestra solo los cortes). */
export function enTope(i: number, pos: readonly number[], alto: number, z: ZonasOjeo = ZONAS_PROPIA): boolean {
  const t = posicionTope(i, pos, alto, z)
  return t !== null && Math.abs(pos[i]! - t) <= TOPE_LLEGADA_PX
}

/**
 * Límites (px) entre los que puede moverse la carta `i`:
 * - Arriba: no sube más arriba de su posición inicial ni de la carta de atrás; y si la de atrás
 *   ya bajó, tampoco le tapa el número.
 * - Abajo: el escalonado completo (cada carta asoma su franja de cortes y número). Una carta
 *   de atrás cuyo número todavía tapa la de adelante no puede bajar más (solo volver).
 */
export function limitesArrastre(
  i: number,
  pos: readonly number[],
  alto: number,
  z: ZonasOjeo = ZONAS_PROPIA,
): { min: number; max: number } {
  const n = pos.length
  const f = franja(alto, z)
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
export function moverCarta(i: number, y: number, pos: readonly number[], alto: number, z: ZonasOjeo = ZONAS_PROPIA): number[] {
  const { min, max } = limitesArrastre(i, pos, alto, z)
  const f = franja(alto, z)
  const nuevas = [...pos]
  nuevas[i] = Math.min(max, Math.max(min, y))
  for (let j = i - 1; j >= 0; j--) {
    const separada = nuevas[j + 1]! > (nuevas[j + 2] ?? 0) + EPS
    if (separada && nuevas[j]! < nuevas[j + 1]! + f) nuevas[j] = nuevas[j + 1]! + f
  }
  return nuevas
}
