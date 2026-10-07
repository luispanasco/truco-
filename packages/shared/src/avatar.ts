/**
 * Avatar por capas. Este formato no sabe cómo se dibuja cada pieza: eso lo pone el estilo
 * de la web (hoy Lorelei). Si cambia el estilo, cambian los dibujos, no los avatares guardados.
 *
 * El catálogo solo crece al final de cada capa: el avatar guarda la posición de cada pieza,
 * así que reordenar o borrar piezas cambiaría los avatares ya armados.
 */

export const CAPAS_AVATAR = [
  'piel',
  'cabeza',
  'pelo',
  'colorPelo',
  'cejas',
  'ojos',
  'nariz',
  'boca',
  'barba',
  'lentes',
  'aros',
  'pecas',
  'ropa',
  'sombrero',
  'accesorio',
  'bufanda',
] as const

/**
 * Cuántas capas tenían los primeros avatares guardados (sin la bufanda). Un código con menos
 * capas que las de ahora se lee igual: las que faltan al final quedan en su pieza 0 ("sin …").
 */
const CAPAS_MINIMAS = 15

export type CapaAvatar = (typeof CAPAS_AVATAR)[number]

/** La pieza elegida en cada capa (su posición en el catálogo). */
export type Avatar = Record<CapaAvatar, number>

/**
 * Una pieza del catálogo. `precio` en monedas de juego: 0 es gratis. Las que tienen precio
 * se compran en la tienda (fase 2); mientras tanto se ven con candado.
 */
export interface PiezaAvatar {
  nombre: string
  precio: number
}

const gratis = (nombre: string): PiezaAvatar => ({ nombre, precio: 0 })
const paga = (nombre: string, precio: number): PiezaAvatar => ({ nombre, precio })
/** `n` piezas numeradas: las primeras `libres` gratis y el resto al precio dado. */
function numeradas(nombre: string, n: number, libres: number, precio: number): PiezaAvatar[] {
  return Array.from({ length: n }, (_, i) => (i < libres ? gratis(`${nombre} ${i + 1}`) : paga(`${nombre} ${i + 1}`, precio)))
}

/** Colores de piel: todos gratis, siempre. */
export const PIELES = ['#f6d3b3', '#efc19a', '#d9a066', '#b97a4a', '#8d5524', '#5c3a21'] as const
/** Colores de pelo: los naturales gratis; los de fantasía, en la tienda. */
export const COLORES_PELO = [
  '#2c1b18',
  '#4a2c18',
  '#724133',
  '#a55728',
  '#b58143',
  '#d6b370',
  '#e8e1e1',
  '#9a9a9a',
  '#3b6fd6',
  '#d64fa0',
  '#3fa66b',
] as const

/**
 * Catálogo de piezas por capa. Las capas opcionales empiezan con "Sin …". Los precios son
 * provisorios: se ajustan en la fase 2 con la economía.
 */
export const CATALOGO_AVATAR: Record<CapaAvatar, readonly PiezaAvatar[]> = {
  piel: PIELES.map((_, i) => gratis(`Piel ${i + 1}`)),
  cabeza: numeradas('Cara', 4, 4, 0),
  pelo: numeradas('Peinado', 48, 12, 100),
  colorPelo: COLORES_PELO.map((_, i) => (i < 8 ? gratis(`Color ${i + 1}`) : paga(`Color ${i + 1}`, 150))),
  cejas: numeradas('Cejas', 13, 6, 50),
  ojos: numeradas('Ojos', 24, 8, 50),
  nariz: numeradas('Nariz', 6, 6, 0),
  boca: numeradas('Boca', 27, 8, 50),
  barba: [gratis('Sin barba'), gratis('Barba corta'), gratis('Barba')],
  lentes: [gratis('Sin lentes'), gratis('Lentes redondos'), paga('Lentes 2', 100), paga('Lentes 3', 100), paga('Lentes 4', 100), paga('Lentes 5', 150)],
  aros: [gratis('Sin aros'), paga('Aros 1', 100), paga('Aros 2', 100), paga('Aros 3', 150)],
  pecas: [gratis('Sin pecas'), gratis('Pecas')],
  ropa: [
    gratis('Remera blanca'),
    gratis('Remera roja'),
    gratis('Remera azul'),
    paga('Remera verde', 100),
    paga('Camiseta celeste', 200),
    paga('Bastones blanco y negro', 200),
    paga('Aurinegra a bastones', 200),
    paga('Bastones rojo y azul', 200),
    paga('Buzo gris', 150),
    paga('Campera de jean', 250),
    // Colores de los cuadros y de la selección: sin escudos y con nombres de colores (los
    // escudos y los nombres de los clubes son marcas).
    paga('Blanca tricolor', 200),
    paga('Violeta', 200),
    paga('Blanca con franja negra', 200),
    paga('Bastones verde y rojo', 200),
    paga('Bastones celeste y blanco', 200),
    paga('Bastones negro y azul', 200),
    paga('Bastones verde y blanco', 200),
    paga('Bastones violeta y blanco', 200),
    paga('Blanca con cuello celeste', 200),
    paga('Celeste de época', 250),
  ],
  sombrero: [gratis('Sin sombrero'), paga('Boina', 200), paga('Gorro de lana', 150), paga('Gorra', 150), paga('Sombrero de paja', 250)],
  accesorio: [
    gratis('Nada'),
    paga('Mate', 300),
    paga('Termo', 250),
    paga('Mate y termo', 400),
    paga('Celular', 200),
    paga('Libro', 200),
    paga('Diario', 200),
    paga('Pelota', 250),
    paga('Naipes', 300),
    paga('Café', 200),
  ],
  // Con los colores de las camisetas (sin escudos ni nombres de clubes).
  bufanda: [
    gratis('Sin bufanda'),
    paga('Celeste y blanca', 150),
    paga('Aurinegra', 150),
    paga('Tricolor', 150),
    paga('Violeta y blanca', 150),
    paga('Blanca y negra', 150),
    paga('Verde y blanca', 150),
    paga('Roja y azul', 150),
  ],
}

/** Capas que se pueden dejar vacías (su pieza 0 es "sin …"). */
export const CAPAS_OPCIONALES: readonly CapaAvatar[] = ['barba', 'lentes', 'aros', 'pecas', 'sombrero', 'accesorio', 'bufanda']

export const AVATAR_BASE: Avatar = {
  piel: 1,
  cabeza: 0,
  pelo: 0,
  colorPelo: 1,
  cejas: 0,
  ojos: 0,
  nariz: 0,
  boca: 0,
  barba: 0,
  lentes: 0,
  aros: 0,
  pecas: 0,
  ropa: 0,
  sombrero: 0,
  accesorio: 0,
  bufanda: 0,
}

const PREFIJO = 'a1.'
/** Largo máximo de un avatar codificado (lo que acepta el servidor). */
export const LARGO_AVATAR = 64

export function esGratis(capa: CapaAvatar, pieza: number): boolean {
  return (CATALOGO_AVATAR[capa][pieza]?.precio ?? 1) === 0
}

/** "a1." y la pieza de cada capa en base 36, separadas por puntos. */
export function codificarAvatar(a: Avatar): string {
  return PREFIJO + CAPAS_AVATAR.map((c) => a[c].toString(36)).join('.')
}

/** El avatar de un código, o null si no es válido. */
export function leerAvatar(codigo: unknown): Avatar | null {
  if (typeof codigo !== 'string' || codigo.length > LARGO_AVATAR || !codigo.startsWith(PREFIJO)) return null
  const partes = codigo.slice(PREFIJO.length).split('.')
  if (partes.length < CAPAS_MINIMAS || partes.length > CAPAS_AVATAR.length) return null
  const a = {} as Avatar
  for (let i = 0; i < CAPAS_AVATAR.length; i++) {
    const capa = CAPAS_AVATAR[i]!
    const parte = partes[i] ?? '0'
    if (!/^[0-9a-z]{1,2}$/.test(parte)) return null
    const n = parseInt(parte, 36)
    if (n >= CATALOGO_AVATAR[capa].length) return null
    a[capa] = n
  }
  return a
}

/**
 * Lo que acepta el servidor de una persona: un avatar válido con piezas que puede usar.
 * Hasta que exista la tienda, las pagas vuelven a la pieza gratis de la capa.
 */
export function normalizarAvatar(codigo: unknown, puedeUsar: (capa: CapaAvatar, pieza: number) => boolean = esGratis): string | null {
  const a = leerAvatar(codigo)
  if (!a) return null
  for (const capa of CAPAS_AVATAR) if (!puedeUsar(capa, a[capa])) a[capa] = AVATAR_BASE[capa]
  return codificarAvatar(a)
}

/** Generador chico y estable (mulberry32), para que el mismo texto dé siempre el mismo avatar. */
function aleatorio(semilla: number) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Avatar al azar a partir de un texto (el apodo, el nombre de un bot). Con `soloGratis`, solo
 * piezas gratis; los bots pueden lucir las de la tienda. Las capas opcionales salen poco.
 */
export function avatarAlAzar(texto: string, soloGratis = true): Avatar {
  const r = aleatorio(hash(texto))
  const a = { ...AVATAR_BASE }
  for (const capa of CAPAS_AVATAR) {
    const opciones = CATALOGO_AVATAR[capa].map((_, i) => i).filter((i) => !soloGratis || esGratis(capa, i))
    if (CAPAS_OPCIONALES.includes(capa) && r() < 0.7) {
      a[capa] = 0
      continue
    }
    a[capa] = opciones[Math.floor(r() * opciones.length)] ?? 0
  }
  return a
}
