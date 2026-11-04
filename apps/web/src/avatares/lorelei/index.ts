import { COLORES_PELO, PIELES, type Avatar } from '@truco/shared'
import type { EstiloAvatar } from '../estilo'
import { PIEZAS_LORELEI } from './piezas'
import { ACCESORIOS, BUFANDAS, EN_BOCA, ROPAS, SOMBREROS, comisura } from './propias'

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
 * Lo que va en la boca (pipa, pajita…), en el sistema de la cabeza: va justo después de la boca,
 * en su propia capa, así las señas lo mueven o lo ocultan sin cambiar la caja de la boca.
 */
function enBoca(a: Avatar): string {
  const dibujo = a.enBoca > 0 ? EN_BOCA[a.enBoca - 1] : undefined
  return dibujo ? `<g class="capa capa-enBoca">${dibujo(comisura(a.boca))}</g>` : ''
}

/**
 * Reemplaza las marcas `{{capa}}` por su pieza (que a su vez puede traer otras) y los colores.
 * `despuesDeCabeza` va justo después de la cabeza: entre el pelo de atrás y el de adelante.
 */
function componer(plantilla: string, a: Avatar, despuesDeCabeza = ''): string {
  return plantilla
    .replace(/\{\{([a-z]+)\}\}/g, (_, capa: CapaLorelei) => {
      const pieza = piezaDe(capa, a)
      const extra = capa === 'cabeza' ? despuesDeCabeza : capa === 'boca' ? enBoca(a) : ''
      const recorte = capa === 'cabeza' ? ` clip-path="url(#lorelei-recorte-cuello-${CUELLOS[a.cabeza] ? a.cabeza : 0})"` : ''
      return pieza === null ? extra : `<g class="capa capa-${capa}"${recorte}>${componer(pieza, a, despuesDeCabeza)}</g>${extra}`
    })
    .replace(/\{\{color:([a-z]+)\}\}/g, (_, color: string) => {
      if (color === 'pelo') return COLORES_PELO[a.colorPelo] ?? COLORES_PELO[0]
      if (color === 'piel') return PIELES[a.piel] ?? PIELES[0]
      if (color === 'aros') return COLOR_AROS
      return TINTA
    })
}

/**
 * El cuello de Lorelei termina en unos trazos de hombro que se abren hacia los costados y quedaban
 * sueltos por encima de la ropa. La cabeza se recorta (entera hasta abajo de la pera y, más abajo,
 * solo la columna del cuello) y el cuello sigue con dos trazos propios que bajan hasta los hombros
 * de la ropa. El recorte va en el sistema de la cabeza (`translate(10 -60)`); todos los avatares
 * de la página usan el mismo id con el mismo recorte.
 */
/** Dónde está cada lado del cuello para cada cabeza (en el viewBox): el izquierdo en y=750 y el derecho en y=770. */
const CUELLOS: readonly (readonly [number, number])[] = [
  [359, 594],
  [364, 592],
  [358, 591],
  [366, 589],
]
/** Por dónde bajan los costados del cuello, del lado izquierdo y del derecho, hasta los hombros de la ropa. */
const costados = (izq: number, der: number) => ({
  izq: `M${izq} 750C${izq - 1} 784 ${izq - 6} 806 ${izq - 9} 834`,
  der: `M${der} 770C${der + 1} 790 ${der + 6} 806 ${der + 10} 830`,
})

/** El recorte de la cabeza (en el sistema de la cabeza) y los costados del cuello (en el de la ropa). */
function cuello(cabeza: number): { recorte: string; id: string; costados: string } {
  const n = CUELLOS[cabeza] ? cabeza : 0
  const [izq, der] = CUELLOS[n]!
  const id = `lorelei-recorte-cuello-${n}`
  const c = costados(izq, der)
  // Afuera de los costados (debajo de la pera) no queda nada de la cabeza: los tapa el trazo.
  const recorte =
    `<clipPath id="${id}"><path transform="translate(-10 60)" ` +
    `d="M-100 -100H1100V770H${der}C${der + 1} 790 ${der + 6} 806 ${der + 10} 830V1100H${izq - 9}V834C${izq - 6} 806 ${izq - 1} 784 ${izq} 750H-100Z"/></clipPath>`
  return { recorte, id, costados: `<path d="${c.izq}${c.der}" stroke="#000" stroke-width="12" stroke-linecap="round" fill="none"/>` }
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
 * sombreros, los accesorios y lo que va en la boca son dibujos nuestros con el mismo trazo (propias.ts).
 */
export const LORELEI: EstiloAvatar = {
  nombre: 'Lorelei',
  viewBox: '0 0 980 980',
  cara: { x: 320, y: 270, ancho: 450, alto: 520 },
  dibujar(a) {
    const piel = PIELES[a.piel] ?? PIELES[0]
    // La ropa va encima del cuello de Lorelei (que termina en un pecho sin contorno) y debajo
    // del pelo de adelante, que cae sobre los hombros. Sus coordenadas son las del viewBox.
    const ropa = `<g class="capa capa-ropa" transform="translate(-10 60)">${cuello(a.cabeza).costados}${ROPAS[a.ropa]?.(piel) ?? ''}</g>`
    const sombrero = a.sombrero > 0 ? SOMBREROS[a.sombrero - 1] : undefined
    const cabeza = `<g transform="translate(10 -60)">${cuello(a.cabeza).recorte}${componer('{{pelo}}', a, ropa)}</g>`
    return [
      sombrero ? recortado(cabeza, a.sombrero, sombrero.recorte) : cabeza,
      sombrero ? `<g class="capa capa-sombrero">${sombrero.dibujo(COLORES_PELO[a.colorPelo] ?? COLORES_PELO[0])}</g>` : '',
      // La bufanda va sobre el cuello y la ropa (y el pelo que cae sobre los hombros), debajo de la mano.
      a.bufanda > 0 ? `<g class="capa capa-bufanda">${BUFANDAS[a.bufanda - 1] ?? ''}</g>` : '',
      a.accesorio > 0 ? `<g class="capa capa-accesorio">${ACCESORIOS[a.accesorio - 1]?.(piel) ?? ''}</g>` : '',
    ].join('')
  },
}
