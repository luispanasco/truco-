import { COLORES_PELO, PIELES, type Avatar } from '@truco/shared'
import type { EstiloAvatar } from '../estilo'
import { PIEZAS_LORELEI } from './piezas'
import { ACCESORIOS, ROPAS, SOMBREROS } from './propias'

/** Color de los trazos de la cara (ojos, cejas, nariz, boca, lentes). */
const TINTA = '#1d1a16'
const COLOR_AROS = '#d9b36c'

type CapaLorelei = keyof typeof PIEZAS_LORELEI

/** La pieza de Lorelei que va en cada marca, según el avatar (null: la capa va vacía). */
function piezaDe(capa: CapaLorelei, a: Avatar): string | null {
  const p = PIEZAS_LORELEI[capa]
  switch (capa) {
    case 'pelo':
      return p[a.pelo] ?? null
    case 'cabeza':
      return p[a.cabeza] ?? null
    case 'ojos':
      return p[a.ojos] ?? null
    case 'cejas':
      return p[a.cejas] ?? null
    case 'nariz':
      return p[a.nariz] ?? null
    case 'boca':
      return p[a.boca] ?? null
    // Las opcionales: la pieza 0 es "sin".
    case 'barba':
      return a.barba > 0 ? (p[a.barba - 1] ?? null) : null
    case 'lentes':
      return a.lentes > 0 ? (p[a.lentes - 1] ?? null) : null
    case 'aros':
      return a.aros > 0 ? (p[a.aros - 1] ?? null) : null
    case 'pecas':
      return a.pecas > 0 ? (p[a.pecas - 1] ?? null) : null
  }
}

/**
 * Reemplaza las marcas `{{capa}}` por su pieza (que a su vez puede traer otras) y los colores.
 * `despuesDeCabeza` va justo después de la cabeza: entre el pelo de atrás y el de adelante.
 */
function componer(plantilla: string, a: Avatar, despuesDeCabeza = ''): string {
  return plantilla
    .replace(/\{\{([a-z]+)\}\}/g, (_, capa: CapaLorelei) => {
      const pieza = piezaDe(capa, a)
      const extra = capa === 'cabeza' ? despuesDeCabeza : ''
      return pieza === null ? extra : `<g class="capa capa-${capa}">${componer(pieza, a, despuesDeCabeza)}</g>${extra}`
    })
    .replace(/\{\{color:([a-z]+)\}\}/g, (_, color: string) => {
      if (color === 'pelo') return COLORES_PELO[a.colorPelo] ?? COLORES_PELO[0]
      if (color === 'piel') return PIELES[a.piel] ?? PIELES[0]
      if (color === 'aros') return COLOR_AROS
      return TINTA
    })
}

/**
 * Con sombrero, el pelo de arriba (y la ropa, que queda lejos) se recorta para que no asome
 * por encima. El id depende solo del sombrero: si hay varios avatares en la página, todos
 * los clipPath con el mismo id son iguales.
 */
function recortado(contenido: string, sombrero: number, recorte: string): string {
  const id = `lorelei-recorte-sombrero-${sombrero}`
  return `<clipPath id="${id}"><path d="${recorte}"/></clipPath><g clip-path="url(#${id})">${contenido}</g>`
}

/**
 * Lorelei (DiceBear), de Lisa Wischofsky, CC0 1.0: cabeza y cara. El torso, la ropa, los
 * sombreros y los accesorios son dibujos nuestros con el mismo trazo (propias.ts).
 */
export const LORELEI: EstiloAvatar = {
  nombre: 'Lorelei',
  viewBox: '0 0 980 980',
  dibujar(a) {
    const piel = PIELES[a.piel] ?? PIELES[0]
    // La ropa va encima del cuello de Lorelei (que termina en un pecho sin contorno) y debajo
    // del pelo de adelante, que cae sobre los hombros. Sus coordenadas son las del viewBox.
    const ropa = `<g class="capa capa-ropa" transform="translate(-10 60)">${ROPAS[a.ropa]?.(piel) ?? ''}</g>`
    const sombrero = a.sombrero > 0 ? SOMBREROS[a.sombrero - 1] : undefined
    const cabeza = `<g transform="translate(10 -60)">${componer('{{pelo}}', a, ropa)}</g>`
    return [
      sombrero ? recortado(cabeza, a.sombrero, sombrero.recorte) : cabeza,
      sombrero ? `<g class="capa capa-sombrero">${sombrero.dibujo(COLORES_PELO[a.colorPelo] ?? COLORES_PELO[0])}</g>` : '',
      a.accesorio > 0 ? `<g class="capa capa-accesorio">${ACCESORIOS[a.accesorio - 1]?.(piel) ?? ''}</g>` : '',
    ].join('')
  },
}
