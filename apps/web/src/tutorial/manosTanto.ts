import {
  calcularEnvido,
  calcularFlor,
  crearBaraja,
  crearConfig,
  mismaCarta,
  nombreCarta,
  PALOS,
  piezaDe,
  tieneFlor,
  valorComun,
  valorEnvido,
  type Carta,
  type ReglaFlorConPiezas,
} from '@truco/engine'
import { mezclar, type Azar } from './cartas'

/**
 * Las manos de los ejercicios de envido y flor, y cómo explica Don Queiroz la cuenta. El número
 * correcto sale siempre del motor (`calcularEnvido`, `calcularFlor`), así se enseña como se juega.
 */

const BARAJA = crearBaraja()
const elegir = <T>(lista: readonly T[], azar: Azar): T => lista[Math.floor(azar() * lista.length)]!

/** La regla de la flor con piezas que se juega por defecto. */
export const REGLA_FLOR: ReglaFlorConPiezas = crearConfig().florConPiezas

/** Una mano para cargar: tres cartas y la muestra (null si todavía se juega sin piezas). */
export interface ManoTanto {
  mano: Carta[]
  muestra: Carta | null
}

/** Para contar sin piezas: una "muestra" de un palo que no está en la mano, así ninguna es pieza. */
export function muestraNeutra(mano: readonly Carta[]): Carta {
  const palo = PALOS.find((p) => !mano.some((x) => x.palo === p)) ?? 'oro'
  return { numero: 1, palo }
}

const laMuestra = (m: ManoTanto) => m.muestra ?? muestraNeutra(m.mano)

/** El envido de la mano, según el motor. */
export const envidoDe = (m: ManoTanto): number => calcularEnvido(m.mano, laMuestra(m))

/** La flor de la mano según el motor (null si no tiene). */
export const florDe = (m: ManoTanto, regla: ReglaFlorConPiezas = REGLA_FLOR): number | null => calcularFlor(m.mano, laMuestra(m), regla)

export const tieneFlorLa = (m: ManoTanto): boolean => tieneFlor(m.mano, laMuestra(m))

/** Tres cartas distintas al azar, sin la muestra. */
function tresCartas(azar: Azar, muestra: Carta | null): Carta[] {
  return mezclar(muestra ? BARAJA.filter((x) => !mismaCarta(x, muestra)) : BARAJA, azar).slice(0, 3)
}

/** Repite hasta que la mano cumpla (las condiciones se cumplen seguido: no tarda). */
function hasta(azar: Azar, muestra: Carta | null, cumple: (m: ManoTanto) => boolean): ManoTanto {
  for (;;) {
    const m = { mano: tresCartas(azar, muestra), muestra }
    if (cumple(m)) return m
  }
}

const cuantasPiezas = (m: ManoTanto) => (m.muestra ? m.mano.filter((x) => piezaDe(x, m.muestra!) !== null).length : 0)
const hayPar = (mano: readonly Carta[]) => mano.some((a, i) => mano.some((b, j) => j > i && a.palo === b.palo))

/**
 * Una mano para cargar el envido, nunca con flor. Sin muestra: la mitad con dos del mismo palo,
 * la otra con los tres palos distintos. Con muestra: casi siempre con una pieza.
 */
export function manoEnvido(azar: Azar, conMuestra: boolean): ManoTanto {
  if (!conMuestra) {
    const conPar = azar() < 0.6
    return hasta(azar, null, (m) => !tieneFlorLa(m) && hayPar(m.mano) === conPar)
  }
  const muestra = elegir(BARAJA, azar)
  const conPieza = azar() < 0.7
  return hasta(azar, muestra, (m) => !tieneFlorLa(m) && cuantasPiezas(m) === (conPieza ? 1 : 0))
}

/** Una mano con flor: sin piezas (las tres del mismo palo) o con alguna pieza de comodín. */
export function manoFlor(azar: Azar, conPiezas: boolean): ManoTanto {
  if (!conPiezas) {
    const palo = elegir(PALOS, azar)
    return { mano: mezclar(BARAJA.filter((x) => x.palo === palo), azar).slice(0, 3), muestra: null }
  }
  const muestra = elegir(BARAJA, azar)
  // Una pieza con dos del mismo palo, o dos piezas (o tres) con cualquiera.
  const piezas = azar() < 0.55 ? 1 : 2
  return hasta(azar, muestra, (m) => tieneFlorLa(m) && (piezas === 1 ? cuantasPiezas(m) === 1 : cuantasPiezas(m) >= 2))
}

/**
 * Una mano para "¿tiene flor?", con muestra: la mitad tiene. Las que no, casi siempre engañan
 * (dos del mismo palo, o una pieza con dos de palos distintos).
 */
export function manoTieneFlor(azar: Azar): ManoTanto {
  const muestra = elegir(BARAJA, azar)
  if (azar() < 0.5) return azar() < 0.4 ? conMuestraAjena(azar) : manoFlor(azar, true)
  return hasta(azar, muestra, (m) => !tieneFlorLa(m) && (cuantasPiezas(m) === 1 || hayPar(m.mano)))
}

/** Arma de nuevo la flor sin piezas, pero con una muestra de otro palo (para que se vea la muestra). */
function conMuestraAjena(azar: Azar): ManoTanto {
  const { mano } = manoFlor(azar, false)
  const muestra = elegir(
    BARAJA.filter((x) => x.palo !== mano[0]!.palo),
    azar,
  )
  return { mano, muestra }
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const el = (x: Carta) => `el ${nombreCarta(x)}`
/** "el 12 de copas (negra, vale 0)" o "el 5 de copas (5)". */
const conValor = (x: Carta) => `${el(x)} (${valorComun(x) === 0 ? 'negra, vale 0' : valorComun(x)})`

/** "el 4 de oros vale 29" o "el 12 de oros hace de 2: vale 30". */
function valorPieza(x: Carta, muestra: Carta): string {
  const p = piezaDe(x, muestra)!
  return x.numero === p ? `${el(x)} es pieza y vale ${valorEnvido(x, muestra)}` : `${el(x)} hace de ${p} (la muestra es el ${p}) y vale ${valorEnvido(x, muestra)}`
}

/** La cuenta del envido, paso a paso, con el total del motor al final. */
export function explicarEnvido(m: ManoTanto): { texto: string; total: number } {
  const muestra = laMuestra(m)
  const total = envidoDe(m)
  const piezas = m.mano.filter((x) => piezaDe(x, muestra) !== null).sort((a, b) => valorEnvido(b, muestra) - valorEnvido(a, muestra))
  if (piezas.length > 0) {
    const p = piezas[0]!
    const otras = m.mano.filter((x) => x !== p)
    const alta = otras.reduce((a, b) => (valorComun(b) > valorComun(a) ? b : a))
    const suma = valorComun(alta)
    const resto =
      suma === 0
        ? 'Las otras dos son negras: no suman nada.'
        : `Se le suma la más alta de las otras, sea del palo que sea: ${el(alta)}, ${suma}.`
    return { texto: `Tenés pieza: ${valorPieza(p, muestra)}. ${resto} ${valorEnvido(p, muestra)} + ${suma} = ${total}.`, total }
  }
  const previo = m.muestra ? 'No tenés piezas, así que se cuenta como siempre. ' : ''
  let par: [Carta, Carta] | null = null
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const [a, b] = [m.mano[i]!, m.mano[j]!]
      if (a.palo === b.palo && (!par || valorComun(a) + valorComun(b) > valorComun(par[0]) + valorComun(par[1]))) par = [a, b]
    }
  if (par) {
    const [a, b] = valorComun(par[0]) >= valorComun(par[1]) ? par : [par[1], par[0]]
    return { texto: previo + mayuscula(`${conValor(a)} y ${conValor(b)} son del mismo palo: 20 + ${valorComun(a)} + ${valorComun(b)} = ${total}.`), total }
  }
  const alta = m.mano.reduce((a, b) => (valorComun(b) > valorComun(a) ? b : a))
  const texto =
    valorComun(alta) === 0
      ? `${previo}No hay dos del mismo palo y las tres son negras: tenés ${total} de envido.`
      : `${previo}No hay dos del mismo palo: vale la más alta, ${el(alta)}. Son ${total}.`
  return { texto, total }
}

/** Por qué tiene flor o no. */
export function explicarTieneFlor(m: ManoTanto): string {
  const muestra = laMuestra(m)
  const piezas = m.mano.filter((x) => piezaDe(x, muestra) !== null)
  const comunes = m.mano.filter((x) => piezaDe(x, muestra) === null)
  if (piezas.length >= 2) return `Tiene: ${piezas.length === 3 ? 'son tres piezas' : `${el(piezas[0]!)} y ${el(piezas[1]!)} son piezas, y dos piezas hacen flor con cualquier carta`}.`
  if (piezas.length === 1) {
    const [a, b] = comunes as [Carta, Carta]
    return a.palo === b.palo
      ? `Tiene: ${el(piezas[0]!)} es pieza, y hace de comodín con ${el(a)} y ${el(b)}, que son del mismo palo.`
      : `No tiene: ${el(piezas[0]!)} es pieza, pero ${el(a)} y ${el(b)} son de palos distintos.`
  }
  return tieneFlorLa(m) ? 'Tiene: las tres son del mismo palo.' : 'No tiene: no son las tres del mismo palo, y no hay piezas que ayuden.'
}

/** La cuenta de la flor, paso a paso, con el total del motor al final. */
export function explicarFlor(m: ManoTanto, regla: ReglaFlorConPiezas = REGLA_FLOR): { texto: string; total: number } {
  const muestra = laMuestra(m)
  const total = florDe(m, regla) ?? 0
  const piezas = m.mano.filter((x) => piezaDe(x, muestra) !== null).sort((a, b) => valorEnvido(b, muestra) - valorEnvido(a, muestra))
  const comunes = m.mano.filter((x) => piezaDe(x, muestra) === null)
  if (piezas.length === 0) {
    const [a, b, c] = [...m.mano].sort((x, y) => valorComun(y) - valorComun(x))
    return { texto: `Tres del mismo palo: 20 + ${valorComun(a!)} + ${valorComun(b!)} + ${valorComun(c!)} = ${total}.${m.mano.some((x) => valorComun(x) === 0) ? ' Las negras valen 0.' : ''}`, total }
  }
  const [mayor, ...otras] = piezas
  const partes = [`${valorPieza(mayor!, muestra)}${otras.length > 0 ? ' (la más alta va entera)' : ''}`]
  const numeros = [valorEnvido(mayor!, muestra)]
  for (const x of otras) {
    const v = regla === 'piezaMayorMasDigitos' ? valorEnvido(x, muestra) % 10 : valorComun(x)
    partes.push(regla === 'piezaMayorMasDigitos' ? `de ${el(x)}, que vale ${valorEnvido(x, muestra)}, va solo el ${v}` : `${el(x)} va por su número, ${v}`)
    numeros.push(v)
  }
  if (comunes.length > 0) {
    partes.push(`${comunes.length === 1 ? 'la otra' : 'las otras'} por su número, sin el 20: ${comunes.map(conValor).join(' y ')}`)
    numeros.push(...comunes.map(valorComun))
  }
  return { texto: `${mayuscula(partes.join('; '))}. ${numeros.join(' + ')} = ${total}.`, total }
}
