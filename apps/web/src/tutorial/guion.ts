import { apply, crearPartida, mismaCarta, validar, type Accion, type CantoEnvido, type Carta, type EstadoPartida, type Evento } from '@truco/engine'

/**
 * Las manos guiadas del tutorial: una mano 1v1 de verdad (con el motor) con las cartas armadas de
 * antemano y un guion de lo que hace cada uno. Vos sos el asiento 0 y Don Queiroz, el 1.
 */

/** Lo que se hace en un paso del guion (una acción del motor, sin el jugador). */
export type Movida =
  | { tipo: 'carta'; carta: Carta }
  /** Truco, retruco o vale cuatro: el motor sabe cuál toca. */
  | { tipo: 'truco' }
  | { tipo: 'envido'; canto: CantoEnvido }
  | { tipo: 'quiero' }
  | { tipo: 'noQuiero' }
  | { tipo: 'tanto'; tanto: number | 'sonBuenas' }
  | { tipo: 'mazo' }

export type PasoGuion =
  /** Lo que hace Don Queiroz (solo, después de una pausa). */
  | { rival: Movida }
  /**
   * Lo que te pide a vos: `pide` lo dice Don Queiroz; `botones`, los cantos que aparecen (las cartas
   * se pueden tocar siempre); si hacés otra cosa, `mal` explica por qué no y cuenta un error.
   */
  | { pide: string; espera: Movida; botones?: Movida[]; mal: string | ((hecha: Movida) => string) }

export interface ManoGuiada {
  vos: Carta[]
  rival: Carta[]
  muestra: Carta
  /** Quién es mano (juega primero). */
  mano: 'vos' | 'rival'
  guion: PasoGuion[]
  /** Lo que dice Don Queiroz al terminar la mano. */
  fin: string
}

export const VOS = 'vos'
export const RIVAL = 'queiroz'

/** La partida con las cartas del guion: el que no es mano reparte. */
export function partidaGuiada(m: ManoGuiada): EstadoPartida {
  return crearPartida({
    jugadores: [
      { id: VOS, nombre: 'Vos' },
      { id: RIVAL, nombre: 'Don Queiroz', bot: true },
    ],
    semilla: 1,
    config: { formato: '1v1' },
    reparte: m.mano === 'vos' ? 1 : 0,
    repartoFijo: { cartas: [m.vos, m.rival], muestra: m.muestra },
  })
}

export function aAccion(m: Movida, jugador: string): Accion {
  switch (m.tipo) {
    case 'carta':
      return { tipo: 'jugarCarta', jugador, carta: m.carta }
    case 'truco':
      return { tipo: 'cantarTruco', jugador }
    case 'envido':
      return { tipo: 'cantarEnvido', jugador, canto: m.canto }
    case 'quiero':
    case 'noQuiero':
      return { tipo: 'responder', jugador, respuesta: m.tipo }
    case 'tanto':
      return { tipo: 'declararTanto', jugador, tanto: m.tanto }
    case 'mazo':
      return { tipo: 'irseAlMazo', jugador }
  }
}

export function mismaMovida(a: Movida, b: Movida): boolean {
  if (a.tipo !== b.tipo) return false
  if (a.tipo === 'carta' && b.tipo === 'carta') return mismaCarta(a.carta, b.carta)
  if (a.tipo === 'envido' && b.tipo === 'envido') return a.canto === b.canto
  if (a.tipo === 'tanto' && b.tipo === 'tanto') return a.tanto === b.tanto
  return true
}

/** Si la movida se puede hacer ahora (null) o por qué no, según el motor. */
export const motivoInvalida = (estado: EstadoPartida, m: Movida, jugador: string) => validar(estado, aAccion(m, jugador))

export const esDelRival = (p: PasoGuion): p is { rival: Movida } => 'rival' in p

/**
 * Juega el guion entero con el motor (para los tests): los eventos de cada paso, o el primer paso
 * que el motor no acepta.
 */
export function jugarGuion(m: ManoGuiada): { ok: true; eventos: Evento[]; final: EstadoPartida } | { ok: false; paso: number; motivo: string } {
  let estado = partidaGuiada(m)
  const eventos: Evento[] = []
  for (const [i, p] of m.guion.entries()) {
    const r = apply(estado, aAccion(esDelRival(p) ? p.rival : p.espera, esDelRival(p) ? RIVAL : VOS))
    if (!r.ok) return { ok: false, paso: i, motivo: r.motivo }
    estado = r.estado
    eventos.push(...r.eventos)
  }
  return { ok: true, eventos, final: estado }
}
