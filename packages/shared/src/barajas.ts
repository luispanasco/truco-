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
  /** Dónde se gana en el modo historia: no se compra, hay que ganarla (o ser beta). */
  recompensa?: string
}

export const BARAJAS = [
  { id: 'propia', nombre: 'Propia', precio: 0 },
  { id: 'fournier1878', nombre: 'Clásica 1878', precio: 0 },
  { id: 'cid1888', nombre: 'El Cid 1888', precio: 0 },
  { id: 'grimaud1860', nombre: 'Grimaud 1860', precio: 0 },
  // Diseños propios: cada una se gana en el último nivel de su departamento del modo historia.
  { id: 'oriental', nombre: 'Oriental', precio: 0, recompensa: 'Tacuarembó' },
  { id: 'costa', nombre: 'Costa Uruguaya', precio: 0, recompensa: 'Rocha' },
  { id: 'colonial', nombre: 'Colonial', precio: 0, recompensa: 'Colonia' },
  { id: 'grabado', nombre: 'Grabado Nocturno', precio: 0, recompensa: 'Montevideo' },
  { id: 'artigas', nombre: 'Artigas', precio: 0, recompensa: 'Artigas' },
  { id: 'canelones', nombre: 'Canelones', precio: 0, recompensa: 'Canelones' },
  { id: 'cerro-largo', nombre: 'Cerro Largo', precio: 0, recompensa: 'Cerro Largo' },
  { id: 'durazno', nombre: 'Durazno', precio: 0, recompensa: 'Durazno' },
  { id: 'flores', nombre: 'Flores', precio: 0, recompensa: 'Flores' },
  { id: 'florida', nombre: 'Florida', precio: 0, recompensa: 'Florida' },
  { id: 'lavalleja', nombre: 'Lavalleja', precio: 0, recompensa: 'Lavalleja' },
  { id: 'maldonado', nombre: 'Maldonado', precio: 0, recompensa: 'Maldonado' },
  { id: 'paysandu', nombre: 'Paysandú', precio: 0, recompensa: 'Paysandú' },
  { id: 'rio-negro', nombre: 'Río Negro', precio: 0, recompensa: 'Río Negro' },
  { id: 'rivera', nombre: 'Rivera', precio: 0, recompensa: 'Rivera' },
  { id: 'salto', nombre: 'Salto', precio: 0, recompensa: 'Salto' },
  { id: 'san-jose', nombre: 'San José', precio: 0, recompensa: 'San José' },
  { id: 'soriano', nombre: 'Soriano', precio: 0, recompensa: 'Soriano' },
  { id: 'treinta-y-tres', nombre: 'Treinta y Tres', precio: 0, recompensa: 'Treinta y Tres' },
] as const satisfies readonly Baraja[]

export type IdBaraja = (typeof BARAJAS)[number]['id']

export const BARAJA_DEFAULT: IdBaraja = 'propia'

export function buscarBaraja(id: unknown): Baraja | undefined {
  return BARAJAS.find((b) => b.id === id)
}

/** Se puede usar sin tenerla: gratis y no es recompensa del modo historia. */
export function barajaGratis(id: unknown): boolean {
  const b = buscarBaraja(id)
  return b?.precio === 0 && !b.recompensa
}

/** La baraja que se puede usar: una que no existe (o que no se tiene) vuelve a la propia. */
export function normalizarBaraja(id: unknown, puedeUsar: (id: IdBaraja) => boolean = barajaGratis): IdBaraja {
  const baraja = BARAJAS.find((b) => b.id === id)
  return baraja && puedeUsar(baraja.id) ? baraja.id : BARAJA_DEFAULT
}
