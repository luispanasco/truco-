/**
 * Tipografías (cosmético): la letra con la que se ve toda la app. Es personal, como la mesa
 * del perfil: no viaja al servidor y no la ve nadie más.
 *
 * Todas son de licencia libre (OFL, de Google Fonts) y la web las guarda con los paquetes de
 * @fontsource, así andan sin internet. El id queda guardado en el perfil: no se cambia ni se reusa.
 */

/** Una tipografía del catálogo. `precio` en monedas de juego: 0 es gratis; las demás, en la tienda (fase 2). */
export interface Tipografia {
  id: string
  nombre: string
  /** Cómo es, en pocas palabras (para el selector). */
  detalle: string
  /** La familia CSS del texto, con lo que se usa mientras carga (Nunito, que ya está). */
  familia: string
  /** La de los títulos: si no está, la misma del texto. */
  titulos?: string
  /**
   * Cuánto se agranda o achica el texto para que se lea como con Nunito: las anchas (Press Start 2P,
   * Pacifico) van más chicas, así no rompen la mesa en un celular angosto; las finitas, más grandes.
   */
  escala: number
  /** Si trae negrita propia. Si no, el navegador no la inventa (queda más prolija). */
  negrita: boolean
  precio: number
}

const RESPALDO = "'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** Precios provisorios: se ajustan en la fase 2 con la economía. */
export const TIPOGRAFIAS = [
  {
    id: 'nunito',
    nombre: 'Nunito',
    detalle: 'Redonda, con títulos de Alfa Slab One: la de siempre',
    familia: RESPALDO,
    titulos: "'Alfa Slab One', Georgia, serif",
    escala: 1,
    negrita: true,
    precio: 0,
  },
  {
    id: 'alfa-slab',
    nombre: 'Alfa Slab One',
    detalle: 'La de los títulos, en toda la app',
    familia: `'Alfa Slab One', ${RESPALDO}`,
    escala: 0.9,
    negrita: false,
    precio: 0,
  },
  { id: 'bebas-neue', nombre: 'Bebas Neue', detalle: 'Mayúsculas finitas, de cartel', familia: `'Bebas Neue', ${RESPALDO}`, escala: 1.12, negrita: false, precio: 200 },
  { id: 'special-elite', nombre: 'Special Elite', detalle: 'De máquina de escribir', familia: `'Special Elite', ${RESPALDO}`, escala: 0.95, negrita: false, precio: 300 },
  { id: 'playfair', nombre: 'Playfair Display', detalle: 'Con serifa, elegante', familia: `'Playfair Display', ${RESPALDO}`, escala: 1, negrita: true, precio: 300 },
  { id: 'caveat', nombre: 'Caveat', detalle: 'Escrita a mano, como en la libreta de los tantos', familia: `'Caveat', ${RESPALDO}`, escala: 1.12, negrita: true, precio: 300 },
  { id: 'lobster', nombre: 'Lobster', detalle: 'Cursiva gruesa, de cartel de boliche', familia: `'Lobster', ${RESPALDO}`, escala: 0.98, negrita: false, precio: 400 },
  { id: 'permanent-marker', nombre: 'Permanent Marker', detalle: 'De marcador, como en la pizarra', familia: `'Permanent Marker', ${RESPALDO}`, escala: 0.88, negrita: false, precio: 400 },
  { id: 'pacifico', nombre: 'Pacifico', detalle: 'Cursiva redonda, playera', familia: `'Pacifico', ${RESPALDO}`, escala: 0.82, negrita: false, precio: 500 },
  { id: 'press-start', nombre: 'Press Start 2P', detalle: 'De videojuego de los ochenta', familia: `'Press Start 2P', ${RESPALDO}`, escala: 0.58, negrita: false, precio: 500 },
] as const satisfies readonly Tipografia[]

export type IdTipografia = (typeof TIPOGRAFIAS)[number]['id']

export const TIPOGRAFIA_DEFAULT: IdTipografia = 'nunito'

export function buscarTipografia(id: unknown): Tipografia | undefined {
  return TIPOGRAFIAS.find((t) => t.id === id)
}

export function tipografiaGratis(id: unknown): boolean {
  return buscarTipografia(id)?.precio === 0
}

/**
 * La tipografía que se puede usar: un id que no existe (o un valor roto) vuelve a Nunito, y
 * mientras no exista la tienda, las pagas también.
 */
export function normalizarTipografia(id: unknown, puedeUsar: (id: IdTipografia) => boolean = tipografiaGratis): IdTipografia {
  const t = TIPOGRAFIAS.find((x) => x.id === id)
  return t && puedeUsar(t.id) ? t.id : TIPOGRAFIA_DEFAULT
}
