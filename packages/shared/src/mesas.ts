/**
 * Mesas (cosmético): la combinación de paño y madera con la que se ve la partida y el fondo
 * de la app. Solo la ve quien la eligió, así que no viaja al servidor.
 *
 * El id queda guardado en el perfil: no se cambia ni se reusa. Los colores los pone la web.
 */

import { conRarezas, type Rareza } from './rarezas'

/** Una mesa del catálogo. `precio` en monedas de juego: 0 es gratis; las demás, en la tienda (fase 2). */
export interface Mesa {
  id: string
  nombre: string
  /** El paño y la madera, en pocas palabras (para la muestra del selector). */
  detalle: string
  precio: number
  rareza?: Rareza
  /** Dónde se gana en el modo historia: no está en la tienda, hay que ganarla (o ser beta). */
  recompensa?: string
}

/** `precio` acá es el de la fase 1: dice la rareza, y el precio final es el de la rareza. */
export const MESAS = conRarezas(
  [
  { id: 'boliche', nombre: 'Boliche', detalle: 'Paño verde y madera', precio: 0 },
  { id: 'azul', nombre: 'Azul', detalle: 'Paño azul y madera oscura', precio: 0 },
  { id: 'bordo', nombre: 'Bordó', detalle: 'Paño rojo vino y madera casi negra', precio: 400 },
  { id: 'pizarra', nombre: 'Pizarra', detalle: 'Paño gris azulado y nogal', precio: 300 },
  { id: 'celeste', nombre: 'Celeste', detalle: 'Paño celeste y madera clara', precio: 400 },
  { id: 'parrillero', nombre: 'Parrillero', detalle: 'Arpillera y madera rústica', precio: 500 },
  { id: 'cantina', nombre: 'Cantina', detalle: 'Mantel a cuadros y madera clara', precio: 600 },
  // Las del modo historia: una por departamento, se gana en su último nivel.
  { id: 'artigas', nombre: 'Artigas', detalle: 'Violeta de amatista', precio: 0, recompensa: 'Artigas' },
  { id: 'canelones', nombre: 'Canelones', detalle: 'Uva de Tannat', precio: 0, recompensa: 'Canelones' },
  { id: 'cerro-largo', nombre: 'Cerro Largo', detalle: 'Verde de campo fronterizo', precio: 0, recompensa: 'Cerro Largo' },
  { id: 'colonia', nombre: 'Colonia', detalle: 'Piedra del Barrio Histórico', precio: 0, recompensa: 'Colonia' },
  { id: 'durazno', nombre: 'Durazno', detalle: 'Gris del río Yí', precio: 0, recompensa: 'Durazno' },
  { id: 'flores', nombre: 'Flores', detalle: 'Ocre de las Grutas del Palacio', precio: 0, recompensa: 'Flores' },
  { id: 'florida', nombre: 'Florida', detalle: 'Azul de Piedra Alta', precio: 0, recompensa: 'Florida' },
  { id: 'lavalleja', nombre: 'Lavalleja', detalle: 'Verde serrano', precio: 0, recompensa: 'Lavalleja' },
  { id: 'maldonado', nombre: 'Maldonado', detalle: 'Azul del faro de José Ignacio', precio: 0, recompensa: 'Maldonado' },
  { id: 'montevideo', nombre: 'Montevideo', detalle: 'Ciruela de noche de tango', precio: 0, recompensa: 'Montevideo' },
  { id: 'paysandu', nombre: 'Paysandú', detalle: 'Oliva del río Uruguay', precio: 0, recompensa: 'Paysandú' },
  { id: 'rio-negro', nombre: 'Río Negro', detalle: 'Gris del Anglo', precio: 0, recompensa: 'Río Negro' },
  { id: 'rivera', nombre: 'Rivera', detalle: 'Verde del Lunarejo', precio: 0, recompensa: 'Rivera' },
  { id: 'rocha', nombre: 'Rocha', detalle: 'Medianoche de toda la costa', precio: 0, recompensa: 'Rocha' },
  { id: 'salto', nombre: 'Salto', detalle: 'Cobre de las termas', precio: 0, recompensa: 'Salto' },
  { id: 'san-jose', nombre: 'San José', detalle: 'Verde de tambo maragato', precio: 0, recompensa: 'San José' },
  { id: 'soriano', nombre: 'Soriano', detalle: 'Verde de chacra', precio: 0, recompensa: 'Soriano' },
  { id: 'tacuarembo', nombre: 'Tacuarembó', detalle: 'Cuero gaucho', precio: 0, recompensa: 'Tacuarembó' },
  { id: 'treinta-y-tres', nombre: 'Treinta y Tres', detalle: 'Verde del Olimar', precio: 0, recompensa: 'Treinta y Tres' },
  // Los barrios de Rocha: cada uno se juega en su mesa y la da al completarlo (la de Rocha, la de
  // toda la costa, es la del último). La de Cabo Polonio es la que antes era de Rocha.
  { id: 'la-paloma', nombre: 'La Paloma', detalle: 'Turquesa de ola', precio: 0, recompensa: 'La Paloma (Rocha)' },
  { id: 'la-pedrera', nombre: 'La Pedrera', detalle: 'Piedra de la rambla', precio: 0, recompensa: 'La Pedrera (Rocha)' },
  { id: 'cabo-polonio', nombre: 'Cabo Polonio', detalle: 'Azul petróleo del faro', precio: 0, recompensa: 'Cabo Polonio (Rocha)' },
  { id: 'aguas-dulces-valizas-castillos', nombre: 'Aguas Dulces', detalle: 'Verde ombú', precio: 0, recompensa: 'Aguas Dulces (Rocha)' },
  { id: 'punta-del-diablo', nombre: 'Punta del Diablo', detalle: 'Rojo de barca', precio: 0, recompensa: 'Punta del Diablo (Rocha)' },
  { id: 'santa-teresa-y-chuy', nombre: 'Santa Teresa', detalle: 'Verde del monte', precio: 0, recompensa: 'Santa Teresa y Chuy (Rocha)' },
  ] as const satisfies readonly Mesa[]
)

export type IdMesa = (typeof MESAS)[number]['id']

export const MESA_DEFAULT: IdMesa = 'boliche'

export function buscarMesa(id: unknown): Mesa | undefined {
  return MESAS.find((m) => m.id === id)
}

/** Se puede usar sin tenerla: gratis y no es recompensa del modo historia. */
export function mesaGratis(id: unknown): boolean {
  const m = buscarMesa(id)
  return m?.precio === 0 && !m.recompensa
}

/**
 * La mesa que se puede usar: un id que no existe (o un valor roto) vuelve a la de boliche, y
 * mientras no exista la tienda, las pagas también.
 */
export function normalizarMesa(id: unknown, puedeUsar: (id: IdMesa) => boolean = mesaGratis): IdMesa {
  const mesa = MESAS.find((m) => m.id === id)
  return mesa && puedeUsar(mesa.id) ? mesa.id : MESA_DEFAULT
}
