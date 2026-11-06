import { create } from 'zustand'
import type { Carta, Palo } from '@truco/engine'
import { BARAJAS as CATALOGO_BARAJAS, type IdBaraja } from '@truco/shared'
import { guardarPerfil, leerPerfil } from './perfil'

/**
 * Barajas para elegir (es solo cosmético): la propia, dibujada en SVG por código, tres antiguas
 * de dominio público en imágenes WebP de 400 × 600 (la clásica de Heraclio Fournier de 1878, "El
 * Cid" de 1888 y la de Grimaud de 1860; ver los scripts que las generan, scripts/baraja-fournier.py
 * y scripts/baraja-gallica.py) y los diseños propios, también en WebP de 400 × 600: Oriental,
 * Costa Uruguaya, Colonial, Grabado Nocturno y una por departamento. Los créditos, en el CREDITOS.md de cada carpeta. El catálogo
 * (ids y precios) está en @truco/shared: en una sala, la baraja la pone el anfitrión.
 */
export type Baraja = IdBaraja

/**
 * Lo que agrega la web al catálogo: el nombre corto ("Baraja clásica") y el crédito. Las de los
 * departamentos no están: se llaman como el departamento y son diseño propio.
 */
const EXTRA: Partial<Record<Baraja, { corto: string; credito?: string }>> = {
  propia: { corto: 'propia' },
  fournier1878: { corto: 'clásica', credito: 'Fournier 1878 · dominio público' },
  cid1888: { corto: 'El Cid', credito: 'Simeón Durá, Valencia 1888 · dominio público' },
  grimaud1860: { corto: 'Grimaud', credito: 'B. P. Grimaud 1860 · dominio público' },
  oriental: { corto: 'Oriental', credito: 'Diseño propio' },
  costa: { corto: 'Costa', credito: 'Diseño propio' },
  colonial: { corto: 'Colonial', credito: 'Diseño propio' },
  grabado: { corto: 'Grabado', credito: 'Diseño propio' },
}

/** Carpeta (en public/barajas) de cada baraja en imágenes; las de los departamentos, su id. */
const CARPETAS: Partial<Record<Exclude<Baraja, 'propia'>, string>> = {
  fournier1878: 'fournier-1878',
  cid1888: 'cid-1888',
  grimaud1860: 'grimaud-1860',
  oriental: 'oriental',
  costa: 'costa-uruguaya',
  colonial: 'colonial',
  grabado: 'grabado-nocturno',
}

export const BARAJAS: { id: Baraja; nombre: string; precio: number; recompensa?: string; corto: string; credito?: string }[] = CATALOGO_BARAJAS.map(
  (b) => ({ ...b, ...(EXTRA[b.id] ?? { corto: b.nombre, credito: 'Diseño propio' }) }),
)

const PALOS: Palo[] = ['espada', 'basto', 'oro', 'copa']
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const

function carpeta(b: Exclude<Baraja, 'propia'>): string {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base.endsWith('/') ? base : base + '/'}barajas/${CARPETAS[b] ?? b}/`
}

/** Imagen de una carta de una baraja en imágenes (o el dorso, sin carta). */
export function imagenCarta(b: Exclude<Baraja, 'propia'>, carta?: Pick<Carta, 'numero' | 'palo'>): string {
  return carpeta(b) + (carta ? `${carta.numero}-${carta.palo}.webp` : 'dorso.webp')
}

/** Las 41 imágenes de una baraja (las 40 cartas y el dorso); ninguna si es la propia, en SVG. */
export function imagenesBaraja(b: Baraja): string[] {
  if (b === 'propia') return []
  return [imagenCarta(b), ...PALOS.flatMap((palo) => NUMEROS.map((numero) => imagenCarta(b, { numero, palo })))]
}

/**
 * Para jugar sin internet: pide las imágenes de la baraja elegida pasando por el service worker,
 * que las guarda (vite.config.ts). Hace falta cuando se eligió la baraja antes de que el service
 * worker controlara la página (la primera visita): esa precarga no quedó guardada. Lo que ya está
 * guardado sale de la caché, sin red.
 */
export async function guardarBarajaSinConexion() {
  await Promise.all(imagenesBaraja(useBaraja.getState().baraja).map((url) => fetch(url).catch(() => null)))
}

const precargadas = new Set<Baraja>()
/** Guarda las imágenes vivas para que el navegador no las suelte antes de usarlas. */
const imagenes: HTMLImageElement[] = []

/**
 * Baja de una vez las 41 imágenes de la baraja elegida (si son imágenes), para que al repartir
 * o al dar vuelta una carta no haya parpadeo. Se hace una sola vez por baraja.
 */
export function precargarBaraja(b: Baraja) {
  if (b === 'propia' || precargadas.has(b) || typeof Image === 'undefined') return
  precargadas.add(b)
  for (const src of imagenesBaraja(b)) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    imagenes.push(img)
  }
}

interface EstadoBaraja {
  baraja: Baraja
}

/** La baraja elegida, compartida por todas las cartas; arranca con la del perfil guardado. */
export const useBaraja = create<EstadoBaraja>(() => ({ baraja: leerPerfil().baraja }))

/** Redibuja todas las cartas con la baraja `b` (sin guardarla: para eso, `elegirBaraja`). */
export function mostrarBaraja(b: Baraja) {
  useBaraja.setState({ baraja: b })
  precargarBaraja(b)
}

/** Cambia la baraja y la recuerda en el perfil guardado. */
export function elegirBaraja(b: Baraja) {
  guardarPerfil({ ...leerPerfil(), baraja: b })
  mostrarBaraja(b)
}
