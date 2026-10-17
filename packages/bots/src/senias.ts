import { piezaDe, tieneFlor, type Carta } from '@truco/engine'

/**
 * Qué significa cada seña. El gesto animado se asigna en la etapa 1E. La lista solo crece al
 * final: `envido` (cuánto tenés de envido) vino después de las de las cartas.
 */
export const SENIAS = [
  'pieza2',
  'pieza4',
  'pieza5',
  'perico',
  'perica',
  'unoBravo',
  'sieteBravo',
  'tres',
  'dosComun',
  'unoFalso',
  'flor',
  'envido',
] as const
export type Senia = (typeof SENIAS)[number]

export const GESTO: Record<Senia, string> = {
  pieza2: 'Levantar las cejas',
  pieza4: 'Beso',
  pieza5: 'Fruncir la nariz',
  perico: 'Guiño derecho',
  perica: 'Guiño izquierdo',
  unoBravo: 'Mueca con la pera hacia la derecha',
  sieteBravo: 'Mueca con la pera hacia la izquierda',
  tres: 'Morderse el labio inferior',
  dosComun: 'Abrir la boca',
  unoFalso: 'Sacar la lengua',
  flor: 'Inflar la boca como un sapo',
  envido: 'Mirar para arriba, sacando la cuenta',
}

/**
 * Qué carta anuncia cada seña. La de envido anuncia un número: el que la recibe lo ve con
 * `significadoDe` ("envido 27").
 */
export const SIGNIFICADO: Record<Senia, string> = {
  pieza2: '2 de la muestra',
  pieza4: '4 de la muestra',
  pieza5: '5 de la muestra',
  perico: 'perico',
  perica: 'perica',
  unoBravo: '1 de espadas o de bastos',
  sieteBravo: '7 de espadas o de oros',
  tres: 'un 3',
  dosComun: 'un 2',
  unoFalso: '1 de copas o de oros',
  flor: 'flor',
  envido: 'el envido',
}

/** Lo que anuncia una seña, con el número si es la de envido y llegó con él. */
export function significadoDe(senia: Senia, tanto?: number | null): string {
  return senia === 'envido' && tanto != null ? `envido ${tanto}` : SIGNIFICADO[senia]
}

/**
 * El envido que se marca con la seña, o null si no se puede marcar: con flor el envido no
 * se juega (la flor lo tapa), así que se marca la flor. El número nunca lo dice quien seña:
 * lo saca el servidor (o la conexión local) del tanto real, con muestra y piezas.
 */
export function envidoParaSenia(tanto: { envido: number; flor: number | null } | null | undefined): number | null {
  return !tanto || tanto.flor !== null ? null : tanto.envido
}

/**
 * Desde cuánto de envido los bots se lo marcan al compañero. Con muestra, las piezas dan envidos
 * altos seguido: con menos de 30 la seña no le cambia mucho al compañero y sería un gesto más.
 */
export const ENVIDO_PARA_SENIAR = 30

const SENIA_PIEZA = { 2: 'pieza2', 4: 'pieza4', 5: 'pieza5', 11: 'perico', 10: 'perica' } as const

/** Seña que corresponde a una carta, o null si esa carta no tiene seña. */
export function seniaDeCarta(c: Carta, muestra: Carta): Senia | null {
  const pieza = piezaDe(c, muestra)
  if (pieza !== null) return SENIA_PIEZA[pieza]
  if (c.numero === 1) return c.palo === 'espada' || c.palo === 'basto' ? 'unoBravo' : 'unoFalso'
  if (c.numero === 7 && (c.palo === 'espada' || c.palo === 'oro')) return 'sieteBravo'
  if (c.numero === 3) return 'tres'
  if (c.numero === 2) return 'dosComun'
  return null
}

/** Señas de una mano: una por cada carta que tiene seña, más la flor. Orden canónico. */
export function seniasDeMano(cartas: readonly Carta[], muestra: Carta): Senia[] {
  const senias = cartas.map((c) => seniaDeCarta(c, muestra)).filter((s): s is Senia => s !== null)
  if (tieneFlor(cartas, muestra)) senias.push('flor')
  return ordenar(senias)
}

function ordenar(senias: readonly Senia[]): Senia[] {
  return [...senias].sort((a, b) => SENIAS.indexOf(a) - SENIAS.indexOf(b))
}

export function mismasSenias(a: readonly Senia[], b: readonly Senia[]): boolean {
  if (a.length !== b.length) return false
  const x = ordenar(a)
  const y = ordenar(b)
  return x.every((s, i) => s === y[i])
}

/**
 * Señas que conoce un jugador en la mano actual, por asiento de quien las hizo: las de
 * sus compañeros y, si la sala lo permite, las que les pescó a los rivales (solo esas,
 * no todas las que hicieron). Con la seña de envido, el número va aparte, en `envido`
 * (por asiento): así las listas de señas siguen siendo las de siempre.
 */
export interface SeniasRecibidas {
  [asiento: number]: Senia[]
  /** El envido que marcó cada uno con la seña de envido (lo pone el servidor). */
  envido?: Record<number, number>
}

/** Las señas de las cartas y la flor, sin la de envido (esa no sale de una carta). */
export const deCartas = (senias: readonly Senia[]): Senia[] => senias.filter((s) => s !== 'envido')
