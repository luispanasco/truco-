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
  /** false: en esta mesa no se hacen señas (ni las personas ni los bots). */
  habilitadas: boolean
  pescar: PescarSenias
  /** Probabilidad (de 0 a 1) de que cada rival vea cada seña. */
  probabilidadPescar: number
  momento: MomentoSenias
}

export const SENIAS_DEFAULT: ConfigSenias = { habilitadas: true, pescar: 'gesto', probabilidadPescar: 0.2, momento: 'libre' }

/** Completa y valida la configuración de señas (lo que no sirve queda como estaba). */
export function normalizarSenias(op: Partial<ConfigSenias> | undefined, base: ConfigSenias = SENIAS_DEFAULT): ConfigSenias {
  const habilitadas = typeof op?.habilitadas === 'boolean' ? op.habilitadas : base.habilitadas
  const pescar = op?.pescar && ['nunca', 'gesto', 'gestoYCarta'].includes(op.pescar) ? op.pescar : base.pescar
  const momento = op?.momento && ['libre', 'antesDeJugar'].includes(op.momento) ? op.momento : base.momento
  const p = op?.probabilidadPescar
  const probabilidadPescar = typeof p === 'number' && Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : base.probabilidadPescar
  return { habilitadas, pescar, probabilidadPescar, momento }
}

/**
 * Tiempos de la sala, en segundos. La primera jugada de cada mano (la del mano, antes de
 * que pase nada) tiene más tiempo, para ojear las cartas y hacer señas con calma.
 */
export interface ConfigTiempos {
  /** Tiempo para cada jugada, respuesta a un canto o declaración. */
  turnoS: number
  /** Tiempo del mano para su primera jugada de la mano (en pica-pica, la de cada duelo). */
  primeraJugadaS: number
}

export const TIEMPOS_SALA_DEFAULT: ConfigTiempos = { turnoS: 30, primeraJugadaS: 60 }

/** Límites que acepta el servidor (la web ofrece algunos valores dentro de estos). */
export const LIMITES_TIEMPOS = {
  turnoS: { min: 15, max: 120 },
  primeraJugadaS: { min: 30, max: 180 },
} as const

/** Completa y valida los tiempos: lo que no es número queda como estaba y lo fuera de rango se lleva al límite. */
export function normalizarTiempos(op: Partial<ConfigTiempos> | undefined, base: ConfigTiempos = TIEMPOS_SALA_DEFAULT): ConfigTiempos {
  const ajustar = (x: unknown, b: number, { min, max }: { min: number; max: number }) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : b
  return {
    turnoS: ajustar(op?.turnoS, base.turnoS, LIMITES_TIEMPOS.turnoS),
    primeraJugadaS: ajustar(op?.primeraJugadaS, base.primeraJugadaS, LIMITES_TIEMPOS.primeraJugadaS),
  }
}

/**
 * Qué pasa con las cartas jugadas: quedan en la mesa toda la mano (como en la vida real) o
 * se levantan al cerrar cada vuelta, para que la mesa no quede tan cargada. Es solo visual,
 * pero la elige la sala para que todos vean lo mismo.
 */
export type CartasJugadas = 'quedan' | 'seLevantan'

export const CARTAS_JUGADAS_DEFAULT: CartasJugadas = 'quedan'

/** Valida la opción de las cartas jugadas (lo que no sirve queda como estaba). */
export function normalizarCartasJugadas(op: unknown, base: CartasJugadas = CARTAS_JUGADAS_DEFAULT): CartasJugadas {
  return op === 'quedan' || op === 'seLevantan' ? op : base
}

/** Si el asiento ya jugó alguna carta en la mano (sirve con el estado del motor y con la vista). */
export function yaJugoEnLaMano(mano: { enfrentamientos: { vueltas: { jugadas: { asiento: number }[] }[] }[] }, asiento: number): boolean {
  return mano.enfrentamientos.some((e) => e.vueltas.some((v) => v.jugadas.some((j) => j.asiento === asiento)))
}

/** Texto del rechazo cuando ya pasó el momento de hacer señas. */
export const MOTIVO_SENIA_TARDE = 'En esta sala las señas se hacen antes de jugar tu primera carta'

/** Texto del rechazo cuando la mesa se juega sin señas. */
export const MOTIVO_SIN_SENIAS = 'En esta mesa no se hacen señas'

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
  /** Segundos por jugada y para la primera jugada del mano. */
  tiempos?: Partial<ConfigTiempos>
  /** Si las cartas jugadas quedan en la mesa o se levantan en cada vuelta. */
  cartasJugadas?: CartasJugadas
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
  tiempos: ConfigTiempos
  cartasJugadas: CartasJugadas
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
export * from './avatar'
