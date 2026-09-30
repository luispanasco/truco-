export const PALOS = ['espada', 'basto', 'oro', 'copa'] as const
export type Palo = (typeof PALOS)[number]

export const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const
export type Numero = (typeof NUMEROS)[number]

export interface Carta {
  readonly numero: Numero
  readonly palo: Palo
}

/** Las 40 cartas de la baraja española, en orden fijo. */
export function crearBaraja(): Carta[] {
  const baraja: Carta[] = []
  for (const palo of PALOS) {
    for (const numero of NUMEROS) baraja.push({ numero, palo })
  }
  return baraja
}

export function mismaCarta(a: Carta, b: Carta): boolean {
  return a.numero === b.numero && a.palo === b.palo
}

/** Identificador corto y estable, por ejemplo "1-espada". */
export function cartaId(c: Carta): string {
  return `${c.numero}-${c.palo}`
}

export function cartaDesdeId(id: string): Carta | null {
  const [n, p] = id.split('-')
  const numero = Number(n) as Numero
  const palo = p as Palo
  if (!NUMEROS.includes(numero) || !PALOS.includes(palo)) return null
  return { numero, palo }
}

const NOMBRE_PALO: Record<Palo, string> = {
  espada: 'espadas',
  basto: 'bastos',
  oro: 'oros',
  copa: 'copas',
}

export function nombreCarta(c: Carta): string {
  return `${c.numero} de ${NOMBRE_PALO[c.palo]}`
}
