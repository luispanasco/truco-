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
