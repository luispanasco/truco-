/**
 * Mesas (cosmético): la combinación de paño y madera con la que se ve la partida y el fondo
 * de la app. Solo la ve quien la eligió, así que no viaja al servidor.
 *
 * El id queda guardado en el perfil: no se cambia ni se reusa. Los colores los pone la web.
 */

/** Una mesa del catálogo. `precio` en monedas de juego: 0 es gratis; las demás, en la tienda (fase 2). */
export interface Mesa {
  id: string
  nombre: string
  /** El paño y la madera, en pocas palabras (para la muestra del selector). */
  detalle: string
  precio: number
}

/** Precios provisorios: se ajustan en la fase 2 con la economía. */
export const MESAS = [
  { id: 'boliche', nombre: 'Boliche', detalle: 'Paño verde y madera', precio: 0 },
  { id: 'azul', nombre: 'Azul', detalle: 'Paño azul y madera oscura', precio: 0 },
  { id: 'bordo', nombre: 'Bordó', detalle: 'Paño rojo vino y madera casi negra', precio: 400 },
  { id: 'pizarra', nombre: 'Pizarra', detalle: 'Paño gris azulado y nogal', precio: 300 },
  { id: 'celeste', nombre: 'Celeste', detalle: 'Paño celeste y madera clara', precio: 400 },
  { id: 'parrillero', nombre: 'Parrillero', detalle: 'Arpillera y madera rústica', precio: 500 },
  { id: 'cantina', nombre: 'Cantina', detalle: 'Mantel a cuadros y madera clara', precio: 600 },
] as const satisfies readonly Mesa[]

export type IdMesa = (typeof MESAS)[number]['id']

export const MESA_DEFAULT: IdMesa = 'boliche'

export function buscarMesa(id: unknown): Mesa | undefined {
  return MESAS.find((m) => m.id === id)
}

export function mesaGratis(id: unknown): boolean {
  return buscarMesa(id)?.precio === 0
}

/**
 * La mesa que se puede usar: un id que no existe (o un valor roto) vuelve a la de boliche, y
 * mientras no exista la tienda, las pagas también.
 */
export function normalizarMesa(id: unknown, puedeUsar: (id: IdMesa) => boolean = mesaGratis): IdMesa {
  const mesa = MESAS.find((m) => m.id === id)
  return mesa && puedeUsar(mesa.id) ? mesa.id : MESA_DEFAULT
}
