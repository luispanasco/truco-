import type { MensajesCliente, MensajesServidor } from '@truco/shared'

export type MensajeServidor = {
  [K in keyof MensajesServidor]: { tipo: K; datos: MensajesServidor[K] }
}[keyof MensajesServidor]

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
  salir(): void
}
