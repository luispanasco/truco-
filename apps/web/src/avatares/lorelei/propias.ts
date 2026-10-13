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

/**
 * Poncho de lana a rayas: cae recto desde el cuello, más ancho que los hombros, con las franjas
 * a lo largo, una guarda de rombos y los pliegues del paño.
 */
const poncho = (color: string, raya: string, guarda: string) => () => {
  // Del cuello baja casi en línea recta hasta afuera del cuadro, como una carpa.
  const linea: Punto[] = [
    ...curva([
      [40, 1000],
      [120, 930],
      [230, 870],
      [320, 838],
      [372, 818],
    ]),
    ...curva(ESCOTE_REDONDO).slice(1),
    ...curva([
      [590, 818],
      [640, 836],
      [730, 868],
      [840, 930],
      [920, 1000],
    ]).slice(1),
  ]
  const franjas = (
    [
      [214, 232, raya],
      [246, 256, guarda],
      [270, 288, raya],
      [672, 690, raya],
      [704, 714, guarda],
      [728, 746, raya],
    ] as const
  )
    .map(([a, b, c]) => `<path d="${franja(linea, a, b)}" fill="${c}"/>`)
    .join('')
  // Guarda de rombos sobre la franja clara de cada lado.
  const rombos = [251, 709].flatMap((x) => [918, 956, 994].map((y) => `M${x} ${y - 14}l9 14-9 14-9-14Z`)).join('')
  return (
    torso(linea, color, false) +
    franjas +
    `<path d="${rombos}" fill="${color}" stroke="${NEGRO}" stroke-width="3"/>` +
    // Pliegues del paño.
    `<path d="M150 960c30-20 50-50 60-80M810 960c-30-20-50-50-60-80M420 900c-6 30-6 70 4 100M540 900c6 30 6 70-4 100" stroke="${tono(color, -0.28)}" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    borde(linea) +
    // El cuello del poncho, un ribete grueso apenas más oscuro.
    ribete(ESCOTE_REDONDO, tono(color, -0.15), 26)
  )
}

/** Chaleco de campo abierto sobre una camisa blanca de cuello, con botones y bolsillos. */
const chaleco = (color: string, camisa: string) => () => {
  const claro = tono(color, 0.2)
  // Mitad izquierda del chaleco (a la izquierda de la pantalla); la derecha es su espejo.
  const izq: Punto[] = [
    [372, 820],
    [404, 868],
    [438, 920],
    [466, 1000],
    [212, 1000],
    [222, 950],
    [244, 902],
    [262, 866],
    [300, 840],
  ]
  const der = izq.map(([x, y]) => [962 - x, y] as Punto)
  const botones = [930, 966].map((y) => `<circle cx="${r(962 - 438 - (y - 920) * 0.36 - 16)}" cy="${y}" r="9" ${fino(NEGRO, 6, '#d9b36c')}/>`).join('')
  return (
    torso(LINEA_V, camisa) +
    MANGAS +
    // La tapa de la camisa, con un botón.
    `<path d="M481 900v100" ${fino()}/>` +
    `<circle cx="481" cy="960" r="7" fill="${NEGRO}"/>` +
    // El cuello de la camisa: dos puntas que caen sobre el pecho.
    `<path d="M372 818c8 36 30 64 60 84l20-48c-30-10-56-22-80-36Z" fill="${camisa}" ${TRAZO}/>` +
    `<path d="M590 818c-8 36-30 64-60 84l-20-48c30-10 56-22 80-36Z" fill="${camisa}" ${TRAZO}/>` +
    `<path d="${camino(izq)}Z" fill="${color}" ${TRAZO}/>` +
    `<path d="${camino(der)}Z" fill="${color}" ${TRAZO}/>` +
    // Los bolsillos con su tapita y los botones.
    `<path d="M290 948h80M592 948h80" stroke="${NEGRO}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M296 948h68M598 948h68" stroke="${claro}" stroke-width="4" stroke-linecap="round"/>` +
    botones
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
  // Criollos.
  poncho('#a8322b', '#2b1b18', '#e6c477'),
  chaleco('#5e4a36', '#f5f5f0'),
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

/** Sombrero de gaucho: fieltro oscuro, copa baja y chata y el ala ancha y recta. */
const sombreroDeGaucho: Sombrero = {
  dibujo: () => {
    const c = '#3a302b'
    const brillo = tono(c, 0.3)
    return (
      `<g transform="translate(0 22)">` +
      // El ala, ancha y casi plana.
      `<path d="M96 292c-16-34 110-74 340-82 230-8 404 18 418 56 12 34-130 68-370 76-230 8-372-12-388-50Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M150 300c110 22 260 28 410 20 130-8 230-26 268-46" stroke="${brillo}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      // La copa, recta y chata arriba.
      `<path d="M306 250c-6-50-6-92 6-122 90-22 220-24 316-4 12 30 14 76 8 126-110 20-224 20-330 0Z" fill="${c}" ${TRAZO}/>` +
      `<path d="M322 140c86-14 196-14 290 2" stroke="${brillo}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      // La cinta, angosta.
      `<path d="M304 218c110 18 224 18 334-2l-2 34c-110 22-222 22-330 2Z" fill="#1a1512" ${TRAZO}/>` +
      `</g>`
    )
  },
  recorte: debajoDe([
    [100, 330],
    [300, 318],
    [480, 322],
    [660, 306],
    [840, 290],
  ]),
}

/** Sombreros, sin el "Sin sombrero" (el 1 del catálogo es el primero de esta lista). */
export const SOMBREROS: readonly Sombrero[] = [boina, gorroDeLana, gorra, sombreroDePaja, sombreroDeGaucho]

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

/** Un trazo de metal (o de madera fina): el contorno negro grueso y el color adentro. */
const varilla = (d: string, color: string, ancho = 12) =>
  `<path d="${d}" stroke="${NEGRO}" stroke-width="${ancho + 14}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
  `<path d="${d}" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`

/**
 * Choripán: un pan francés partido a lo largo, con la miga a la vista, y el chorizo adentro,
 * que asoma arriba con su atadura; grasa, marcas de la parrilla y chimichurri. Va inclinado
 * hacia afuera, así se ve entero y no se confunde con un pancho.
 */
function dibujoChoripan(): string {
  const pan = '#d68a3c'
  const chorizo = '#8f2f1e'
  const grasa = [
    [680, 650],
    [702, 690],
    [678, 724],
    [700, 760],
    [682, 800],
  ]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="#e7b6a0"/>`)
    .join('')
  return (
    `<g transform="rotate(30 690 900)">` +
    // El pan, la cáscara y los cortes del pan francés en las dos tiras de corteza.
    `<rect x="622" y="640" width="136" height="380" rx="64" fill="${pan}" ${TRAZO}/>` +
    `<path d="M630 700l14-14M628 740l16-14M752 700l-14-14M754 740l-16-14" stroke="${tono(pan, 0.4)}" stroke-width="7" stroke-linecap="round"/>` +
    // La miga, donde está partido.
    `<rect x="644" y="662" width="92" height="340" rx="46" ${fino(NEGRO, 7, '#f4dba4')}/>` +
    // El chorizo, con la atadura de la punta, la grasa y las marcas de la parrilla.
    `<path d="M690 590l-8-14M690 590l10-12" stroke="${NEGRO}" stroke-width="7" stroke-linecap="round"/>` +
    `<rect x="662" y="596" width="56" height="390" rx="28" fill="${chorizo}" ${TRAZO}/>` +
    grasa +
    `<path d="M668 672l40-16M668 742l40-16M668 812l40-16" stroke="${tono(chorizo, -0.5)}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M676 616c6-6 14-8 22-6" stroke="${tono(chorizo, 0.4)}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    // El chimichurri: hojitas verdes y gotas de aceite con ají.
    `<path d="M684 700l8 4M698 728l8-4M680 772l6 6M700 790l8 2M686 830l6-6" stroke="#3f7a26" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="M694 708l2 2M676 748l2 2M704 812l2 2" stroke="#d9752e" stroke-width="10" stroke-linecap="round"/>` +
    `</g>`
  )
}

/** Tira de asado pinchada en el tenedor de asador (dos dientes y cabo de madera). */
function dibujoTiraDeAsado(): string {
  const carne = '#8e4a2a'
  const metal = '#c9cdd2'
  // La tira, más corta, pinchada cerca de su punta izquierda: el resto queda hacia afuera.
  const tira =
    `<g transform="rotate(-8 700 650)">` +
    `<path d="M646 618c34-12 140-14 172-2 10 20 10 46 0 64-34 12-140 14-172 2-10-20-10-46 0-64Z" fill="${carne}" ${TRAZO}/>` +
    // El hueso cortado en rodajas y las marcas de la parrilla.
    [690, 744, 792].map((x) => `<ellipse cx="${x}" cy="650" rx="14" ry="19" ${fino(NEGRO, 6, '#f1e6cf')}/>`).join('') +
    `<path d="M662 638l10 24M716 634l12 30M766 636l10 26" stroke="${tono(carne, -0.45)}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M658 626c44-8 112-10 150-4" stroke="#c8784a" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `</g>`
  return (
    // Bien inclinado hacia afuera, para que la carne quede lejos de la cara. Los dientes, de
    // atrás de la carne hasta arriba.
    `<g transform="rotate(26 690 900) translate(0 50)">` +
    varilla('M690 790V700M690 700c-24 0-30-20-30-40v-80M690 700c24 0 30-20 30-40v-80', metal, 9) +
    tira +
    // Las puntas que asoman arriba de la carne.
    varilla('M660 612v-32M720 604v-24', metal, 9) +
    `</g>` +
    // El cabo de madera con su virola.
    `<rect x="666" y="846" width="48" height="190" rx="18" fill="#7a4a26" ${TRAZO}/>` +
    `<rect x="660" y="836" width="60" height="26" rx="8" fill="${metal}" ${TRAZO}/>`
  )
}

/** Pinza de parrilla: dos brazos de metal que se abren, con las puntas dentadas. */
function dibujoPinza(): string {
  const metal = '#c9cdd2'
  return (
    // Inclinada hacia afuera, para que las puntas no lleguen a la boca.
    `<g transform="rotate(14 690 900)">` +
    varilla('M676 1000L664 860L628 650', metal, 14) +
    varilla('M704 1000L716 860L760 660', metal, 14) +
    // Las puntas, dobladas hacia adentro y dentadas.
    `<path d="M612 660l2-36c8-8 26-6 32 4l-4 34Z" fill="${metal}" ${TRAZO}/>` +
    `<path d="M744 668l6-36c10-6 26 0 30 10l-8 34Z" fill="${metal}" ${TRAZO}/>` +
    `<path d="M640 636l-10 10M634 650l-10 10M762 642l10 10M758 656l10 10" stroke="${NEGRO}" stroke-width="6" stroke-linecap="round"/>` +
    // El mango de goma negra donde se juntan.
    `<path d="M652 860c-4 60 0 120 6 160h64c6-40 10-100 6-160Z" fill="#2a2624" ${TRAZO}/>` +
    `</g>`
  )
}

/** Vaso de grappamiel: un vaso chico de vidrio con la grappa color miel. */
function dibujoGrappamiel(): string {
  const miel = '#d68f24'
  return (
    `<path d="M618 750h144l-16 240c-2 14-12 22-26 22h-60c-14 0-24-8-26-22Z" fill="#e3eef1" ${TRAZO}/>` +
    `<path d="M630 820h120l-11 168c-1 10-8 14-18 14h-62c-10 0-17-4-18-14Z" fill="${miel}"/>` +
    `<ellipse cx="690" cy="820" rx="60" ry="10" fill="${tono(miel, 0.35)}"/>` +
    // El brillo del vidrio y el borde.
    `<path d="M642 776l8 190" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.8"/>` +
    `<ellipse cx="690" cy="750" rx="72" ry="12" ${fino(NEGRO, 8, '#f3f8f9')}/>`
  )
}

/** Facón de asador en su vaina de cuero, con la empuñadura y los adornos de plata. */
function dibujoFacon(): string {
  const plata = '#d4d7da'
  const cuero = '#6b3e22'
  return (
    `<g transform="rotate(16 690 880)">` +
    // La vaina, que se afina hacia abajo, con la boca de plata.
    `<path d="M660 778h60l-8 280h-44Z" fill="${cuero}" ${TRAZO}/>` +
    `<path d="M676 810v190" stroke="${tono(cuero, 0.3)}" stroke-width="6" stroke-linecap="round"/>` +
    `<rect x="654" y="772" width="72" height="34" rx="8" fill="${plata}" ${TRAZO}/>` +
    `<path d="M668 789h44" stroke="${tono(plata, -0.3)}" stroke-width="5" stroke-linecap="round"/>` +
    // El gavilán (la cruz) en S.
    `<path d="M630 770c0-18 20-20 30-10h60c10-10 30-8 30 10" stroke="${NEGRO}" stroke-width="24" fill="none" stroke-linecap="round"/>` +
    `<path d="M630 770c0-18 20-20 30-10h60c10-10 30-8 30 10" stroke="${plata}" stroke-width="10" fill="none" stroke-linecap="round"/>` +
    // La empuñadura de madera con sus virolas y el pomo de plata.
    `<path d="M664 760c-6-50-6-100 0-150h52c6 50 6 100 0 150Z" fill="#4a2e1c" ${TRAZO}/>` +
    `<path d="M662 700h56M662 660h56" stroke="${NEGRO}" stroke-width="16"/>` +
    `<path d="M664 700h52M664 660h52" stroke="${plata}" stroke-width="8"/>` +
    `<path d="M656 612c0-24 14-38 34-38s34 14 34 38Z" fill="${plata}" ${TRAZO}/>` +
    `</g>`
  )
}

/** Guitarra criolla: asoma el mástil con el clavijero, y un poco de la caja abajo. */
function dibujoGuitarra(): string {
  const caja = '#d8a35c'
  const madera = '#7a4a26'
  const clavija = (x: number, y: number) => `<rect x="${x}" y="${y - 9}" width="22" height="18" rx="6" ${fino(NEGRO, 6, '#f1e6cf')}/>`
  const clavijas = [520, 556, 592].map((y) => clavija(632, y) + clavija(726, y)).join('')
  return (
    `<g transform="rotate(20 690 900)">` +
    // La caja, que casi no entra en el cuadro, con la boca y la roseta.
    `<ellipse cx="690" cy="1150" rx="170" ry="150" fill="${caja}" ${TRAZO}/>` +
    `<circle cx="690" cy="1080" r="44" fill="#2a1d14" stroke="${tono(caja, -0.35)}" stroke-width="10"/>` +
    // El mástil, el diapasón y los trastes.
    `<path d="M664 1010V600h52v410Z" fill="${madera}" ${TRAZO}/>` +
    `<path d="M674 1000V610h32v390Z" fill="#3b2a20"/>` +
    `<path d="M674 660h32M674 714h32M674 764h32M674 810h32M674 852h32" stroke="#c9cdd2" stroke-width="4"/>` +
    // El clavijero calado, con sus seis clavijas.
    `<path d="M654 604l-4-120c0-10 6-16 16-16h48c10 0 16 6 16 16l-4 120Z" fill="${madera}" ${TRAZO}/>` +
    `<path d="M670 508v86M710 508v86" stroke="#2a1d14" stroke-width="12" stroke-linecap="round"/>` +
    clavijas +
    // Las cuerdas.
    `<path d="M682 600v410M690 600v410M698 600v410" stroke="#f1e6cf" stroke-width="2.5"/>` +
    `</g>`
  )
}

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
  // Criollos.
  (piel) => enLaMano(piel, dibujoChoripan()),
  (piel) => enLaMano(piel, dibujoTiraDeAsado()),
  (piel) => enLaMano(piel, dibujoPinza()),
  (piel) => enLaMano(piel, dibujoGrappamiel()),
  (piel) => enLaMano(piel, dibujoFacon()),
  (piel) => enLaMano(piel, dibujoGuitarra()),
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

/**
 * Pañuelo de gaucho anudado al cuello: la vuelta, la punta del triángulo que cae sobre el
 * pecho, el nudo adelante y sus dos puntas.
 */
function panuelo(color: string): string {
  const sombra = tono(color, color === '#f5f5f0' ? -0.18 : -0.25)
  return (
    // La vuelta alrededor del cuello, angosta.
    `<path d="M352 812c-6-26 8-42 30-42 56 28 144 30 200 0 22 0 36 16 30 42-60 40-200 40-260 0Z" fill="${color}" ${TRAZO}/>` +
    `<path d="M380 808c50 22 150 24 204 0" stroke="${sombra}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    // La punta del triángulo.
    `<path d="M420 840c40 12 90 12 130 0l-58 102c-4 8-10 8-14 0Z" fill="${color}" ${TRAZO}/>` +
    `<path d="M446 858l38 68M522 858l-30 56" stroke="${sombra}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    // Las dos puntas del nudo, que caen a los costados.
    `<path d="M466 852l-44 52 22 14 36-54ZM504 852l44 50-22 14-34-52Z" fill="${color}" ${TRAZO}/>` +
    // El nudo.
    `<ellipse cx="485" cy="846" rx="28" ry="22" fill="${color}" ${TRAZO}/>` +
    `<path d="M472 840c8 8 18 10 26 6" stroke="${sombra}" stroke-width="6" fill="none" stroke-linecap="round"/>`
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
  // Pañuelos de gaucho.
  panuelo('#c8323a'),
  panuelo('#7fb8e6'),
  panuelo('#f5f5f0'),
]

// ---------------------------------------------------------------------------------------
// En la boca
// ---------------------------------------------------------------------------------------

/**
 * La caja (x, y, ancho, alto) de cada boca de Lorelei, en el sistema de la cabeza, medida con
 * getBBox. De ahí sale la comisura donde se agarra lo que va en la boca. Las bocas que se sumen
 * después usan la de repuesto (la de la primera).
 */
const CAJAS_BOCA: readonly (readonly [number, number, number, number])[] = [
  [486, 651, 150, 50],
  [472, 660, 141, 41],
  [486, 651, 150, 50],
  [472, 656, 160, 36],
  [446, 656, 209, 60],
  [441, 674, 195, 41],
  [473, 649, 173, 90],
  [533, 663, 70, 60],
  [442, 643, 185, 71],
  [486, 666, 156, 55],
  [472, 678, 91, 46],
  [455, 666, 190, 78],
  [539, 683, 70, 46],
  [475, 678, 113, 29],
  [467, 663, 194, 56],
  [419, 634, 216, 85],
  [595, 674, 49, 55],
  [509, 667, 119, 69],
  [527, 665, 90, 78],
  [562, 659, 58, 66],
  [545, 747, 62, 20],
  [534, 668, 94, 45],
  [467, 656, 216, 39],
  [448, 664, 199, 48],
  [529, 645, 142, 72],
  [469, 655, 153, 78],
  [574, 657, 99, 22],
]

/** La comisura de la derecha (de la pantalla) de una boca: el 82 % del ancho, a media altura. */
export function comisura(boca: number): Punto {
  const [x, y, w, h] = CAJAS_BOCA[boca] ?? CAJAS_BOCA[0]!
  return [r(x + w * 0.82), r(y + h * 0.5)]
}

/**
 * Lo que va en la boca es chico: en la mesa el avatar mide 44 px. Para que se lea, cada pieza
 * lleva el contorno negro de Lorelei y, debajo, un halo claro que la despega de una barba o un
 * pelo oscuro. `halo` dibuja los mismos caminos más gruesos, en claro, detrás de todo.
 */
const HALO = '#f6efe0'
const halo = (d: string, ancho: number) =>
  `<path d="${d}" stroke="${HALO}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" fill="${HALO}"/>`

/** Pipa de madera: la boquilla en la comisura, la cazoleta colgando y un hilo de humo. */
function pipa([x, y]: Punto): string {
  // Madera clara (más que cualquier pelo), así la cazoleta se ve sobre una barba oscura.
  const madera = '#c98a4b'
  const cano = 'M-4 0L46 20'
  const cazoleta = 'M44 6h62c2 32-4 54-18 66-14 10-32 8-42-4-10-14-8-38-2-62Z'
  return (
    `<g transform="translate(${x} ${y}) scale(1.5)">` +
    // El halo claro, detrás del caño y de la cazoleta.
    halo(cano, 34) +
    halo(cazoleta, 22) +
    // El humo, que sube de la cazoleta.
    `<path d="M80 -6c-10-12 8-22-2-36s10-22 2-36" stroke="${NEGRO}" stroke-width="13" fill="none" stroke-linecap="round" opacity="0.35"/>` +
    `<path d="M80 -6c-10-12 8-22-2-36s10-22 2-36" stroke="#f4f2ec" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    // La boquilla negra y el caño.
    varilla(cano, '#3a2e28', 9) +
    // La cazoleta, con el tabaco arriba y un brillo.
    `<path d="${cazoleta}" fill="${madera}" ${TRAZO}/>` +
    `<ellipse cx="75" cy="7" rx="31" ry="7" ${fino(NEGRO, 6, '#3a2418')}/>` +
    `<path d="M58 22c-2 16 0 28 6 38" stroke="${tono(madera, 0.45)}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `</g>`
  )
}

/** Pajita de pasto, con la espiga en la punta. */
function pajita([x, y]: Punto): string {
  const pasto = '#e0c85e'
  const tallo = 'M-4 2C26 -6 56 -22 84 -46'
  const espiga = 'M84 -46c2-18 14-30 30-34 0 18-12 30-30 34ZM84 -46c16-8 34-6 44 4-14 8-32 6-44-4Z'
  return (
    `<g transform="translate(${x} ${y}) scale(1.5)">` +
    halo(tallo, 26) +
    halo(espiga, 16) +
    varilla(tallo, pasto, 8) +
    `<path d="${espiga}" ${fino(NEGRO, 7, pasto)}/>` +
    `<path d="M88 -50l18-22M90 -46l26 -2" stroke="${tono(pasto, -0.3)}" stroke-width="4" stroke-linecap="round"/>` +
    `</g>`
  )
}

/** Escarbadientes de madera, apenas caído. */
function escarbadientes([x, y]: Punto): string {
  const palito = 'M-4 0L64 14'
  return `<g transform="translate(${x} ${y}) scale(1.5)">${halo(palito, 24)}${varilla(palito, '#f0d9a8', 8)}</g>`
}

/**
 * Lo que va en la boca, sin el "Nada en la boca" (el 1 del catálogo es el primero de esta
 * lista). Va en el sistema de la cabeza, justo después de la boca, agarrado de la comisura.
 */
export const EN_BOCA: readonly ((comisura: Punto) => string)[] = [pipa, pajita, escarbadientes]
