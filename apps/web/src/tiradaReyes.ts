import type { LugarPublico, MensajesServidor } from '@truco/shared'

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

export function planReyes(tiradas: MensajesServidor['reyes']['tiradas'], mover: boolean): PlanReyes {
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

/**
 * Dónde quedó cada uno después de la tirada: el asiento nuevo de cada asiento viejo. Se
 * reconoce a cada uno por su apodo (y su avatar, si se conoce la sala de antes); entre iguales,
 * se prefiere que no se haya movido.
 */
export function asientosDespuesDeReyes(
  apodos: readonly string[],
  antes: readonly LugarPublico[] | null,
  ahora: readonly LugarPublico[],
): number[] {
  const n = apodos.length
  const libres = new Set(ahora.map((l) => l.asiento))
  const nuevo: number[] = Array.from({ length: n }, () => -1)
  const mismo = (a: number, l: LugarPublico) =>
    l.apodo === apodos[a] && (!antes?.[a] || (antes[a]!.avatar ?? null) === (l.avatar ?? null))
  // Primero los que no se movieron; después los demás, al primer lugar libre que coincida.
  for (let a = 0; a < n; a++) {
    const l = ahora[a]
    if (l && mismo(a, l)) {
      nuevo[a] = a
      libres.delete(a)
    }
  }
  for (let a = 0; a < n; a++) {
    if (nuevo[a] !== -1) continue
    const l = ahora.find((x) => libres.has(x.asiento) && mismo(a, x)) ?? ahora.find((x) => libres.has(x.asiento) && x.apodo === apodos[a])
    const b = l?.asiento ?? (libres.has(a) ? a : [...libres][0]!)
    nuevo[a] = b
    libres.delete(b)
  }
  return nuevo
}
