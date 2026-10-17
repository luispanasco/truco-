/**
 * Chat de voz (fase 2): WebRTC en malla. Cada par de personas que activó la voz se conecta
 * directo; el servidor de juego solo reenvía la señalización (oferta, respuesta y candidatos
 * ICE) al destinatario y les pasa los servidores ICE a usar.
 */

/** Como el `RTCIceServer` del navegador (el servidor no lo tiene entre sus tipos). */
export interface ServidorIce {
  urls: string | string[]
  username?: string
  credential?: string
}

/** Por defecto, un STUN público: alcanza en la mayoría de las redes de casa y de los celulares. */
export const ICE_DEFAULT: ServidorIce[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/** Como mucho tantas personas en la voz de una sala (la malla crece al cuadrado). */
export const MAX_EN_VOZ = 6

/** Texto del rechazo cuando la sala no tiene chat de voz (apagado o cola pública). */
export const MOTIVO_SIN_VOZ = 'En esta sala no hay chat de voz'

/** Un candidato ICE como lo da `RTCIceCandidate.toJSON()`. */
export interface CandidatoIce {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
}

/** Lo que se pasan dos personas para armar su conexión de voz. */
export type SenalVoz =
  | { tipo: 'oferta'; sdp: string }
  | { tipo: 'respuesta'; sdp: string }
  /** null: ya no hay más candidatos. */
  | { tipo: 'candidato'; candidato: CandidatoIce | null }

/**
 * Quién está en la voz. El número lo pone el servidor cada vez que alguien entra (también al
 * volver después de un corte), así una conexión vieja nunca se confunde con la nueva. Entre
 * dos personas, la oferta la hace la de número más alto (la que llegó después).
 */
export interface ParticipanteVoz {
  id: number
  asiento: number
}

export interface EstadoVoz {
  /** Si la sala tiene chat de voz. */
  activa: boolean
  /** Tu número en la voz, o null si no la activaste. */
  yo: number | null
  participantes: ParticipanteVoz[]
  servidoresIce: ServidorIce[]
}
