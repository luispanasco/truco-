import { barajar, normalizarSemilla, siguienteAleatorio } from './azar'
import { crearBaraja, mismaCarta, type Carta } from './cartas'
import { cantidadJugadores, crearConfig, type ConfigSala } from './config'
import { equipoDe } from './reglas'
import { calcularEnvido, calcularFlor } from './tanto'
import type { Enfrentamiento, EstadoMano, EstadoPartida, Jugador, TipoCorte } from './tipos'

export interface RepartoFijo {
  /** Cartas de cada asiento (3 por asiento). */
  cartas: Carta[][]
  muestra: Carta
}

export interface OpcionesPartida {
  jugadores: { id: string; nombre: string; bot?: boolean }[]
  semilla: number
  config?: Partial<ConfigSala>
  /** Asiento que reparte la primera mano. Por defecto el último, así el asiento 0 es mano. */
  reparte?: number
  /** Reparto elegido para la primera mano (tests y tutoriales). */
  repartoFijo?: RepartoFijo
}

export function crearPartida(op: OpcionesPartida): EstadoPartida {
  const config = crearConfig(op.config)
  const n = cantidadJugadores(config.formato)
  if (op.jugadores.length !== n) {
    throw new Error(`El formato ${config.formato} necesita ${n} jugadores`)
  }
  if (new Set(op.jugadores.map((j) => j.id)).size !== n) throw new Error('Hay ids de jugador repetidos')

  const jugadores: Jugador[] = op.jugadores.map((j, asiento) => ({ ...j, asiento, equipo: equipoDe(asiento) }))
  const semilla = normalizarSemilla(op.semilla)
  const parcial = { config, semilla, rng: semilla, jugadores, puntos: [0, 0] as [number, number], ganador: null }
  const { mano, rng } = repartir(parcial, 1, op.reparte ?? n - 1, op.repartoFijo)
  return { ...parcial, rng, mano }
}

export function nuevoEnfrentamiento(participantes: number[], mano: number): Enfrentamiento {
  return {
    participantes,
    mano,
    vueltas: [{ empieza: mano, jugadas: [], resultado: null, ganador: null }],
    turno: mano,
    truco: { valor: 1, puedeSubir: null, pendiente: null },
    envido: { estado: 'libre', cantos: [], declaraciones: [], porDeclarar: [], ganador: null },
    flor: { estado: 'libre', cantadas: [], contra: [], noQuerida: null },
    alMazo: null,
    retirados: [],
    ordenes: [],
    fin: null,
    resultado: null,
  }
}

/** Participantes del duelo `k` de una mano de pica-pica: el asiento `mano + k` contra el de enfrente. */
export function participantesDuelo(manoAsiento: number, k: number, n: number): number[] {
  const m = (manoAsiento + k) % n
  return [m, (m + n / 2) % n]
}

/**
 * Si la mano `numero` se juega en pica-pica. Alternado, las impares son redondas y las pares
 * pica-pica (la partida arranca en malas, así que la primera siempre es redonda).
 */
export function esManoDePicaPica(estado: Pick<EstadoPartida, 'config' | 'puntos'>, numero: number): boolean {
  const { formato, picaPica, tramoPicaPica, picaPicaAlternado } = estado.config
  if (formato !== '3v3' || !picaPica) return false
  if (picaPicaAlternado && numero % 2 === 1) return false
  return estado.puntos.every((p) => p >= tramoPicaPica.desde && p <= tramoPicaPica.hasta)
}

/** El que corta: el de la izquierda del que reparte (en 1v1, el mano). */
export function asientoQueCorta(reparte: number, n: number): number {
  return (reparte + n - 1) % n
}

type EstadoParaRepartir = Pick<EstadoPartida, 'config' | 'jugadores' | 'puntos' | 'rng'>

/**
 * Mezcla y reparte una mano. Con el corte prendido la mano queda esperando que corte el de la
 * izquierda del que reparte: las cartas se reparten recién en `cortarYRepartir`.
 */
export function repartir(
  estado: EstadoParaRepartir,
  numero: number,
  reparte: number,
  fijo?: RepartoFijo,
): { mano: EstadoMano; rng: number } {
  const n = estado.jugadores.length
  const manoAsiento = (reparte + 1) % n

  if (fijo) {
    validarRepartoFijo(fijo, n)
    const cartas = fijo.cartas.map((cs) => [...cs])
    return { rng: estado.rng, mano: armarMano(estado, numero, reparte, cartas, fijo.muestra) }
  }

  const mezcla = barajar(crearBaraja(), estado.rng)
  if (estado.config.corte) {
    const mano = armarMano(estado, numero, reparte, Array.from({ length: n }, () => []), mezcla.resultado[0]!)
    return { rng: mezcla.rng, mano: { ...mano, cortando: asientoQueCorta(reparte, n), mazo: mezcla.resultado } }
  }
  const { cartas, muestra } = darCartas(mezcla.resultado, n, manoAsiento)
  return { rng: mezcla.rng, mano: armarMano(estado, numero, reparte, cartas, muestra) }
}

/**
 * Corta el mazo que espera la mano y reparte:
 * - convencional: se pasa un pedazo de arriba abajo;
 * - sacar la muestra: la carta de arriba es la muestra;
 * - se la doy al mano: se corta una sola carta, que va al fondo y se la queda el mano.
 */
export function cortarYRepartir(estado: EstadoParaRepartir & { mano: EstadoMano }, corte: TipoCorte): { mano: EstadoMano; rng: number } {
  const { mano } = estado
  const mazo = mano.mazo
  if (!mazo) throw new Error('No hay mazo para cortar')
  const n = estado.jugadores.length
  let rng = estado.rng
  let cartas: Carta[][]
  let muestra: Carta
  if (corte === 'sacarMuestra') {
    muestra = mazo[0]!
    ;({ cartas } = darCartas(mazo.slice(1), n, mano.mano))
  } else if (corte === 'darAlMano') {
    const cortada = mazo[0]!
    ;({ cartas, muestra } = darCartas(mazo.slice(1), n, mano.mano))
    // La cortada queda al fondo y es del mano: va en lugar de la última que le tocó.
    const delMano = cartas[mano.mano]!
    cartas[mano.mano] = [cortada, ...delMano.slice(0, 2)]
  } else {
    let r: number
    ;[r, rng] = siguienteAleatorio(rng)
    const k = 1 + Math.floor(r * (mazo.length - 1))
    ;({ cartas, muestra } = darCartas([...mazo.slice(k), ...mazo.slice(0, k)], n, mano.mano))
  }
  return { rng, mano: armarMano(estado, mano.numero, mano.reparte, cartas, muestra) }
}

/** Tres cartas a cada uno empezando por el mano; la siguiente es la muestra. */
function darCartas(mazo: readonly Carta[], n: number, manoAsiento: number): { cartas: Carta[][]; muestra: Carta } {
  const cartas: Carta[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) cartas[(manoAsiento + i) % n] = mazo.slice(i * 3, i * 3 + 3)
  return { cartas, muestra: mazo[n * 3] as Carta }
}

function armarMano(estado: EstadoParaRepartir, numero: number, reparte: number, cartas: Carta[][], muestra: Carta): EstadoMano {
  const n = estado.jugadores.length
  const manoAsiento = (reparte + 1) % n
  const tantos = cartas.map((cs) => ({
    envidoReal: cs.length === 3 ? calcularEnvido(cs, muestra) : 0,
    florReal: cs.length === 3 ? calcularFlor(cs, muestra, estado.config.florConPiezas) : null,
    envidoDeclarado: null,
    florDeclarada: null,
  }))
  const picaPica = esManoDePicaPica(estado, numero)
  const participantes = picaPica
    ? participantesDuelo(manoAsiento, 0, n)
    : Array.from({ length: n }, (_, i) => (manoAsiento + i) % n)
  return {
    numero,
    reparte,
    mano: manoAsiento,
    cortando: null,
    mazo: null,
    muestra,
    cartas,
    cartasIniciales: cartas.map((cs) => [...cs]),
    tantos,
    picaPica,
    enfrentamientos: [nuevoEnfrentamiento(participantes, manoAsiento)],
    actual: 0,
    verificacion: null,
  }
}

function validarRepartoFijo(fijo: RepartoFijo, n: number) {
  if (fijo.cartas.length !== n || fijo.cartas.some((cs) => cs.length !== 3)) {
    throw new Error('El reparto fijo necesita 3 cartas por jugador')
  }
  const todas = [...fijo.cartas.flat(), fijo.muestra]
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      if (mismaCarta(todas[i] as Carta, todas[j] as Carta)) throw new Error('El reparto fijo repite cartas')
    }
  }
}
