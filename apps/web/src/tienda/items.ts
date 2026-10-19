import { codificarAvatar, leerAvatar, type CapaAvatar, type IdMesa, type IdTipografia, type ItemTienda } from '@truco/shared'
import type { Perfil } from '../perfil'

/** Qué es, en una palabra: va arriba del nombre en el probador ("Peinado · Épica"). */
const NOMBRE_CAPA: Record<CapaAvatar, string> = {
  piel: 'Piel',
  cabeza: 'Cara',
  pelo: 'Peinado',
  colorPelo: 'Color de pelo',
  cejas: 'Cejas',
  ojos: 'Ojos',
  nariz: 'Nariz',
  boca: 'Boca',
  barba: 'Barba',
  lentes: 'Lentes',
  aros: 'Aros',
  pecas: 'Pecas',
  ropa: 'Ropa',
  sombrero: 'Sombrero',
  accesorio: 'En la mano',
  bufanda: 'Al cuello',
  enBoca: 'En la boca',
}

export function tipoDeItem(item: ItemTienda): string {
  if (item.tipo === 'mesa') return 'Mesa'
  if (item.tipo === 'tipografia') return 'Letra'
  return NOMBRE_CAPA[item.capa!]
}

/** Si ya lo tenés puesto. */
export function estaPuesto(item: ItemTienda, p: Perfil): boolean {
  if (item.tipo === 'mesa') return p.mesa === item.ref
  if (item.tipo === 'tipografia') return p.tipografia === item.ref
  return leerAvatar(p.avatar)?.[item.capa!] === item.pieza
}

/** Lo que cambia en el perfil al usarlo. */
export function ponerItem(item: ItemTienda, p: Perfil): Partial<Perfil> {
  if (item.tipo === 'mesa') return { mesa: item.ref as IdMesa }
  if (item.tipo === 'tipografia') return { tipografia: item.ref as IdTipografia }
  const a = leerAvatar(p.avatar)
  return a ? { avatar: codificarAvatar({ ...a, [item.capa!]: item.pieza! }) } : {}
}

/**
 * Cómo se encuadra el avatar para mostrar una pieza: de cerca lo de la cara, la cabeza para el
 * pelo y los sombreros, de medio cuerpo para la ropa y lo que se tiene en la mano.
 */
export type Enfoque = 'ojos' | 'boca' | 'cara' | 'oreja' | 'cabeza' | 'busto'

const ENFOQUE: Record<CapaAvatar, Enfoque> = {
  piel: 'cara',
  cabeza: 'cara',
  pelo: 'cabeza',
  colorPelo: 'cabeza',
  sombrero: 'cabeza',
  cejas: 'ojos',
  ojos: 'ojos',
  lentes: 'ojos',
  nariz: 'cara',
  pecas: 'cara',
  boca: 'boca',
  barba: 'boca',
  enBoca: 'boca',
  aros: 'oreja',
  ropa: 'busto',
  bufanda: 'busto',
  accesorio: 'busto',
}

export const enfoqueDe = (capa: CapaAvatar): Enfoque => ENFOQUE[capa]

/**
 * El punto del dibujo que va al centro y cuánto se acerca, a partir de la caja de la cara del
 * estilo (de las cejas a la pera). En la muestra chica se acerca más que en el probador, donde
 * entra más del avatar para ver cómo queda.
 */
export function foco(enfoque: Enfoque, cara: { x: number; y: number; ancho: number; alto: number }, grande: boolean) {
  const { x, y, ancho, alto } = cara
  const cx = x + ancho / 2
  // En el probador, lo de la cara se ve con la cara entera: así se ve cómo queda.
  if (grande && (enfoque === 'ojos' || enfoque === 'boca' || enfoque === 'cara')) return { x: cx - ancho * 0.06, y: y + alto * 0.42, zoom: 1.5 }
  switch (enfoque) {
    case 'ojos':
      return { x: cx - ancho * 0.07, y: y + alto * 0.3, zoom: 2.3 }
    case 'boca':
      return { x: cx - ancho * 0.03, y: y + alto * 0.62, zoom: 2.3 }
    case 'cara':
      return { x: cx - ancho * 0.04, y: y + alto * 0.48, zoom: 1.85 }
    case 'oreja':
      return { x: x - ancho * 0.08, y: y + alto * 0.5, zoom: grande ? 2.2 : 3.2 }
    case 'cabeza':
      return { x: cx - ancho * 0.1, y: y + alto * 0.12, zoom: grande ? 1.1 : 1.3 }
    case 'busto':
      // Grande se ve entero: la ropa ocupa poco del dibujo, de los hombros para abajo.
      return { x: cx - ancho * 0.1, y: y + alto * 0.85, zoom: grande ? 1 : 1.3 }
  }
}
