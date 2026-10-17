/**
 * Rarezas de los cosméticos de la tienda (fase 2). Cada rareza tiene un precio fijo; la rareza
 * de cada cosmético sale del precio que tenía en la fase 1 (ver `rarezaDePrecio`).
 */
export type Rareza = 'comun' | 'rara' | 'epica' | 'legendaria'

export const RAREZAS: readonly Rareza[] = ['comun', 'rara', 'epica', 'legendaria']

export const PRECIO_RAREZA: Record<Rareza, number> = { comun: 60, rara: 150, epica: 350, legendaria: 800 }

export const NOMBRE_RAREZA: Record<Rareza, string> = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria' }

/** El precio de la fase 1 dice la rareza: hasta 50 común, hasta 150 rara, hasta 300 épica. */
export function rarezaDePrecio(precioViejo: number): Rareza {
  return precioViejo <= 50 ? 'comun' : precioViejo <= 150 ? 'rara' : precioViejo <= 300 ? 'epica' : 'legendaria'
}

/** Un cosmético pago, con el precio de su rareza; uno gratis queda igual (sin rareza). */
export function conRareza<T extends { precio: number }>(x: T): ConRareza<T> {
  if (x.precio <= 0) return x as unknown as ConRareza<T>
  const rareza = rarezaDePrecio(x.precio)
  return { ...x, precio: PRECIO_RAREZA[rareza], rareza } as unknown as ConRareza<T>
}

/** El tipo de un cosmético con la rareza puesta (el precio ya no es el literal de la fase 1). */
export type ConRareza<T> = T extends unknown ? Omit<T, 'precio'> & { precio: number; rareza?: Rareza } : never

/** Un catálogo entero con las rarezas puestas, sin perder el tipo de cada elemento. */
export function conRarezas<const T extends readonly { precio: number }[]>(xs: T): { [K in keyof T]: ConRareza<T[K]> } {
  return xs.map(conRareza) as { [K in keyof T]: ConRareza<T[K]> }
}
