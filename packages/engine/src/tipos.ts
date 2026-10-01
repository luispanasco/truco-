import type { Carta } from './cartas'
import type { ConfigSala } from './config'

/** Los asientos pares son el equipo 0 y los impares el equipo 1. */
export type Equipo = 0 | 1

export interface Jugador {
  id: string
  nombre: string
  /** Numerados en sentido antihorario: el siguiente de `a` es `(a + 1) % n`. */
  asiento: number
  equipo: Equipo
}

export type CantoTruco = 'truco' | 'retruco' | 'valeCuatro'
export type CantoEnvido = 'envido' | 'realEnvido' | 'faltaEnvido'
export type CantoFlor = 'flor' | 'contraflor' | 'contraflorAlResto'
export type Respuesta = 'quiero' | 'noQuiero'
export type ResultadoVuelta = Equipo | 'parda'

export interface Jugada {
  asiento: number
  carta: Carta
}

export interface Vuelta {
  empieza: number
  jugadas: Jugada[]
  resultado: ResultadoVuelta | null
  /** Asiento de la carta ganadora; null si fue parda o no terminó. */
  ganador: number | null
}

export interface EstadoTruco {
  /** Lo que vale la mano ahora: 1 sin cantos, 2 truco, 3 retruco, 4 vale cuatro. */
  valor: 1 | 2 | 3 | 4
  /** Equipo que aceptó el último canto; null si todavía no se cantó. */
  puedeSubir: Equipo | null
  pendiente: { nivel: 2 | 3 | 4; equipo: Equipo; asiento: number } | null
}

export interface CantoHecho<T> {
  canto: T
  asiento: number
  equipo: Equipo
}

export interface Declaracion {
  asiento: number
  /** null = "son buenas". */
  tanto: number | null
}

export interface EstadoEnvido {
  estado: 'libre' | 'pendiente' | 'declarando' | 'resuelto' | 'noQuerido' | 'anulado'
  cantos: CantoHecho<CantoEnvido>[]
  declaraciones: Declaracion[]
  /** Asientos que todavía no declararon, en orden desde el mano. */
  porDeclarar: number[]
  /** Equipo que se lleva el envido (querido o no querido). */
  ganador: Equipo | null
}

export interface FlorCantada {
  asiento: number
  equipo: Equipo
  tantoDeclarado: number
}

export interface EstadoFlor {
  estado: 'libre' | 'pendiente' | 'querida' | 'noQuerida'
  cantadas: FlorCantada[]
  /** Cadena de contraflor / contraflor al resto. */
  contra: CantoHecho<'contraflor' | 'contraflorAlResto'>[]
  noQuerida: { equipo: Equipo; puntos: number } | null
}

export interface TantoRevelado {
  asiento: number
  envido: number
  flor: number | null
}

export interface ResultadoEnfrentamiento {
  motivo: 'vueltas' | 'noQuiero' | 'mazo'
  ganador: Equipo
  puntosTruco: number
  /** Puntos de envido o flor por equipo, ya con la verificación aplicada. */
  puntosTanto: [number, number]
  /** Tantos reales que se muestran en la verificación. */
  revelados: TantoRevelado[]
  /** Equipos descubiertos mintiendo (solo modo sucio). */
  mentirosos: Equipo[]
  /**
   * Cartas sin jugar que se dan vuelta al terminar, para que se vea que el tanto era cierto:
   * las de quien cantó flor y las de quien ganó el envido querido declarando su tanto.
   * Quien no tenía cartas en la mano no figura.
   */
  mostradas: CartasMostradas[]
}

export interface CartasMostradas {
  asiento: number
  cartas: Carta[]
}

/**
 * Una mano normal tiene un solo enfrentamiento con todos los jugadores.
 * En pica-pica hay tres, uno por cada duelo 1v1, jugados en serie.
 */
export interface Enfrentamiento {
  /** Asientos en orden antihorario desde el mano del enfrentamiento. */
  participantes: number[]
  mano: number
  vueltas: Vuelta[]
  turno: number | null
  truco: EstadoTruco
  envido: EstadoEnvido
  flor: EstadoFlor
  alMazo: Equipo | null
  /** Se completa al terminar el juego de cartas; puntosTanto se fija al verificar. */
  fin: { motivo: ResultadoEnfrentamiento['motivo']; ganador: Equipo; puntosTruco: number } | null
  resultado: ResultadoEnfrentamiento | null
}

export interface TantoJugador {
  envidoReal: number
  florReal: number | null
  envidoDeclarado: number | null
  florDeclarada: number | null
}

export interface Verificacion {
  /** Equipos que todavía pueden decidir si piden ver. */
  pendientes: Equipo[]
  piden: Equipo[]
}

export interface EstadoMano {
  numero: number
  reparte: number
  mano: number
  muestra: Carta
  /** Cartas que le quedan a cada asiento. */
  cartas: Carta[][]
  cartasIniciales: Carta[][]
  tantos: TantoJugador[]
  picaPica: boolean
  enfrentamientos: Enfrentamiento[]
  actual: number
  verificacion: Verificacion | null
}

export interface EstadoPartida {
  config: ConfigSala
  semilla: number
  rng: number
  jugadores: Jugador[]
  puntos: [number, number]
  mano: EstadoMano
  ganador: Equipo | null
}

export type Accion =
  | { tipo: 'jugarCarta'; jugador: string; carta: Carta }
  | { tipo: 'cantarTruco'; jugador: string }
  | { tipo: 'cantarEnvido'; jugador: string; canto: CantoEnvido }
  /** `tanto` es el tanto declarado; en modo normal se toma el real. */
  | { tipo: 'cantarFlor'; jugador: string; canto: CantoFlor; tanto?: number }
  | { tipo: 'responder'; jugador: string; respuesta: Respuesta }
  | { tipo: 'declararTanto'; jugador: string; tanto: number | 'sonBuenas' }
  | { tipo: 'irseAlMazo'; jugador: string }
  | { tipo: 'pedirVer'; jugador: string }
  | { tipo: 'noPedirVer'; jugador: string }

export type Evento =
  | { tipo: 'manoRepartida'; numero: number; reparte: number; mano: number; muestra: Carta; picaPica: boolean }
  | { tipo: 'enfrentamientoIniciado'; indice: number; participantes: number[]; mano: number }
  | { tipo: 'cartaJugada'; asiento: number; carta: Carta }
  | { tipo: 'vueltaTerminada'; indice: number; resultado: ResultadoVuelta; ganador: number | null }
  | { tipo: 'cantoTruco'; asiento: number; canto: CantoTruco }
  | { tipo: 'cantoEnvido'; asiento: number; canto: CantoEnvido; primeroEstaElEnvido: boolean }
  | { tipo: 'cantoFlor'; asiento: number; canto: CantoFlor }
  | { tipo: 'respuesta'; asiento: number; a: 'truco' | 'envido' | 'flor'; respuesta: Respuesta }
  | { tipo: 'tantoDeclarado'; asiento: number; tanto: number | null }
  | { tipo: 'envidoResuelto'; ganador: Equipo }
  | { tipo: 'envidoAnulado' }
  | { tipo: 'alMazo'; asiento: number; equipo: Equipo }
  | { tipo: 'verificacionPendiente'; equipos: Equipo[] }
  | { tipo: 'pedirVer'; asiento: number; equipo: Equipo; pide: boolean }
  | { tipo: 'enfrentamientoTerminado'; indice: number; resultado: ResultadoEnfrentamiento }
  | { tipo: 'puntos'; puntos: [number, number] }
  | { tipo: 'partidaTerminada'; ganador: Equipo; puntos: [number, number] }

export type ResultadoApply =
  | { ok: true; estado: EstadoPartida; eventos: Evento[] }
  | { ok: false; motivo: string }
