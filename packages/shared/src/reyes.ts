import type { Carta } from '@truco/engine'

export interface ResultadoReyes {
  /** Cartas que se dieron, en orden, con el asiento que tenía cada uno al tirar. */
  tiradas: { asiento: number; carta: Carta }[]
  /** Los que sacaron rey, en orden: el primero reparte; con equipos, son un equipo. */
  conRey: number[]
  /**
   * Asiento nuevo de cada asiento viejo, para que los del rey queden alternados. Sin equipos
   * (o si ya estaban bien sentados), nadie se mueve.
   */
  asientoNuevo: number[]
}

/**
 * Tirar reyes: desde `desde` y en sentido antihorario, una carta a cada uno sacada del fondo del
 * mazo, hasta el primer rey (12). Con equipos se sigue, salteando a los que ya sacaron, hasta que
 * salen tantos reyes como lugares tiene un equipo. Para reacomodar: los del rey van a la paridad
 * del primero; con `quieto` (contra la compu, la persona), a la paridad que no lo mueve a él.
 */
export function tirarReyes(n: number, desde: number, mazo: readonly Carta[], conEquipos: boolean, quieto?: number): ResultadoReyes {
  const fondo = [...mazo]
  const equipos = conEquipos && n > 2
  const tiradas: ResultadoReyes['tiradas'] = []
  const conRey: number[] = []
  for (let i = 0; conRey.length < (equipos ? n / 2 : 1) && fondo.length > 0; i++) {
    const asiento = (desde + i) % n
    if (conRey.includes(asiento)) continue
    const carta = fondo.pop()!
    tiradas.push({ asiento, carta })
    if (carta.numero === 12) conRey.push(asiento)
  }
  const asientoNuevo = Array.from({ length: n }, (_, a) => a)
  if (!equipos) return { tiradas, conRey, asientoNuevo }
  const paridad = quieto === undefined ? conRey[0]! % 2 : conRey.includes(quieto) ? quieto % 2 : 1 - (quieto % 2)
  // Se cambian de a pares: uno del rey mal sentado con uno sin rey que ocupa su paridad.
  const malSentados = conRey.filter((a) => a % 2 !== paridad)
  const ocupando = asientoNuevo.filter((a) => a % 2 === paridad && !conRey.includes(a))
  malSentados.forEach((a, i) => {
    const b = ocupando[i]!
    asientoNuevo[a] = b
    asientoNuevo[b] = a
  })
  return { tiradas, conRey, asientoNuevo }
}

/**
 * Los tiempos de la tirada de reyes en la mesa (en ms, desde que empieza): cada carta sale del
 * mazo y vuela frente a su jugador; al rey se le da un respiro. Después se levantan las cartas,
 * si cambiaron los equipos los avatares se van a sus lugares nuevos, y al final el aviso de
 * quién reparte.
 */
export interface PlanReyes {
  /** Cuándo sale cada carta, en el orden de la tirada. */
  salidas: number[]
  /** Se levantan las cartas de la mesa. */
  levantar: number
  /** Los avatares empiezan a moverse (null si nadie cambia de lugar). */
  mover: number | null
  /** Sale el aviso de quién reparte. */
  aviso: number
  /** Termina: arranca la primera mano. */
  fin: number
}

/** Lo que tarda una carta en llegar desde el mazo. */
export const VUELO_REYES_MS = 340
/** Lo que tardan los avatares en cambiarse de lugar. */
export const MOVER_REYES_MS = 850
const LEVANTAR_MS = 300

/**
 * Entre carta y carta: más rápido cuanto más larga la tirada (en 3 contra 3 con equipos pueden
 * salir 30 cartas), así no pasa de unos 5 segundos.
 */
export function pasoReyes(cartas: number): number {
  return Math.round(Math.min(420, Math.max(150, 4200 / Math.max(1, cartas))))
}

export function planReyes(tiradas: readonly { carta: Carta }[], mover: boolean): PlanReyes {
  const paso = pasoReyes(tiradas.length)
  const salidas: number[] = []
  let t = 250
  for (const tirada of tiradas) {
    salidas.push(t)
    // Salió un rey: se lo deja ver antes de seguir.
    t += paso + (tirada.carta.numero === 12 ? 380 : 0)
  }
  const ultima = (salidas.at(-1) ?? 0) + VUELO_REYES_MS
  const levantar = ultima + 700
  const moverEn = mover ? levantar + LEVANTAR_MS : null
  const aviso = moverEn !== null ? moverEn + MOVER_REYES_MS : levantar + LEVANTAR_MS
  return { salidas, levantar, mover: moverEn, aviso, fin: aviso + 1500 }
}
