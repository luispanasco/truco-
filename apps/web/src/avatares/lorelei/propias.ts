/**
 * Piezas propias para el estilo Lorelei (que trae solo la cabeza y el cuello): torso con
 * ropa, sombreros y accesorios. Coordenadas en el viewBox de Lorelei (0 0 980 980), afuera
 * del `translate(10 -60)` de la cabeza.
 *
 * Mismo trazo que Lorelei: contorno negro grueso, rellenos planos y formas redondeadas.
 * Sin ids (ni clipPath ni pattern) en la ropa: las rayas se recortan a mano con la silueta,
 * así un SVG repetido en la página no choca con otro.
 */

type Punto = readonly [number, number]

const NEGRO = '#000'
const TRAZO = `stroke="${NEGRO}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"`
const fino = (color = NEGRO, ancho = 8, relleno = 'none') =>
  `stroke="${color}" stroke-width="${ancho}" stroke-linejoin="round" stroke-linecap="round" fill="${relleno}"`

const r = (n: number) => Math.round(n)
const camino = (ps: readonly Punto[]) => 'M' + ps.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')

/** Curva suave (Catmull-Rom) que pasa por los puntos, como polilínea densa. */
function curva(puntos: readonly Punto[], paso = 7): Punto[] {
  const salida: Punto[] = []
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i]!
    const p1 = puntos[i]!
    const p2 = puntos[i + 1]!
    const p3 = puntos[i + 2] ?? p2
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / paso))
    for (let k = 0; k < n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const eje = (j: 0 | 1) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)
      salida.push([eje(0), eje(1)])
    }
  }
  salida.push(puntos[puntos.length - 1]!)
  return salida
}

/** Aclara (f > 0) u oscurece (f < 0) un color #rrggbb. */
function tono(color: string, f: number): string {
  const n = parseInt(color.slice(1), 16)
  const canal = (c: number) => r(f >= 0 ? c + (255 - c) * f : c * (1 + f))
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(canal)
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------------------
// Torso
// ---------------------------------------------------------------------------------------

/**
 * El torso es la zona debajo de una línea de hombros (y = f(x)) que baja hasta el borde de
 * abajo a los dos lados. Así una franja vertical se recorta calculando esa línea.
 * El cuello de Lorelei baja entre x≈360 y x≈595 y se abre en hombros cerca de y=810–840.
 */
const HOMBRO_IZQ: Punto[] = [
  [96, 1000],
  [118, 940],
  [160, 892],
  [228, 858],
  [300, 836],
  [350, 822],
]
const HOMBRO_DER: Punto[] = [
  [604, 818],
  [668, 828],
  [738, 852],
  [800, 890],
  [840, 940],
  [858, 1000],
]
/** Escote redondo de remera. */
const ESCOTE_REDONDO: Punto[] = [
  [372, 818],
  [400, 846],
  [440, 864],
  [480, 868],
  [522, 862],
  [560, 846],
  [590, 818],
]
/** Escote en V de camiseta. */
const ESCOTE_V: Punto[] = [
  [372, 818],
  [410, 850],
  [446, 886],
  [476, 916],
  [506, 886],
  [544, 852],
  [590, 818],
]

function silueta(escote: Punto[]): Punto[] {
  return [...curva([...HOMBRO_IZQ, escote[0]!]), ...curva(escote).slice(1), ...curva([escote[escote.length - 1]!, ...HOMBRO_DER]).slice(1)]
}

/** La altura de la línea de hombros en x (interpolando la polilínea). */
function alturaEn(linea: readonly Punto[], x: number): number {
  for (let i = 0; i < linea.length - 1; i++) {
    const [x1, y1] = linea[i]!
    const [x2, y2] = linea[i + 1]!
    if (x >= x1 && x <= x2) return x2 === x1 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1)
  }
  return 1000
}

/** Franja vertical de x=a a x=b recortada por la línea de hombros. */
function franja(linea: readonly Punto[], a: number, b: number): string {
  const arriba: Punto[] = [[a, alturaEn(linea, a)], ...linea.filter(([x]) => x > a && x < b), [b, alturaEn(linea, b)]]
  return camino([...arriba, [b, 1000], [a, 1000]]) + 'Z'
}

const torso = (linea: readonly Punto[], relleno: string, conBorde = true) =>
  `<path d="${camino(linea)}Z" fill="${relleno}" ${conBorde ? TRAZO : 'stroke="none"'}/>`
const borde = (linea: readonly Punto[]) => `<path d="${camino(linea)}Z" fill="none" ${TRAZO}/>`

/** Costuras de las mangas: dan la forma de los hombros. */
const MANGAS = `<path d="M196 900c-14 30-20 62-20 100M760 900c14 30 22 62 22 100" ${fino()}/>`

/** El cuello elástico de una remera, apenas más oscuro. */
function ribete(escote: Punto[], color: string, ancho = 22): string {
  const afuera = curva(escote)
  const adentro = curva(escote.map(([x, y], i) => [x + (i === 0 ? -6 : i === escote.length - 1 ? 6 : 0), y + ancho] as Punto)).reverse()
  return `<path d="${camino([...afuera, ...adentro])}Z" ${fino(NEGRO, 8, color)}/>`
}

const LINEA_REDONDA = silueta(ESCOTE_REDONDO)
const LINEA_V = silueta(ESCOTE_V)

/** Remera lisa, cuello redondo. */
const remera = (color: string) => () =>
  torso(LINEA_REDONDA, color) + MANGAS + ribete(ESCOTE_REDONDO, tono(color, -0.12))

/** Camiseta de fútbol celeste con cuello en V blanco y puños blancos (sin escudo). */
const camiseta = (color: string, cuello: string) => () =>
  torso(LINEA_V, color) +
  MANGAS +
  ribete(ESCOTE_V, cuello, 26) +
  // Una costura al costado, como en las camisetas de juego.
  `<path d="M300 905c10 30 14 62 14 95M650 905c-10 30-14 62-14 95" stroke="${tono(color, -0.2)}" stroke-width="10" fill="none" stroke-linecap="round"/>` +
  borde(LINEA_V)

/** Camiseta a rayas verticales (cuello redondo del color de la raya oscura). */
const rayas = (fondo: string, raya: string) => () => {
  const ancho = 64
  // La raya del medio queda centrada en el pecho (x≈480).
  const franjas: string[] = []
  for (let x = 480 - ancho / 2 - 4 * ancho * 2; x < 900; x += ancho * 2) {
    franjas.push(`<path d="${franja(LINEA_REDONDA, Math.max(80, x), Math.min(880, x + ancho))}" fill="${raya}"/>`)
  }
  return torso(LINEA_REDONDA, fondo, false) + franjas.join('') + borde(LINEA_REDONDA) + MANGAS + ribete(ESCOTE_REDONDO, raya)
}

/** Buzo con la capucha caída sobre los hombros y los cordones. */
const buzo = (color: string) => () => {
  const oscuro = tono(color, -0.18)
  return (
    torso(LINEA_REDONDA, color) +
    MANGAS +
    // La capucha: un rollo de tela que rodea el cuello por detrás y cae sobre los hombros.
    `<path d="M300 836c-6-34 30-56 72-36 30 40 70 62 110 62s80-22 108-62c42-22 84 0 76 34-22 50-80 92-184 92s-160-40-182-90Z" fill="${oscuro}" ${TRAZO}/>` +
    `<path d="M352 846c34 34 76 52 128 52s92-18 124-52" ${fino()}/>` +
    // Cordones con sus puntas.
    `<path d="M438 898c-4 30-2 52 4 72M528 898c4 30 2 52-4 72" stroke="${NEGRO}" stroke-width="20" stroke-linecap="round" fill="none"/>` +
    `<path d="M438 898c-4 30-2 52 4 72M528 898c4 30 2 52-4 72" stroke="#f1f1ee" stroke-width="9" stroke-linecap="round" fill="none"/>` +
    `<path d="M442 970v14M524 970v14" stroke="${NEGRO}" stroke-width="22" stroke-linecap="round"/>`
  )
}

/** Campera de jean abierta sobre una remera blanca, con cuello, botones y costuras. */
const campera = (color: string) => () => {
  const hilo = '#e0a95a'
  const claro = tono(color, 0.18)
  return (
    torso(LINEA_REDONDA, color) +
    // La remera de abajo, en la abertura.
    `<path d="M400 846c24 14 50 20 80 20s56-6 80-20l-6 154H406Z" fill="#f5f5f0" ${TRAZO}/>` +
    // Solapas del cuello: dos puntas que se doblan hacia afuera.
    `<path d="M352 822c-36 26-64 60-74 104l96-26 26 30c2-50 4-86 4-112Z" fill="${claro}" ${TRAZO}/>` +
    `<path d="M604 818c36 26 66 60 76 104l-98-26-26 30c-2-50-4-86-4-112Z" fill="${claro}" ${TRAZO}/>` +
    // Bordes de la abertura con su pespunte y los botones.
    `<path d="M406 940v60M554 940v60" ${fino()}/>` +
    `<path d="M392 940v60M568 940v60" stroke="${hilo}" stroke-width="5" stroke-dasharray="10 9" fill="none"/>` +
    `<circle cx="378" cy="964" r="13" ${fino(NEGRO, 8, '#c9cdd2')}/>` +
    // Bolsillo del pecho con tapa.
    `<path d="M214 930l84-14 6 46-82 14Z" ${fino(NEGRO, 8, claro)}/>` +
    `<path d="M700 916l64 18-6 44-66-16Z" ${fino(NEGRO, 8, claro)}/>` +
    `<path d="M226 944l70-12M706 932l52 14" stroke="${hilo}" stroke-width="5" stroke-dasharray="10 9" fill="none"/>` +
    MANGAS
  )
}

/** Ropas, en el orden del catálogo (`CATALOGO_AVATAR.ropa`). */
export const ROPAS: readonly ((piel: string) => string)[] = [
  remera('#f5f5f0'),
  remera('#c83a32'),
  remera('#2f5fae'),
  remera('#3c8a4a'),
  camiseta('#7fb8e6', '#f5f5f0'),
  rayas('#f5f5f0', '#22201d'),
  rayas('#f2c230', '#22201d'),
  rayas('#c83a32', '#2f4f9e'),
  buzo('#9a9fa6'),
  campera('#4a6fa5'),
]

// ---------------------------------------------------------------------------------------
// Sombreros
// ---------------------------------------------------------------------------------------

/**
 * Un sombrero y la zona donde puede seguir viéndose el pelo (la cabeza va por debajo): el
 * pelo que queda arriba de esa línea lo tapa el sombrero, así no asoma por encima.
 */
export interface Sombrero {
  dibujo: (colorPelo: string) => string
  /** Camino cerrado (en el viewBox) de la zona donde se dibujan el pelo y la cabeza. */
  recorte: string
}

/** Zona de abajo de una línea que pasa por los puntos dados de izquierda a derecha. */
const debajoDe = (ps: Punto[]) => camino([[-20, ps[0]![1]], ...ps, [1000, ps[ps.length - 1]![1]], [1000, 1000], [-20, 1000]]) + 'Z'

const boina: Sombrero = {
  dibujo: () => {
    const c = '#2b3a67'
    return (
      // La tela abombada, caída hacia atrás (a la izquierda).
      `<path d="M262 292c-70-6-122-34-128-76-6-52 70-100 180-118 120-20 260-6 350 30 70 28 100 70 82 112-10 22-34 36-60 44Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M214 196c60-40 170-62 280-56" ${fino(tono(c, 0.25))}/>` +
      // El ribete de cuero contra la frente.
      `<path d="M252 270c140 20 320 10 448-30l12 30c-130 46-320 58-464 32Z" fill="${tono(c, -0.35)}" ${TRAZO}/>` +
      // El cabito de arriba.
      `<path d="M444 106c-4-22 0-40 10-50" stroke="${NEGRO}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
      `<path d="M444 106c-4-22 0-40 10-50" stroke="${c}" stroke-width="9" stroke-linecap="round" fill="none"/>`
    )
  },
  recorte: debajoDe([
    [150, 300],
    [260, 292],
    [480, 290],
    [706, 254],
    [800, 240],
  ]),
}

const gorroDeLana: Sombrero = {
  dibujo: () => {
    const c = '#c83a32'
    const pliegues = Array.from({ length: 11 }, (_, i) => {
      const x = 262 + i * 44
      const y = 334 - i * 6.6
      return `M${x} ${r(y - 62)}l2 ${54}`
    }).join('')
    return (
      // La copa, un poco caída hacia atrás.
      `<path d="M226 290c-4-96 74-170 200-182 146-14 262 50 296 156Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M330 146c-28 36-42 84-40 136M450 112c-14 46-16 100-8 160M576 132c10 44 14 90 10 134" stroke="${tono(c, -0.22)}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      // El doblez de abajo, con el tejido acanalado.
      `<path d="M214 284c160 2 340-18 516-62l10 70c-170 48-360 68-520 66Z" fill="${tono(c, -0.12)}" ${TRAZO}/>` +
      `<path d="${pliegues}" stroke="${tono(c, -0.35)}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      // El pompón, de lana más clara.
      `<path d="M470 124c-18-4-36-18-38-38-4-26 18-40 34-38 6-18 28-28 48-18 18-10 42 0 44 20 22 6 26 34 12 48 4 20-12 36-30 34-14 12-36 10-46-2-10 2-20-2-24-6Z" fill="#f3e9d2" ${TRAZO}/>`
    )
  },
  recorte: debajoDe([
    [120, 380],
    [220, 322],
    [480, 306],
    [735, 258],
    [860, 300],
  ]),
}

const gorra: Sombrero = {
  dibujo: () => {
    const c = '#2f5fae'
    return (
      // Visera hacia adelante (la cara mira a la derecha).
      `<path d="M620 248c80-22 170-20 236 6 26 10 24 36-2 40-72 10-150 14-226 10Z" fill="${tono(c, -0.2)}" ${TRAZO}/>` +
      // La copa con sus gajos.
      `<path d="M228 304c-14-120 60-200 190-210 160-12 278 60 290 170 2 18-6 30-24 34-130 24-290 30-456 6Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M444 96c-40 50-60 130-56 214M444 96c60 40 110 110 128 196" ${fino()}/>` +
      `<path d="M246 300c150 20 300 16 440-10" ${fino(tono(c, 0.35))} stroke-dasharray="12 10"/>` +
      // El botón de arriba.
      `<ellipse cx="444" cy="94" rx="26" ry="14" ${fino(NEGRO, 8, c)}/>`
    )
  },
  recorte: debajoDe([
    [130, 330],
    [228, 300],
    [480, 316],
    [700, 266],
    [860, 280],
  ]),
}

const sombreroDePaja: Sombrero = {
  dibujo: () => {
    const c = '#e6c477'
    const oscuro = tono(c, -0.22)
    // Calza a la altura de la frente: todo un poco más abajo que la línea de las otras piezas.
    return (
      `<g transform="translate(0 18)">` +
      // El ala, ancha y apenas inclinada.
      `<path d="M120 300c-24-50 120-104 330-114 200-10 362 22 380 70 14 38-110 76-300 88-210 12-382-6-410-44Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M190 296c90 24 220 30 340 22 120-8 220-30 260-54" stroke="${oscuro}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      // La copa con su hundido arriba.
      `<path d="M296 262c-14-60-12-120 12-152 30-12 70-4 92 10 26-18 92-26 140-10 30 10 50 30 56 60 6 30 6 60 0 90-90 22-200 24-300 2Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M400 122c10 20 30 30 50 30" ${fino()}/>` +
      // La cinta.
      `<path d="M292 218c100 22 210 20 306-2l-2 46c-96 22-200 22-302 2Z" fill="#8a2d2a" ${TRAZO}/>` +
      // Trama de la paja.
      `<path d="M330 150c10 6 20 8 30 8M560 140c-10 8-20 10-30 10M170 270c20-8 40-12 60-14M770 240c-16-10-36-14-58-16" stroke="${oscuro}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
      `</g>`
    )
  },
  recorte: debajoDe([
    [100, 318],
    [300, 308],
    [480, 314],
    [640, 298],
    [830, 278],
  ]),
}

/** Sombreros, sin el "Sin sombrero" (el 1 del catálogo es el primero de esta lista). */
export const SOMBREROS: readonly Sombrero[] = [boina, gorroDeLana, gorra, sombreroDePaja]

// ---------------------------------------------------------------------------------------
// Accesorios
// ---------------------------------------------------------------------------------------

/** Mate forrado en cuero, con virola y bombilla, en la mano (abajo a la derecha). */
function mate(piel: string): string {
  const cuero = '#3b332d'
  const metal = '#d4d7da'
  // Todo el mate va un poco más arriba que la mano, para que se vea entero en el círculo.
  return (
    `<g transform="translate(0 -40)">` +
    // Bombilla: trazo negro grueso y adentro el metal.
    `<path d="M700 806l52-96c6-12 18-16 30-12" stroke="${NEGRO}" stroke-width="26" stroke-linecap="round" fill="none"/>` +
    `<path d="M700 806l52-96c6-12 18-16 30-12" stroke="${metal}" stroke-width="12" stroke-linecap="round" fill="none"/>` +
    // Calabaza.
    `<path d="M646 834c-34 34-50 80-40 120 10 34 40 46 84 46s76-12 86-46c10-40-6-86-40-120Z" fill="${cuero}" ${TRAZO}/>` +
    `<path d="M630 900c20 18 50 26 84 22" stroke="${tono(cuero, 0.35)}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    // Yerba y virola.
    `<ellipse cx="692" cy="812" rx="54" ry="14" ${fino(NEGRO, 8, '#7d9a3c')}/>` +
    `<path d="M636 812c0 14 26 26 56 26s56-12 56-26l-2 26c-2 14-26 22-54 22s-52-8-54-22Z" fill="${metal}" ${TRAZO}/>` +
    `<path d="M700 806l10-18" stroke="${NEGRO}" stroke-width="26" stroke-linecap="round"/>` +
    `<path d="M700 806l10-18" stroke="${metal}" stroke-width="12" stroke-linecap="round"/>` +
    // La mano que lo sostiene, desde abajo: muñeca, tres dedos que lo abrazan y el pulgar.
    `<path d="M548 1060c-12-60-2-112 30-140 18-14 40-14 48 0 10 30 14 84 10 140Z" fill="${piel}" ${TRAZO}/>` +
    `<path d="M600 884c44-10 96-10 132-2 20 6 18 34-4 34-40-2-84 0-124 6Z" fill="${piel}" ${TRAZO}/>` +
    `<path d="M604 918c44-8 94-8 130 0 20 6 16 34-6 33-40-2-82 0-122 5Z" fill="${piel}" ${TRAZO}/>` +
    `<path d="M606 952c40-6 84-6 116 2 18 6 14 32-6 30-36-2-74 0-108 4Z" fill="${piel}" ${TRAZO}/>` +
    `<path d="M600 900c-10-32-2-62 22-80 12-8 28 2 22 18l-16 50" fill="${piel}" ${TRAZO}/>` +
    `</g>`
  )
}

/** Accesorios, sin el "Nada". Reciben el color de piel (para la mano). */
export const ACCESORIOS: readonly ((piel: string) => string)[] = [mate]
