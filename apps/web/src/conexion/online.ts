import { Client, type Room } from '@colyseus/sdk'
import { SALAS, type MensajesCliente, type MensajesServidor, type OpcionesCrearSala, type OpcionesUnirse } from '@truco/shared'
import type { Conexion, EstadoConexion, MensajeServidor } from './tipos'

/**
 * Dirección del servidor de juego. Por defecto, el mismo host de la página en el
 * puerto 2567: así, si el celular abre la web con la IP de la compu, encuentra
 * también el servidor. Se puede fijar con VITE_SERVIDOR (por ejemplo, al publicar).
 */
export function direccionServidor(): string {
  const fija = import.meta.env.VITE_SERVIDOR as string | undefined
  if (fija) return fija
  const seguro = typeof location !== 'undefined' && location.protocol === 'https:'
  const host = typeof location !== 'undefined' ? location.hostname : 'localhost'
  return `${seguro ? 'wss' : 'ws'}://${host}:2567`
}

/** La partida online en curso, para poder volver después de recargar o cerrar la app. */
export interface PartidaGuardada {
  roomId: string
  publica: boolean
  hora: number
}

const CLAVE_PARTIDA = 'truco.partidaOnline'
/** Pasado este tiempo, la partida guardada se da por perdida (el servidor cierra salas vacías). */
const VIGENCIA_PARTIDA_MS = 3 * 60 * 60 * 1000

export function leerPartidaGuardada(): PartidaGuardada | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PARTIDA) ?? 'null') as PartidaGuardada | null
    return p && Date.now() - p.hora < VIGENCIA_PARTIDA_MS ? p : null
  } catch {
    return null
  }
}

/** Olvidar la partida guardada (por ejemplo, si ya no existe o la persona no quiere volver). */
export function descartarPartidaGuardada() {
  guardarPartida(null)
}

function guardarPartida(p: PartidaGuardada | null) {
  try {
    if (p) localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(p))
    else localStorage.removeItem(CLAVE_PARTIDA)
  } catch {
    // Sin almacenamiento no se puede volver después de recargar, pero se juega igual.
  }
}

/** Mensaje entendible para los errores al entrar a una sala. */
export function motivoError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/not found|no rooms found|invalid room/i.test(m)) return 'No existe una sala con ese código.'
  if (/ya empezó/i.test(m)) return 'La partida de esa sala ya empezó.'
  if (/llena|locked|full/i.test(m)) return 'La sala está llena.'
  if (/ECONNREFUSED|Failed to fetch|NetworkError|fetch failed|timed? ?out/i.test(m)) {
    return 'No se pudo conectar con el servidor. ¿Está prendido?'
  }
  return m
}

/**
 * Partida contra el servidor Colyseus. Habla el mismo protocolo que la conexión
 * local, así que la mesa no distingue entre las dos.
 */
export class ConexionOnline implements Conexion {
  readonly tipo = 'online' as const
  private oyentes = new Set<(m: MensajeServidor) => void>()
  private oyentesEstado = new Set<(e: EstadoConexion) => void>()
  /** Lo que llegó antes de que alguien escuchara (por ejemplo, la primera `sala`). */
  private pendientes: MensajeServidor[] = []
  private estadoActual: EstadoConexion = 'conectada'
  private saliendo = false

  private constructor(
    private readonly room: Room,
    publica: boolean,
  ) {
    room.onMessage('*', (tipo: string | number, datos: unknown) => {
      const m = { tipo, datos } as MensajeServidor
      if (this.oyentes.size === 0) this.pendientes.push(m)
      else for (const o of this.oyentes) o(m)
    })
    room.onDrop(() => this.cambiarEstado('reconectando'))
    room.onReconnect(() => this.cambiarEstado('conectada'))
    room.onLeave(() => {
      if (!this.saliendo) this.cambiarEstado('caida')
    })
    guardarPartida({ roomId: room.roomId, publica, hora: Date.now() })
  }

  get roomId(): string {
    return this.room.roomId
  }

  static async crearSala(op: OpcionesCrearSala): Promise<ConexionOnline> {
    const room = await new Client(direccionServidor()).create(SALAS.privada, op)
    return new ConexionOnline(room, false)
  }

  /** Entrar a una sala privada por su código (también sirve para volver a una partida). */
  static async unirse(codigo: string, op: OpcionesUnirse): Promise<ConexionOnline> {
    const room = await new Client(direccionServidor()).joinById(codigo.trim().toUpperCase(), op)
    return new ConexionOnline(room, false)
  }

  /** Cola pública 1v1 con desconocidos. */
  static async buscarPartida(op: OpcionesUnirse): Promise<ConexionOnline> {
    const room = await new Client(direccionServidor()).joinOrCreate(SALAS.publica, op)
    return new ConexionOnline(room, true)
  }

  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]) {
    this.room.send(tipo, datos)
  }

  escuchar(oyente: (m: MensajeServidor) => void) {
    this.oyentes.add(oyente)
    const pendientes = this.pendientes
    this.pendientes = []
    for (const m of pendientes) oyente(m)
    return () => void this.oyentes.delete(oyente)
  }

  observarEstado(oyente: (e: EstadoConexion) => void) {
    this.oyentesEstado.add(oyente)
    oyente(this.estadoActual)
    return () => void this.oyentesEstado.delete(oyente)
  }

  /** Salir a propósito: el lugar queda para un bot y ya no se ofrece volver. */
  salir() {
    this.saliendo = true
    guardarPartida(null)
    this.oyentes.clear()
    this.oyentesEstado.clear()
    void this.room.leave(true).catch(() => {})
  }

  private cambiarEstado(e: EstadoConexion) {
    this.estadoActual = e
    for (const o of this.oyentesEstado) o(e)
  }
}

export type { MensajesServidor }
