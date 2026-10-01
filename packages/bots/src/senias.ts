import { piezaDe, tieneFlor, type Carta } from '@truco/engine'

/** Qué significa cada seña. El gesto animado se asigna en la etapa 1E. */
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
}

/** Qué carta anuncia cada seña. */
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
}

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
 * no todas las que hicieron).
 */
export type SeniasRecibidas = Record<number, Senia[]>
