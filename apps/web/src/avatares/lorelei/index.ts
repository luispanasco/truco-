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

/** Reemplaza las marcas `{{capa}}` por su pieza (que a su vez puede traer otras) y los colores. */
function componer(plantilla: string, a: Avatar): string {
  return plantilla
    .replace(/\{\{([a-z]+)\}\}/g, (_, capa: CapaLorelei) => {
      const pieza = piezaDe(capa, a)
      return pieza === null ? '' : `<g class="capa capa-${capa}">${componer(pieza, a)}</g>`
    })
    .replace(/\{\{color:([a-z]+)\}\}/g, (_, color: string) => {
      if (color === 'pelo') return COLORES_PELO[a.colorPelo] ?? COLORES_PELO[0]
      if (color === 'piel') return PIELES[a.piel] ?? PIELES[0]
      if (color === 'aros') return COLOR_AROS
      return TINTA
    })
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
    return [
      `<g class="capa capa-ropa">${ROPAS[a.ropa]?.(piel) ?? ''}</g>`,
      `<g transform="translate(10 -60)">${componer('{{pelo}}', a)}</g>`,
      a.sombrero > 0 ? `<g class="capa capa-sombrero">${SOMBREROS[a.sombrero - 1]?.(COLORES_PELO[a.colorPelo] ?? '') ?? ''}</g>` : '',
      a.accesorio > 0 ? `<g class="capa capa-accesorio">${ACCESORIOS[a.accesorio - 1]?.() ?? ''}</g>` : '',
    ].join('')
  },
}
