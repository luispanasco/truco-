import { crearBaraja, esPieza, fuerza, mismaCarta, nombreCarta, NUMEROS_PIEZA, PALOS, piezaDe, type Carta, type Palo } from '@truco/engine'

/**
 * Lo que necesitan los ejercicios del tutorial: armar cartas al azar para cada ronda y explicar por
 * qué gana una. Todo sale de la jerarquía del motor, así lo que se enseña es como se juega.
 */

export type Azar = () => number

const elegir = <T>(lista: readonly T[], azar: Azar): T => lista[Math.floor(azar() * lista.length)]!

export function mezclar<T>(lista: readonly T[], azar: Azar): T[] {
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[r[i], r[j]] = [r[j]!, r[i]!]
  }
  return r
}

const c = (numero: Carta['numero'], palo: Palo): Carta => ({ numero, palo })

/** Sin muestra (antes de enseñar las piezas): la fuerza de la carta si no es del palo de la muestra. */
export function fuerzaComun(carta: Carta): number {
  return fuerza(carta, { numero: 6, palo: carta.palo === 'copa' ? 'oro' : 'copa' })
}

/** La fuerza con muestra o, sin ella, la común. */
const fuerzaCon = (carta: Carta, muestra: Carta | null) => (muestra ? fuerza(carta, muestra) : fuerzaComun(carta))

/** Quién gana la vuelta entre dos cartas: la primera, la segunda o empatan (parda). */
export function ganadora(a: Carta, b: Carta, muestra: Carta | null): 'a' | 'b' | 'parda' {
  const fa = fuerzaCon(a, muestra)
  const fb = fuerzaCon(b, muestra)
  return fa === fb ? 'parda' : fa > fb ? 'a' : 'b'
}

/** Los escalones de la jerarquía sin muestra, de la más alta a la más baja. */
export const ESCALERA: readonly { nombre: string; cartas: Carta[] }[] = [
  { nombre: 'Las matas', cartas: [c(1, 'espada'), c(1, 'basto'), c(7, 'espada'), c(7, 'oro')] },
  { nombre: 'Los tres', cartas: PALOS.map((p) => c(3, p)) },
  { nombre: 'Los dos', cartas: PALOS.map((p) => c(2, p)) },
  { nombre: 'Los anchos falsos', cartas: [c(1, 'oro'), c(1, 'copa')] },
  { nombre: 'Las negras', cartas: [c(12, 'espada'), c(11, 'basto'), c(10, 'oro')] },
  { nombre: 'Los sietes falsos', cartas: [c(7, 'basto'), c(7, 'copa')] },
  { nombre: 'Los seis, los cincos y los cuatros', cartas: [c(6, 'oro'), c(5, 'copa'), c(4, 'espada')] },
]

/** Qué es una carta, para explicarla: "una pieza", "una mata", "una negra"… */
export function queEs(carta: Carta, muestra: Carta | null): string {
  if (muestra && esPieza(carta, muestra)) {
    const pieza = piezaDe(carta, muestra)!
    return carta.numero === pieza ? `una pieza (el ${pieza} de la muestra)` : `una pieza (el 12 hace de ${pieza}, porque la muestra es el ${pieza})`
  }
  const f = fuerzaComun(carta)
  if (f >= 11) return 'una mata'
  if (carta.numero === 3) return 'un tres'
  if (carta.numero === 2) return 'un dos'
  if (carta.numero === 1) return 'un ancho falso'
  if (carta.numero >= 10) return 'una negra'
  if (carta.numero === 7) return 'un siete falso'
  return 'de las más bajas'
}

/** La explicación de quién gana: "El 7 de espadas (una mata) le gana al 3 de oros (un tres)". */
export function explicar(a: Carta, b: Carta, muestra: Carta | null): string {
  const g = ganadora(a, b, muestra)
  if (g === 'parda') return `Son iguales: el ${nombreCarta(a)} y el ${nombreCarta(b)} valen lo mismo. Eso es parda.`
  const [gana, pierde] = g === 'a' ? [a, b] : [b, a]
  return `El ${nombreCarta(gana)} (${queEs(gana, muestra)}) le gana al ${nombreCarta(pierde)} (${queEs(pierde, muestra)}).`
}

const BARAJA = crearBaraja()

/** Una muestra al azar (cualquier carta). */
export const muestraAlAzar = (azar: Azar): Carta => elegir(BARAJA, azar)

/** Las piezas de una muestra (las 5, contando el 12 si la muestra es una pieza). */
export const piezasDe = (muestra: Carta): Carta[] => BARAJA.filter((x) => esPieza(x, muestra))

/**
 * Dos cartas para comparar: a veces iguales (parda); con muestra, la mitad de las veces hay una
 * pieza en juego. Nunca la muestra misma (esa no está en el juego).
 */
export function parParaComparar(azar: Azar, muestra: Carta | null): [Carta, Carta] {
  const enJuego = muestra ? BARAJA.filter((x) => !mismaCarta(x, muestra)) : BARAJA
  const a = muestra && azar() < 0.5 ? elegir(piezasDe(muestra), azar) : elegir(enJuego, azar)
  const fa = fuerzaCon(a, muestra)
  const iguales = enJuego.filter((x) => !mismaCarta(x, a) && fuerzaCon(x, muestra) === fa)
  if (iguales.length > 0 && azar() < 0.15) return mezclar([a, elegir(iguales, azar)], azar) as [Carta, Carta]
  const distintas = enJuego.filter((x) => fuerzaCon(x, muestra) !== fa)
  return mezclar([a, elegir(distintas, azar)], azar) as [Carta, Carta]
}

/** Tres cartas de fuerza distinta para ordenar, casi siempre con alguna pieza. */
export function manoParaOrdenar(azar: Azar, muestra: Carta): Carta[] {
  const enJuego = BARAJA.filter((x) => !mismaCarta(x, muestra))
  for (;;) {
    const mano = azar() < 0.7 ? [elegir(piezasDe(muestra), azar), ...mezclar(enJuego, azar).slice(0, 2)] : mezclar(enJuego, azar).slice(0, 3)
    const fuerzas = new Set(mano.map((x) => fuerza(x, muestra)))
    if (new Set(mano.map((x) => `${x.numero}${x.palo}`)).size === 3 && fuerzas.size === 3) return mezclar(mano, azar)
  }
}

/** Cartas para buscar las de un palo: `cuantas` en total, con `delPalo` de ese palo. */
export function cartasConPalo(azar: Azar, palo: Palo, cuantas: number, delPalo: number): Carta[] {
  const si = mezclar(BARAJA.filter((x) => x.palo === palo), azar).slice(0, delPalo)
  const no = mezclar(BARAJA.filter((x) => x.palo !== palo), azar).slice(0, cuantas - delPalo)
  return mezclar([...si, ...no], azar)
}

/**
 * Cartas para buscar las piezas: unas del palo de la muestra que no lo son (para que se piense) y
 * otras de otros palos con números de pieza (el 2 de otro palo no es pieza).
 */
export function cartasConPiezas(azar: Azar, muestra: Carta, cuantas: number, piezas: number): Carta[] {
  const si = mezclar(piezasDe(muestra), azar).slice(0, piezas)
  const trampas = BARAJA.filter(
    (x) => !mismaCarta(x, muestra) && !esPieza(x, muestra) && (x.palo === muestra.palo || (NUMEROS_PIEZA as readonly number[]).includes(x.numero)),
  )
  const no = mezclar(trampas, azar).slice(0, cuantas - piezas)
  return mezclar([...si, ...no], azar)
}

/** Una muestra que es pieza (un 2, 4, 5, 10 u 11), para enseñar que el 12 toma su lugar. */
export const muestraPieza = (azar: Azar): Carta => c(elegir(NUMEROS_PIEZA, azar), elegir(PALOS, azar))
