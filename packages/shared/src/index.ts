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

/**
 * Si un rival puede "pescar" una seña: nunca, solo ver que se hizo una (sin saber cuál),
 * o ver el gesto y lo que significa.
 */
export type PescarSenias = 'nunca' | 'gesto' | 'gestoYCarta'
/** Cuándo se pueden hacer señas: en cualquier momento o solo antes de jugar la primera carta. */
export type MomentoSenias = 'libre' | 'antesDeJugar'

export interface ConfigSenias {
  pescar: PescarSenias
  /** Probabilidad (de 0 a 1) de que cada rival vea cada seña. */
  probabilidadPescar: number
  momento: MomentoSenias
}

export const SENIAS_DEFAULT: ConfigSenias = { pescar: 'gesto', probabilidadPescar: 0.2, momento: 'libre' }

/** Completa y valida la configuración de señas (lo que no sirve queda como estaba). */
export function normalizarSenias(op: Partial<ConfigSenias> | undefined, base: ConfigSenias = SENIAS_DEFAULT): ConfigSenias {
  const pescar = op?.pescar && ['nunca', 'gesto', 'gestoYCarta'].includes(op.pescar) ? op.pescar : base.pescar
  const momento = op?.momento && ['libre', 'antesDeJugar'].includes(op.momento) ? op.momento : base.momento
  const p = op?.probabilidadPescar
  const probabilidadPescar = typeof p === 'number' && Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : base.probabilidadPescar
  return { pescar, probabilidadPescar, momento }
}

/** Si el asiento ya jugó alguna carta en la mano (sirve con el estado del motor y con la vista). */
export function yaJugoEnLaMano(mano: { enfrentamientos: { vueltas: { jugadas: { asiento: number }[] }[] }[] }, asiento: number): boolean {
  return mano.enfrentamientos.some((e) => e.vueltas.some((v) => v.jugadas.some((j) => j.asiento === asiento)))
}

/** Texto del rechazo cuando ya pasó el momento de hacer señas. */
export const MOTIVO_SENIA_TARDE = 'En esta sala las señas se hacen antes de jugar tu primera carta'

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
  senias?: Partial<ConfigSenias>
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
  /** Terminada la partida, pedir jugar otra con la misma mesa. */
  revancha: Record<string, never>
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
  senias: ConfigSenias
  /** Si el chat de equipo está habilitado en esta sala. */
  chatEquipo: boolean
  lugares: LugarPublico[]
  /** Tu asiento, o null si todavía no tenés. */
  yo: number | null
  /** Terminada la partida: asientos que ya pidieron la revancha (vacío en otra fase). */
  revancha: number[]
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
  /**
   * Seña de un rival a su compañero que este jugador alcanzó a ver. `senia` es null
   * si la sala solo deja ver que se hizo una (no cuál).
   */
  seniaPescada: { de: number; senia: Senia | null }
  error: { motivo: string }
  /** Cola pública: hace rato que no aparece nadie. */
  ofrecerBot: Record<string, never>
}

export type TipoMensajeCliente = keyof MensajesCliente
export type TipoMensajeServidor = keyof MensajesServidor

export { describirAccion, describirEvento, TEXTO_CANTO } from './textos'
