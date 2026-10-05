/**
 * Barajas (cosmético): con qué dibujo se ven las cartas. En una sala privada la elige el
 * anfitrión y la ven todos, así que viaja al servidor y pasa por el mismo camino que las mesas
 * y el avatar (catálogo con precio y normalización).
 *
 * El id queda guardado en el perfil: no se cambia ni se reusa. Los dibujos los pone la web.
 */

/** Una baraja del catálogo. `precio` en monedas de juego: 0 es gratis (hoy lo son todas). */
export interface Baraja {
  id: string
  nombre: string
  precio: number
}

export const BARAJAS = [
  { id: 'propia', nombre: 'Propia', precio: 0 },
  { id: 'fournier1878', nombre: 'Clásica 1878', precio: 0 },
] as const satisfies readonly Baraja[]

export type IdBaraja = (typeof BARAJAS)[number]['id']

export const BARAJA_DEFAULT: IdBaraja = 'propia'

export function buscarBaraja(id: unknown): Baraja | undefined {
  return BARAJAS.find((b) => b.id === id)
}

export function barajaGratis(id: unknown): boolean {
  return buscarBaraja(id)?.precio === 0
}

/** La baraja que se puede usar: una que no existe (o que no se tiene) vuelve a la propia. */
export function normalizarBaraja(id: unknown, puedeUsar: (id: IdBaraja) => boolean = barajaGratis): IdBaraja {
  const baraja = BARAJAS.find((b) => b.id === id)
  return baraja && puedeUsar(baraja.id) ? baraja.id : BARAJA_DEFAULT
}
