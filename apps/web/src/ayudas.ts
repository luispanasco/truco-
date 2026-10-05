import {
  fuerza,
  mismaCarta,
  nombreCarta,
  NUMEROS_PIEZA,
  piezaDe,
  valorComun,
  valorEnvido,
  type Carta,
  type ConfigSala,
  type NumeroPieza,
  type VistaPartida,
} from '@truco/engine'

/*
 * Ayudas para principiantes: por qué una carta está marcada con la estrella y de dónde
 * sale tu envido o tu flor. Los números se arman con las mismas reglas que el motor
 * (tanto.ts y jerarquia.ts), y los tests comprueban que den lo mismo que él.
 */

/** "a", "a y b", "a, b y c". */
function lista(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

/** Cómo se nombra la pieza n. Si la muestra es esa misma carta, el 12 hace de ella. */
function nombrePieza(n: NumeroPieza, muestra: Carta): string {
  const numero = muestra.numero === n ? 12 : n
  if (n === 11) return `el perico (${numero} de la muestra)`
  if (n === 10) return `la perica (${numero} de la muestra)`
  return `el ${numero} de la muestra`
}

/** "de el" → "del". */
function de(x: string): string {
  return x.startsWith('el ') ? `del ${x.slice(3)}` : `de ${x}`
}

/** Nombre corto de una pieza, para las cuentas: "perico", "2 de la muestra". */
function piezaCorta(c: Carta, muestra: Carta): string {
  const n = piezaDe(c, muestra)!
  if (n === 11) return 'perico'
  if (n === 10) return 'perica'
  return c.numero === 12 ? `12 de la muestra, que hace de ${n}` : `${n} de la muestra`
}

/** Las matas que no son pieza, de mayor a menor. */
const MATAS: Carta[] = [
  { numero: 1, palo: 'espada' },
  { numero: 1, palo: 'basto' },
  { numero: 7, palo: 'espada' },
  { numero: 7, palo: 'oro' },
]

/** Por qué la carta lleva estrella (pieza o mata), o null si no la lleva. */
export function explicarCarta(c: Carta, muestra: Carta): string | null {
  const pieza = piezaDe(c, muestra)
  if (pieza !== null) {
    const i = NUMEROS_PIEZA.indexOf(pieza)
    // Si la muestra es pieza, el 12 de ese palo ocupa su lugar.
    const reemplazo = c.numero === 12 ? ` Como la muestra es el ${muestra.numero}, el 12 toma su lugar.` : ''
    const mayores = NUMEROS_PIEZA.slice(0, i).map((n) => (muestra.numero === n ? `al 12 (que hace de ${n})` : `al ${n}`))
    const gana =
      i === 0
        ? 'Es la carta más alta: no la mata ninguna.'
        : pieza === 10
          ? 'Gana a todas menos a las otras piezas.'
          : `Gana a todas menos ${lista(mayores)} de la muestra.`
    const nombre = nombrePieza(pieza, muestra)
    return `Pieza: ${nombre}.${reemplazo} ${gana} Para el envido vale ${valorEnvido(c, muestra)}.`
  }
  const i = MATAS.findIndex((m) => mismaCarta(m, c))
  if (i < 0 || fuerza(c, muestra) < 11) return null
  // La que está de muestra no la tiene nadie: no se nombra.
  const mayores = MATAS.slice(0, i)
    .filter((m) => !mismaCarta(m, muestra))
    .map((m) => `el ${nombreCarta(m)}`)
  const ganan = mayores.length === 0 ? 'Solo le ganan las piezas.' : `Le ganan ${lista(['las piezas', ...mayores])}.`
  return `Mata: el ${nombreCarta(c)}. ${ganan}`
}

function separar(cartas: readonly Carta[], muestra: Carta) {
  const piezas = cartas.filter((c) => piezaDe(c, muestra) !== null).sort((a, b) => valorEnvido(b, muestra) - valorEnvido(a, muestra))
  const comunes = cartas.filter((c) => piezaDe(c, muestra) === null)
  return { piezas, comunes }
}

/** Nombre de una pieza a partir de la carta. */
function piezaDeCarta(c: Carta, muestra: Carta): string {
  return nombrePieza(piezaDe(c, muestra)!, muestra)
}

/** Tu envido y de dónde sale (como `calcularEnvido`). */
export function explicarEnvido(cartas: readonly Carta[], muestra: Carta): { tanto: number; texto: string } {
  const { piezas } = separar(cartas, muestra)
  const mayor = piezas[0]
  if (mayor) {
    const vp = valorEnvido(mayor, muestra)
    const otras = cartas.filter((c) => c !== mayor).sort((a, b) => valorComun(b) - valorComun(a))
    const alta = otras[0]
    const vo = alta ? valorComun(alta) : 0
    const tanto = vp + vo
    if (!alta || vo === 0) {
      return { tanto, texto: `Tu envido: ${tanto}. Con pieza, ${piezaDeCarta(mayor, muestra)} vale ${vp}; las otras no suman (10, 11 y 12 valen 0).` }
    }
    return {
      tanto,
      texto: `Tu envido: ${tanto} (${vp} ${de(piezaDeCarta(mayor, muestra))} + ${vo} del ${nombreCarta(alta)}). Con pieza se suma la más alta de las otras, de cualquier palo.`,
    }
  }
  // Sin piezas: 20 más el mejor par del mismo palo; si no hay par, la carta más alta.
  let par: [Carta, Carta] | null = null
  for (let i = 0; i < cartas.length; i++) {
    for (let j = i + 1; j < cartas.length; j++) {
      const [a, b] = [cartas[i]!, cartas[j]!]
      if (a.palo !== b.palo) continue
      if (!par || valorComun(a) + valorComun(b) > valorComun(par[0]) + valorComun(par[1])) par = [a, b]
    }
  }
  if (par) {
    const [a, b] = [...par].sort((x, y) => valorComun(y) - valorComun(x)) as [Carta, Carta]
    const tanto = 20 + valorComun(a) + valorComun(b)
    const figuras = valorComun(b) === 0 ? '; las figuras (10, 11 y 12) valen 0' : ''
    return { tanto, texto: `Tu envido: ${tanto} (${a.numero} y ${nombreCarta(b)} + 20${figuras}).` }
  }
  const alta = [...cartas].sort((x, y) => valorComun(y) - valorComun(x))[0]
  const tanto = alta ? valorComun(alta) : 0
  if (!alta || tanto === 0) {
    return { tanto, texto: `Tu envido: 0. No tenés dos del mismo palo, y las figuras (10, 11 y 12) valen 0.` }
  }
  return { tanto, texto: `Tu envido: ${tanto}. No tenés dos del mismo palo: vale tu carta más alta, el ${nombreCarta(alta)}.` }
}

/** Tu flor y de dónde sale (como `calcularFlor`, con la regla de la sala), o null si no hay flor. */
export function explicarFlor(
  cartas: readonly Carta[],
  muestra: Carta,
  config: Pick<ConfigSala, 'florConPiezas' | 'florObligatoria'>,
): { tanto: number; texto: string } | null {
  if (cartas.length !== 3) return null
  const { piezas, comunes } = separar(cartas, muestra)
  if (piezas.length < 2 && new Set(comunes.map((c) => c.palo)).size !== 1) return null
  const porque =
    piezas.length === 0
      ? 'tres cartas del mismo palo'
      : piezas.length === 1
        ? 'dos del mismo palo y una pieza, que hace de comodín'
        : `${piezas.length === 2 ? 'dos' : 'tres'} piezas, que hacen de comodín`
  const partes: string[] = []
  let tanto: number
  const [mayor, ...otras] = piezas
  if (!mayor) {
    tanto = 20 + comunes.reduce((s, c) => s + valorComun(c), 0)
    partes.push('20', ...comunes.map((c) => String(valorComun(c))))
  } else {
    const vm = valorEnvido(mayor, muestra)
    const digitos = config.florConPiezas === 'piezaMayorMasDigitos'
    const vOtras = otras.map((c) => (digitos ? valorEnvido(c, muestra) % 10 : valorComun(c)))
    tanto = vm + vOtras.reduce((s, v) => s + v, 0) + comunes.reduce((s, c) => s + valorComun(c), 0)
    partes.push(`${vm} (${piezaCorta(mayor, muestra)})`)
    otras.forEach((c, i) => partes.push(`${vOtras[i]} (${piezaCorta(c, muestra)}, ${digitos ? 'solo el último dígito' : 'por su número'})`))
    comunes.forEach((c) => partes.push(`${valorComun(c)} (${nombreCarta(c)})`))
  }
  const cantar = config.florObligatoria ? ' Cantala en la primera vuelta: si no, se pierde.' : ''
  return { tanto, texto: `Tenés flor de ${tanto}: ${porque}. Vale ${partes.join(' + ')}.${cantar}` }
}

/**
 * Las tres cartas que te repartieron: las que te quedan más las que ya tiraste (en
 * pica-pica, también las del duelo anterior). El tanto se cuenta siempre con las tres.
 */
export function cartasRepartidas(vista: VistaPartida): Carta[] {
  const yo = vista.yo.asiento
  const tiradas = vista.mano.enfrentamientos.flatMap((e) => e.vueltas.flatMap((v) => v.jugadas.filter((j) => j.asiento === yo).map((j) => j.carta)))
  return [...vista.mano.misCartas, ...tiradas.filter((c) => !vista.mano.misCartas.some((x) => mismaCarta(x, c)))]
}

/**
 * La explicación de la ficha del tanto: la flor si la tenés (y qué pasa con el envido),
 * o el envido. Si por algo no da lo mismo que el motor, queda solo el número.
 */
export function explicarTanto(vista: VistaPartida): string {
  const { envido, flor } = vista.mano.miTanto
  const cartas = cartasRepartidas(vista)
  const e = cartas.length === 3 ? explicarEnvido(cartas, vista.mano.muestra) : null
  const textoEnvido = e && e.tanto === envido ? e.texto : `Tu envido: ${envido}.`
  if (flor === null) return textoEnvido
  const f = cartas.length === 3 ? explicarFlor(cartas, vista.mano.muestra, vista.config) : null
  const textoFlor = f && f.tanto === flor ? f.texto : `Tenés flor de ${flor}.`
  return `${textoFlor} Con flor, el envido no se juega (el tuyo sería ${envido}).`
}
