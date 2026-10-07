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

/**
 * Camiseta con cuello en V de un color y un vivo de otro adentro del cuello y en los puños:
 * la blanca tricolor (cuello azul, vivo rojo).
 */
const camisetaConVivo = (color: string, cuello: string, vivo: string) => () =>
  camiseta(color, cuello)() +
  `<path d="${camino(curva(ESCOTE_V.map(([x, y]) => [x, y + 20] as Punto)))}" stroke="${vivo}" stroke-width="9" fill="none" stroke-linecap="round"/>` +
  `<path d="M184 958c-6 14-8 28-8 42M776 958c6 14 8 28 8 42" stroke="${vivo}" stroke-width="14" fill="none" stroke-linecap="round"/>`

/**
 * Camiseta lisa con una franja diagonal que cruza el pecho desde el hombro izquierdo (el de
 * la derecha de la pantalla) hasta la cadera del otro lado. La franja se recorta a mano con la
 * silueta: para cada x, el tramo entre los dos bordes de la franja que cae debajo de los hombros.
 */
const conFranjaDiagonal = (fondo: string, banda: string, cuello: string) => () => {
  const linea = LINEA_V
  // Bordes de la franja: rectas y = y0 + m (x - 480), con el pecho (x=480) a media altura.
  const m = -0.62
  const borde1 = (x: number) => 892 + m * (x - 480)
  const borde2 = (x: number) => 892 + 92 + m * (x - 480)
  const arriba: Punto[] = []
  const abajo: Punto[] = []
  for (let x = 90; x <= 870; x += 6) {
    const techo = Math.max(alturaEn(linea, x), borde1(x))
    const piso = Math.min(1000, borde2(x))
    if (piso <= techo) continue
    arriba.push([x, techo])
    abajo.push([x, piso])
  }
  const banda_ = arriba.length > 1 ? `<path d="${camino([...arriba, ...abajo.reverse()])}Z" fill="${banda}"/>` : ''
  return torso(linea, fondo, false) + banda_ + borde(linea) + MANGAS + ribete(ESCOTE_V, cuello, 26)
}

/**
 * Camiseta celeste "de época" (como las de 1930): cuello redondo blanco con una abertura en el
 * pecho cerrada con cordón cruzado.
 */
const deEpoca = (color: string, cuello: string) => () =>
  torso(LINEA_REDONDA, color) +
  MANGAS +
  ribete(ESCOTE_REDONDO, cuello, 30) +
  // La abertura del pecho y el cordón que la cierra.
  `<path d="M480 896v74" ${fino(NEGRO, 8)}/>` +
  `<path d="M462 906l36 18M498 906l-36 18M462 932l36 18M498 932l-36 18" stroke="${NEGRO}" stroke-width="13" stroke-linecap="round" fill="none"/>` +
  `<path d="M462 906l36 18M498 906l-36 18M462 932l36 18M498 932l-36 18" stroke="${cuello}" stroke-width="6" stroke-linecap="round" fill="none"/>` +
  `<circle cx="462" cy="906" r="5" fill="${NEGRO}"/><circle cx="498" cy="906" r="5" fill="${NEGRO}"/>`

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
  // Colores de los cuadros y de la selección, sin escudos.
  camisetaConVivo('#f5f5f0', '#1f3c88', '#c8323a'),
  camiseta('#5b2a86', '#f5f5f0'),
  conFranjaDiagonal('#f5f5f0', '#22201d', '#22201d'),
  rayas('#2e8b4a', '#c83a32'),
  rayas('#f5f5f0', '#7fb8e6'),
  rayas('#2f4f9e', '#22201d'),
  rayas('#f5f5f0', '#2e8b4a'),
  rayas('#f5f5f0', '#5b2a86'),
  camiseta('#f5f5f0', '#7fb8e6'),
  deEpoca('#7fb8e6', '#f5f5f0'),
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

/**
 * La mano que sostiene un accesorio, desde abajo a la derecha: muñeca, tres dedos que lo abrazan
 * y el pulgar. Va encima del objeto. Coordenadas como las del mate (antes del corrimiento).
 */
const mano = (piel: string) =>
  `<path d="M548 1060c-12-60-2-112 30-140 18-14 40-14 48 0 10 30 14 84 10 140Z" fill="${piel}" ${TRAZO}/>` +
  `<path d="M600 884c44-10 96-10 132-2 20 6 18 34-4 34-40-2-84 0-124 6Z" fill="${piel}" ${TRAZO}/>` +
  `<path d="M604 918c44-8 94-8 130 0 20 6 16 34-6 33-40-2-82 0-122 5Z" fill="${piel}" ${TRAZO}/>` +
  `<path d="M606 952c40-6 84-6 116 2 18 6 14 32-6 30-36-2-74 0-108 4Z" fill="${piel}" ${TRAZO}/>` +
  `<path d="M600 900c-10-32-2-62 22-80 12-8 28 2 22 18l-16 50" fill="${piel}" ${TRAZO}/>`

/** Un accesorio en la mano: todo un poco más arriba, para que se vea entero en el círculo. */
const enLaMano = (piel: string, objeto: string, detras = '') => `<g transform="translate(0 -40)">${detras}${objeto}${mano(piel)}</g>`

/** Mate forrado en cuero, con virola y bombilla (sin la mano). */
function dibujoMate(): string {
  const cuero = '#3b332d'
  const metal = '#d4d7da'
  return (
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
    `<path d="M700 806l10-18" stroke="${metal}" stroke-width="12" stroke-linecap="round"/>`
  )
}

/** Mate forrado en cuero, con virola y bombilla, en la mano (abajo a la derecha). */
const mate = (piel: string) => enLaMano(piel, dibujoMate())

/** Termo verde de acero, con su tapón y el pico cebador, corrido (x, y) de donde lo agarra la mano. */
function dibujoTermo(x = 0, y = 0): string {
  const verde = '#3f6e46'
  const metal = '#c9cdd2'
  return (
    `<g transform="translate(${x} ${y})">` +
    // Cuerpo, con un brillo vertical.
    `<path d="M630 690c0-14 10-22 24-22h76c14 0 24 8 24 22v300c0 14-10 22-24 22h-76c-14 0-24-8-24-22Z" fill="${verde}" ${TRAZO}/>` +
    `<path d="M656 700v270" stroke="${tono(verde, 0.35)}" stroke-width="12" stroke-linecap="round"/>` +
    // Anillos de metal y el tapón con el pico.
    `<path d="M632 700h120M632 980h120" stroke="${metal}" stroke-width="14"/>` +
    `<path d="M650 668v-34c0-10 8-16 18-16h48c10 0 18 6 18 16v34Z" fill="${tono(verde, -0.25)}" ${TRAZO}/>` +
    `<path d="M676 618v-22c0-6 4-10 10-10h14c6 0 10 4 10 10v22Z" fill="${metal}" ${TRAZO}/>` +
    `</g>`
  )
}

/** Celular negro con la pantalla prendida. */
const dibujoCelular = () =>
  `<rect x="626" y="740" width="118" height="220" rx="18" fill="#1e1e22" ${TRAZO}/>` +
  `<rect x="640" y="760" width="90" height="176" rx="8" fill="#7fb8e6"/>` +
  `<path d="M652 790h52M652 818h66M652 846h40" stroke="#f5f5f0" stroke-width="10" stroke-linecap="round"/>`

/** Libro de tapa dura, apenas inclinado, con el lomo y el borde de las hojas. */
const dibujoLibro = () =>
  `<g transform="rotate(-8 690 870)">` +
  `<path d="M604 740h170v240H604Z" fill="#f5efe0" ${TRAZO}/>` +
  `<path d="M596 734h168v236H596Z" fill="#8a2d2a" ${TRAZO}/>` +
  `<path d="M620 734v236" stroke="${tono('#8a2d2a', -0.3)}" stroke-width="10"/>` +
  `<path d="M648 790h88M648 816h70" stroke="#e6c477" stroke-width="9" stroke-linecap="round"/>` +
  `</g>`

/** Diario doblado, con el titular, las columnas y una foto. */
const dibujoDiario = () =>
  `<g transform="rotate(10 690 860)">` +
  `<path d="M598 720h190v270H598Z" fill="#ecebe4" ${TRAZO}/>` +
  `<path d="M616 748h154" stroke="${NEGRO}" stroke-width="16"/>` +
  `<path d="M616 784h70M616 806h70M616 828h70M616 850h70M700 784h70M700 806h70M700 828h70" stroke="#8d8d88" stroke-width="7"/>` +
  `<rect x="700" y="842" width="70" height="40" fill="#b5b4ad"/>` +
  `</g>`

/** Pelota de fútbol de gajos, apoyada en la mano. */
const dibujoPelota = () =>
  `<circle cx="690" cy="830" r="96" fill="#f5f5f0" ${TRAZO}/>` +
  `<path d="M690 794l34 24-13 40h-42l-13-40Z" fill="#22201d"/>` +
  `<path d="M690 794v-60M724 818l56-20M711 858l34 50M669 858l-34 50M656 818l-56-20" stroke="${NEGRO}" stroke-width="8" stroke-linecap="round"/>` +
  `<path d="M640 742l-22 22 6 30 30-6ZM740 742l22 22-6 30-30-6Z" fill="#22201d"/>`

/** Tres naipes abiertos en abanico: el de atrás de dorso, un 1 de espada y un 7 de oro. */
function dibujoNaipes(): string {
  const carta = (giro: number, relleno: string, extra: string) =>
    `<g transform="rotate(${giro} 690 960)"><rect x="640" y="720" width="100" height="150" rx="10" fill="${relleno}" ${TRAZO}/>${extra}</g>`
  return (
    carta(-20, '#8a2d2a', `<rect x="654" y="734" width="72" height="122" rx="6" fill="none" stroke="#e6c477" stroke-width="6"/>`) +
    carta(0, '#fbf6ea', `<path d="M690 748v78" stroke="#2f5fae" stroke-width="12" stroke-linecap="round"/><path d="M672 812h36" stroke="#e6c477" stroke-width="10" stroke-linecap="round"/>`) +
    carta(20, '#fbf6ea', `<circle cx="690" cy="790" r="20" ${fino(NEGRO, 6, '#e6c477')}/>`)
  )
}

/** Taza de café con el humito. */
const dibujoCafe = () =>
  `<path d="M650 760c-6-20 10-30 0-50M690 760c-6-20 10-30 0-50M730 760c-6-20 10-30 0-50" stroke="#c9cdd2" stroke-width="9" fill="none" stroke-linecap="round"/>` +
  `<path d="M776 820c40 0 44 70 4 74" stroke="${NEGRO}" stroke-width="30" fill="none" stroke-linecap="round"/>` +
  `<path d="M776 820c40 0 44 70 4 74" stroke="#f5f5f0" stroke-width="14" fill="none" stroke-linecap="round"/>` +
  `<path d="M612 790h176l-16 160c-2 20-18 34-40 34h-64c-22 0-38-14-40-34Z" fill="#f5f5f0" ${TRAZO}/>` +
  `<ellipse cx="700" cy="790" rx="88" ry="14" ${fino(NEGRO, 8, '#5a3a22')}/>`

/** Accesorios, sin el "Nada" (el 1 del catálogo es el primero de esta lista). */
export const ACCESORIOS: readonly ((piel: string) => string)[] = [
  mate,
  (piel) => enLaMano(piel, dibujoTermo()),
  // El termo al lado, detrás de la mano con el mate.
  (piel) => enLaMano(piel, dibujoMate(), dibujoTermo(140, 30)),
  (piel) => enLaMano(piel, dibujoCelular()),
  (piel) => enLaMano(piel, dibujoLibro()),
  (piel) => enLaMano(piel, dibujoDiario()),
  (piel) => enLaMano(piel, dibujoPelota()),
  (piel) => enLaMano(piel, dibujoNaipes()),
  (piel) => enLaMano(piel, dibujoCafe()),
]

// ---------------------------------------------------------------------------------------
// Bufandas
// ---------------------------------------------------------------------------------------

/**
 * Bufanda de lana enroscada en el cuello, con una punta que cae sobre el pecho y sus flecos.
 * Los colores se alternan en franjas (dos o tres colores).
 */
function bufanda(colores: readonly string[]): string {
  const a = colores[0]!
  const b = colores[1] ?? a
  const franjas = Array.from(
    { length: 6 },
    (_, i) => `<rect x="512" y="${830 + i * 28}" width="84" height="28" fill="${colores[i % colores.length]}"/>`,
  ).join('')
  return (
    // La vuelta alrededor del cuello: un rollo grueso de un hombro al otro.
    `<path d="M340 812c-10-40 10-62 40-66 60 26 140 30 200 0 32 4 50 26 40 66-70 40-210 40-280 0Z" fill="${a}" ${TRAZO}/>` +
    // Franjas del rollo.
    `<path d="M392 772c-8 18-8 40 0 58M440 784c-6 18-6 40 0 58M532 784c6 18 6 40 0 58M580 772c8 18 8 40 0 58" stroke="${b}" stroke-width="22" fill="none"/>` +
    // La punta que cae, a rayas, con su contorno.
    franjas +
    `<path d="M512 830h84v168h-84Z" fill="none" ${TRAZO}/>` +
    // Flecos de abajo.
    `<path d="M524 998v18M544 998v18M564 998v18M584 998v18" stroke="${a}" stroke-width="8" stroke-linecap="round"/>`
  )
}

/** Bufandas, sin el "Sin bufanda" (el 1 del catálogo es la primera de esta lista). */
export const BUFANDAS: readonly string[] = [
  bufanda(['#7fb8e6', '#f5f5f0']),
  bufanda(['#f2c230', '#22201d']),
  bufanda(['#1f3c88', '#f5f5f0', '#c8323a']),
  bufanda(['#5b2a86', '#f5f5f0']),
  bufanda(['#f5f5f0', '#22201d']),
  bufanda(['#2e8b4a', '#f5f5f0']),
  bufanda(['#c83a32', '#2f4f9e']),
]
