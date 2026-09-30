/**
 * Mensajes entre la web y el servidor de juego. Los usan los dos lados, así un
 * cambio en el protocolo no compila hasta que ambos lo acompañan.
 */
import type { Accion, ConfigSala, Evento, Formato, VistaPartida } from '@truco/engine'
import type { Nivel, Senia } from '@truco/bots'

/** Nombres de las salas registradas en el servidor. */
export const SALAS = {
  /** Sala privada: se entra con su código de 5 caracteres. */
  privada: 'privada',
  /** Cola pública 1v1 con desconocidos. */
  publica: 'publica',
} as const

/** Caracteres de los códigos de sala: sin O/0 ni I/1/L para no confundirse. */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const LARGO_CODIGO = 5

export const LIMITES = {
  largoChat: 200,
  largoApodo: 20,
} as const

// ── Cliente → servidor ──────────────────────────────────────────────

/** Opciones al entrar a cualquier sala. */
export interface OpcionesUnirse {
  /** ID de invitado guardado en el navegador. Con el mismo ID se recupera el lugar. */
  invitadoId: string
  apodo: string
  avatar?: string
}

/** Opciones al crear una sala privada. */
export interface OpcionesCrearSala extends OpcionesUnirse {
  config?: Partial<ConfigSala>
  /** Completar con bots los lugares vacíos al empezar. */
  botsEnVacios?: boolean
  nivelBots?: Nivel
  /** Ayudas para principiantes. */
  ayudas?: boolean
}

export type CanalChat = 'general' | 'equipo'

export interface MensajesCliente {
  /** Jugada. El servidor ignora `accion.jugador` y usa el de la conexión. */
  accion: { accion: Accion }
  chat: { texto: string; canal: CanalChat }
  senia: { senia: Senia }
  silenciar: { asiento: number; silenciar: boolean }
  reportar: { asiento: number; motivo?: string }
  /** En la espera: cambiarse a un lugar libre (para elegir equipo). */
  elegirAsiento: { asiento: number }
  /** En la espera, solo el anfitrión: cambiar la configuración. */
  configurar: Omit<OpcionesCrearSala, keyof OpcionesUnirse>
  /** Solo el anfitrión: empezar la partida. */
  iniciar: Record<string, never>
  /** Cola pública: aceptar jugar contra un bot en vez de esperar. */
  jugarContraBot: Record<string, never>
}

// ── Servidor → cliente ──────────────────────────────────────────────

export type FaseSala = 'esperando' | 'jugando' | 'terminada'

export interface LugarPublico {
  asiento: number
  tipo: 'libre' | 'humano' | 'bot'
  apodo: string
  avatar: string | null
  /** false si es un humano desconectado (mientras tanto juega un bot por él). */
  conectado: boolean
  anfitrion: boolean
}

export interface InfoSala {
  /** Código para compartir; null en la cola pública. */
  codigo: string | null
  publica: boolean
  fase: FaseSala
  formato: Formato
  config: ConfigSala
  botsEnVacios: boolean
  nivelBots: Nivel
  ayudas: boolean
  /** Si el chat de equipo está habilitado en esta sala. */
  chatEquipo: boolean
  lugares: LugarPublico[]
  /** Tu asiento, o null si todavía no tenés. */
  yo: number | null
}

export interface MensajeChat {
  de: number
  apodo: string
  texto: string
  canal: CanalChat
  hora: number
}

export interface MensajesServidor {
  sala: InfoSala
  /** Lo que ve este jugador: nunca incluye cartas ajenas sin jugar. */
  vista: VistaPartida
  /** Lo que acaba de pasar en la mesa (público). */
  eventos: Evento[]
  /** A quién espera el juego y cuándo vence el turno (ms desde epoch; null si juega un bot). */
  turno: { asientos: number[]; venceEn: number | null }
  chat: MensajeChat
  /** Seña de un compañero. */
  senia: { de: number; senia: Senia }
  error: { motivo: string }
  /** Cola pública: hace rato que no aparece nadie. */
  ofrecerBot: Record<string, never>
}

export type TipoMensajeCliente = keyof MensajesCliente
export type TipoMensajeServidor = keyof MensajesServidor
