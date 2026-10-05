import { barajar, normalizarSemilla } from './azar'
import { crearBaraja, mismaCarta, type Carta } from './cartas'
import { cantidadJugadores, crearConfig, type ConfigSala } from './config'
import { equipoDe } from './reglas'
import { calcularEnvido, calcularFlor } from './tanto'
import type { Enfrentamiento, EstadoMano, EstadoPartida, Jugador } from './tipos'

export interface RepartoFijo {
  /** Cartas de cada asiento (3 por asiento). */
  cartas: Carta[][]
  muestra: Carta
}

export interface OpcionesPartida {
  jugadores: { id: string; nombre: string }[]
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

export function repartir(
  estado: Pick<EstadoPartida, 'config' | 'jugadores' | 'puntos' | 'rng'>,
  numero: number,
  reparte: number,
  fijo?: RepartoFijo,
): { mano: EstadoMano; rng: number } {
  const n = estado.jugadores.length
  const manoAsiento = (reparte + 1) % n
  let cartas: Carta[][]
  let muestra: Carta
  let rng = estado.rng

  if (fijo) {
    validarRepartoFijo(fijo, n)
    cartas = fijo.cartas.map((cs) => [...cs])
    muestra = fijo.muestra
  } else {
    const mezcla = barajar(crearBaraja(), rng)
    rng = mezcla.rng
    cartas = Array.from({ length: n }, () => [])
    for (let i = 0; i < n; i++) {
      cartas[(manoAsiento + i) % n] = mezcla.resultado.slice(i * 3, i * 3 + 3)
    }
    muestra = mezcla.resultado[n * 3] as Carta
  }

  const tantos = cartas.map((cs) => ({
    envidoReal: calcularEnvido(cs, muestra),
    florReal: calcularFlor(cs, muestra, estado.config.florConPiezas),
    envidoDeclarado: null,
    florDeclarada: null,
  }))

  const picaPica = esManoDePicaPica(estado, numero)
  const participantes = picaPica
    ? participantesDuelo(manoAsiento, 0, n)
    : Array.from({ length: n }, (_, i) => (manoAsiento + i) % n)

  return {
    rng,
    mano: {
      numero,
      reparte,
      mano: manoAsiento,
      muestra,
      cartas,
      cartasIniciales: cartas.map((cs) => [...cs]),
      tantos,
      picaPica,
      enfrentamientos: [nuevoEnfrentamiento(participantes, manoAsiento)],
      actual: 0,
      verificacion: null,
    },
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
