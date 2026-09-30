import { expect } from 'vitest'
import {
  accionesValidas,
  apply,
  crearPartida,
  esperandoA,
  siguienteAleatorio,
  type Accion,
  type Carta,
  type ConfigSala,
  type EstadoPartida,
  type Evento,
  type Numero,
  type Palo,
} from '../src'

const PALO_POR_LETRA: Record<string, Palo> = { e: 'espada', b: 'basto', o: 'oro', c: 'copa' }

/** Carta abreviada: "1e" = 1 de espadas, "12o" = 12 de oros. */
export function c(txt: string): Carta {
  const palo = PALO_POR_LETRA[txt.slice(-1)]
  const numero = Number(txt.slice(0, -1)) as Numero
  if (!palo || Number.isNaN(numero)) throw new Error(`Carta inválida: ${txt}`)
  return { numero, palo }
}

export function mano(txt: string): Carta[] {
  return txt.split(' ').map(c)
}

export const IDS = ['a', 'b', 'c', 'd', 'e', 'f']

/**
 * Partida con la primera mano elegida. El asiento 0 ("a") es mano y los asientos
 * pares son el equipo 0. `manos` son las cartas de cada asiento, por ejemplo "1e 7o 4b".
 */
export function partidaCon(manos: string[], muestra: string, config: Partial<ConfigSala> = {}): EstadoPartida {
  const formato = manos.length === 2 ? '1v1' : manos.length === 4 ? '2v2' : '3v3'
  return crearPartida({
    jugadores: IDS.slice(0, manos.length).map((id) => ({ id, nombre: id.toUpperCase() })),
    semilla: 1234,
    config: { formato, ...config },
    repartoFijo: { cartas: manos.map(mano), muestra: c(muestra) },
  })
}

type AccionCorta =
  | ['jugar', string, string]
  | ['truco', string]
  | ['envido' | 'realEnvido' | 'faltaEnvido', string]
  | ['flor' | 'contraflor' | 'contraflorAlResto', string]
  | ['quiero' | 'noQuiero', string]
  | ['declarar', string, number | 'sonBuenas']
  | ['mazo', string]

export function accion(a: AccionCorta): Accion {
  switch (a[0]) {
    case 'jugar':
      return { tipo: 'jugarCarta', jugador: a[1], carta: c(a[2]) }
    case 'truco':
      return { tipo: 'cantarTruco', jugador: a[1] }
    case 'envido':
    case 'realEnvido':
    case 'faltaEnvido':
      return { tipo: 'cantarEnvido', jugador: a[1], canto: a[0] }
    case 'flor':
    case 'contraflor':
    case 'contraflorAlResto':
      return { tipo: 'cantarFlor', jugador: a[1], canto: a[0] }
    case 'quiero':
    case 'noQuiero':
      return { tipo: 'responder', jugador: a[1], respuesta: a[0] }
    case 'declarar':
      return { tipo: 'declararTanto', jugador: a[1], tanto: a[2] }
    case 'mazo':
      return { tipo: 'irseAlMazo', jugador: a[1] }
  }
}

/** Aplica acciones en orden; falla el test si alguna es inválida. */
export function jugar(estado: EstadoPartida, ...acciones: AccionCorta[]): { estado: EstadoPartida; eventos: Evento[] } {
  let actual = estado
  const eventos: Evento[] = []
  for (const a of acciones) {
    const r = apply(actual, accion(a))
    if (!r.ok) throw new Error(`Acción inválida ${JSON.stringify(a)}: ${r.motivo}`)
    actual = r.estado
    eventos.push(...r.eventos)
  }
  return { estado: actual, eventos }
}

/** Espera que la acción sea rechazada, opcionalmente con un motivo que contenga `texto`. */
export function rechaza(estado: EstadoPartida, a: AccionCorta, texto?: string) {
  const r = apply(estado, accion(a))
  expect(r.ok, `se esperaba rechazo de ${JSON.stringify(a)}`).toBe(false)
  if (!r.ok && texto) expect(r.motivo).toContain(texto)
}

/**
 * Juega al azar entre las acciones válidas de quienes el juego está esperando.
 * Irse al mazo sale con poca probabilidad para que las manos se jueguen.
 */
export function pasoAlAzar(estado: EstadoPartida, rng: number): { accion: Accion; rng: number } | null {
  const esperando = esperandoA(estado)
  if (esperando.length === 0) return null
  let r: number
  ;[r, rng] = siguienteAleatorio(rng)
  const asiento = esperando[Math.floor(r * esperando.length)]!
  const id = estado.jugadores[asiento]!.id
  const validas = accionesValidas(estado, id)
  if (validas.length === 0) return null
  const sinMazo = validas.filter((a) => a.tipo !== 'irseAlMazo')
  ;[r, rng] = siguienteAleatorio(rng)
  const pool = sinMazo.length > 0 && r > 0.03 ? sinMazo : validas
  ;[r, rng] = siguienteAleatorio(rng)
  return { accion: pool[Math.floor(r * pool.length)]!, rng }
}
