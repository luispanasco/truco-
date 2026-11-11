import type { IdDepartamento, MensajesCliente, MensajesServidor } from '@truco/shared'

export type MensajeServidor = {
  [K in keyof MensajesServidor]: { tipo: K; datos: MensajesServidor[K] }
}[keyof MensajesServidor]

/** Solo online: si hay conexión con el servidor. */
export type EstadoConexion = 'conectada' | 'reconectando' | 'caida'

/**
 * Lo que la interfaz necesita de una partida: mandar mensajes y recibirlos.
 * Hay dos versiones: online (servidor Colyseus) y local (motor y bots en el navegador).
 * Las dos hablan el mismo protocolo, así la mesa es una sola.
 */
export interface Conexion {
  readonly tipo: 'local' | 'online'
  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]): void
  /** Devuelve una función para dejar de escuchar. */
  escuchar(oyente: (m: MensajeServidor) => void): () => void
  /** Estado de la conexión (solo online). Devuelve una función para dejar de escuchar. */
  observarEstado?(oyente: (e: EstadoConexion) => void): () => void
  salir(): void
  /** Si es un nivel del modo historia: la mesa es la del lugar y, al ganar, se anota. */
  readonly historia?: NivelJugado
  /** Si es el examen del tutorial (contra la compu): al ganar, te recibís. */
  readonly examen?: boolean
}

/** Un nivel del modo historia en juego. */
export interface NivelJugado {
  departamento: IdDepartamento
  nivel: number
}
