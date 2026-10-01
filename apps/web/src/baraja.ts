import { create } from 'zustand'
import type { Carta, Palo } from '@truco/engine'
import { guardarPerfil, leerPerfil } from './perfil'

/**
 * Barajas para elegir (es solo cosmético): la propia, dibujada en SVG por código, y la clásica
 * de Heraclio Fournier (1878), de dominio público, en imágenes WebP (ver
 * public/barajas/fournier-1878/CREDITOS.md y scripts/baraja-fournier.py).
 */
export type Baraja = 'propia' | 'fournier1878'

export const BARAJAS: { id: Baraja; nombre: string; credito?: string }[] = [
  { id: 'propia', nombre: 'Propia' },
  { id: 'fournier1878', nombre: 'Clásica 1878', credito: 'Fournier 1878 · dominio público' },
]

const PALOS: Palo[] = ['espada', 'basto', 'oro', 'copa']
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const

function carpeta(): string {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base.endsWith('/') ? base : base + '/'}barajas/fournier-1878/`
}

/** Imagen de una carta de la baraja clásica (o el dorso, sin carta). */
export function imagenFournier(carta?: Pick<Carta, 'numero' | 'palo'>): string {
  return carpeta() + (carta ? `${carta.numero}-${carta.palo}.webp` : 'dorso.webp')
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
  const urls = [imagenFournier(), ...PALOS.flatMap((palo) => NUMEROS.map((numero) => imagenFournier({ numero, palo })))]
  for (const src of urls) {
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
