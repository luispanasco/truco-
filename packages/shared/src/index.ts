/**
 * Mensajes entre la web y el servidor de juego. Los usan los dos lados, así un
 * cambio en el protocolo no compila hasta que ambos lo acompañan.
 */
import type { Accion, Carta, ConfigSala, Evento, Formato, VistaPartida } from '@truco/engine'
import { envidoParaSenia, type Nivel, type Senia } from '@truco/bots'
import type { IdBaraja } from './barajas'
import type { IdMesa } from './mesas'
import type { EstadoVoz, SenalVoz } from './voz'

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

/**
 * Tirar reyes antes de la primera partida de la sala: se da una carta a cada uno desde el
 * anfitrión, en sentido antihorario, sacándolas del fondo del mazo. El primer rey reparte y,
 * con equipos, los primeros 2 (2v2) o 3 (3v3) reyes forman un equipo.
 */
export type TirarReyes = 'no' | 'reparte' | 'reparteYEquipos'

export const TIRAR_REYES_DEFAULT: TirarReyes = 'no'

export function normalizarTirarReyes(op: unknown, base: TirarReyes = TIRAR_REYES_DEFAULT): TirarReyes {
  return op === 'no' || op === 'reparte' || op === 'reparteYEquipos' ? op : base
}

/**
 * Cuando el pie manda a tocar o a gritar, el compañero no canta al instante: como en la mesa,
 * pasa un rato (en ms, entre el mínimo y el máximo) hasta que lo hace.
 */
export const ESPERA_ORDEN_MS: [number, number] = [1500, 2500]

/** Jugadas vencidas seguidas por las que el servidor saca a alguien de la mesa (queda un bot). */
export const VENCIDOS_PARA_SACAR = 3

/** Si el asiento ya jugó alguna carta en la mano (sirve con el estado del motor y con la vista). */
export function yaJugoEnLaMano(mano: { enfrentamientos: { vueltas: { jugadas: { asiento: number }[] }[] }[] }, asiento: number): boolean {
  return mano.enfrentamientos.some((e) => e.vueltas.some((v) => v.jugadas.some((j) => j.asiento === asiento)))
}

/** Texto del rechazo cuando ya pasó el momento de hacer señas. */
export const MOTIVO_SENIA_TARDE = 'En esta sala las señas se hacen antes de jugar tu primera carta'

/** Texto del rechazo de una seña antes de que se repartan las cartas (mientras se corta o se reparte). */
export const MOTIVO_SENIA_TEMPRANO = 'Esperá a que se repartan las cartas'

/** Texto del rechazo de la seña de envido con flor: con flor el envido no se juega. */
export const MOTIVO_ENVIDO_CON_FLOR = 'Con flor no hay envido: marcale la flor'

/**
 * El envido que anuncia la seña de envido de `asiento`: su tanto real, con muestra y piezas,
 * como lo cuenta el motor. null si tiene flor. Lo calculan el servidor y la conexión local,
 * nunca el cliente (así nadie puede marcar un número que no tiene).
 */
export function envidoDeSenia(mano: { tantos: readonly { envidoReal: number; florReal: number | null }[] }, asiento: number): number | null {
  const t = mano.tantos[asiento]
  return t ? envidoParaSenia({ envido: t.envidoReal, flor: t.florReal }) : null
}

/** Texto del rechazo cuando la mesa se juega sin señas. */
export const MOTIVO_SIN_SENIAS = 'En esta mesa no se hacen señas'

/** Cada cuánto se le puede pedir a un compañero que repita las señas. */
export const ESPERA_PEDIR_SENIAS_MS = 10_000

/**
 * Lo que tarda en verse el reparto en la mesa (el corte, las cartas volando y la muestra que se da
 * vuelta), con un margen. Las señas de los bots les llegan a las personas recién después: si no,
 * se verían antes de que estén las cartas. Los bots igual las tienen al instante (juegan con ellas).
 */
export const ESPERA_REPARTO_MS = 2_300

// ── Cliente → servidor ──────────────────────────────────────────────

/** Opciones al entrar a cualquier sala. */
export interface OpcionesUnirse {
  /** ID de invitado guardado en el navegador. Con el mismo ID se recupera el lugar. */
  invitadoId: string
  apodo: string
  avatar?: string
  /** Fase 2: el token de la sesión (Supabase), si entró a su cuenta. Sin él, juega como invitado. */
  token?: string
  /**
   * Prueba de la tienda (fase 1): el cliente avisa que tiene la tienda desbloqueada y el
   * servidor, si lo permite (`TRUCO_TIENDA_DE_PRUEBA`), le acepta las piezas, mesas y barajas
   * pagas. En la fase 2 se apaga y solo vale lo comprado.
   */
  tiendaDesbloqueada?: boolean
  /** La mesa y la baraja que tiene elegidas: si es el anfitrión, son las de toda la sala. */
  mesa?: string
  baraja?: string
}

/** Un `puedeUsar` que deja todo: lo que se acepta con la tienda de prueba desbloqueada. */
export const TODO_PERMITIDO = (): boolean => true

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
  /** Tirar reyes para ver quién reparte (y, si se pide, para armar los equipos). */
  tirarReyes?: TirarReyes
  /** Chat de voz (solo salas privadas; prendido si no se dice nada). Con voz, lo del pie se dice hablando. */
  voz?: boolean
}

export type CanalChat = 'general' | 'equipo'

export interface MensajesCliente {
  /** Jugada. El servidor ignora `accion.jugador` y usa el de la conexión. */
  accion: { accion: Accion }
  chat: { texto: string; canal: CanalChat }
  senia: { senia: Senia }
  /** Pedirle a un compañero que te repita las señas de esta mano. Un bot las repite solo. */
  pedirSenias: { asiento: number }
  /** Volver a hacerles a tus compañeros las señas que ya les hiciste en esta mano. */
  repetirSenias: Record<string, never>
  silenciar: { asiento: number; silenciar: boolean }
  reportar: { asiento: number; motivo?: string }
  /** En la espera: cambiarse a un lugar libre (para elegir equipo). */
  elegirAsiento: { asiento: number }
  /** En la espera, solo el anfitrión: cambiar la configuración. */
  configurar: Omit<OpcionesCrearSala, keyof OpcionesUnirse>
  /**
   * En la espera: la mesa y la baraja que tiene elegidas quien lo manda. Cualquiera lo puede
   * mandar, pero solo las del anfitrión se ven en la sala.
   */
  mesaYBaraja: { mesa?: string; baraja?: string }
  /** Solo el anfitrión: empezar la partida. */
  iniciar: Record<string, never>
  /** Cola pública: aceptar jugar contra un bot en vez de esperar. */
  jugarContraBot: Record<string, never>
  /** Terminada la partida, pedir jugar otra con la misma mesa. */
  revancha: Record<string, never>
  /** Entrar o salir del chat de voz. */
  voz: { activa: boolean }
  /** Señalización de voz para otra persona (`a` es su número en la voz). */
  senalVoz: { a: number; senal: SenalVoz }
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
  tirarReyes: TirarReyes
  /** Si la sala tiene chat de voz (en la cola pública, nunca). */
  voz: boolean
  /**
   * La mesa y la baraja con las que todos ven la partida: las del anfitrión (en la cola
   * pública, que no tiene, las de siempre).
   */
  mesa: IdMesa
  baraja: IdBaraja
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

/** Un movimiento de monedas, como lo ve el jugador. */
export interface MovimientoMonedas {
  tipo: 'partida' | 'victoria' | 'bonusDiario' | 'compra' | 'ajuste'
  monto: number
}

export interface MensajesServidor {
  sala: InfoSala
  /** Fase 2, solo a quien entró con su cuenta: lo que cobró por la partida y su saldo. */
  monedas: { movimientos: MovimientoMonedas[]; saldo: number }
  /** Fase 2, en partidas entre personas con cuenta: cómo se movió tu Elo en ese formato. */
  elo: { formato: Formato; antes: number; despues: number }
  /** Lo que ve este jugador: nunca incluye cartas ajenas sin jugar. */
  vista: VistaPartida
  /** Lo que acaba de pasar en la mesa (público). */
  eventos: Evento[]
  /** A quién espera el juego y cuándo vence el turno (ms desde epoch; null si juega un bot). */
  /** `pie`: el que tiene que decirle al bot qué jugar (le toca al bot, pero se lo espera a él). */
  turno: { asientos: number[]; venceEn: number | null; pie?: number }
  chat: MensajeChat
  /**
   * Seña de un compañero, con el número de mano en que la hizo. `repetida` si la volvió a
   * hacer porque se la pidieron. Con la seña de envido, `tanto` es su envido: lo pone el
   * servidor con el tanto real (el cliente manda solo la seña).
   */
  senia: { de: number; senia: Senia; mano: number; repetida?: boolean; tanto?: number }
  /** Un compañero te pide que le repitas las señas de esta mano. */
  pidenSenias: { de: number }
  /**
   * Seña de un rival a su compañero que este jugador alcanzó a ver. `senia` es null
   * si la sala solo deja ver que se hizo una (no cuál). Si deja ver cuál y es la de
   * envido, también se ve el número (`tanto`).
   */
  seniaPescada: { de: number; senia: Senia | null; tanto?: number }
  /**
   * Se tiraron reyes. `tiradas` son las cartas que se dieron, en orden, con el asiento que
   * tenía cada uno al tirar; `equipos` (si se armaron) son esos asientos de los que sacaron rey.
   * `reparte` es el asiento que reparte, ya con los lugares nuevos. `apodos` son los de cada
   * asiento al tirar (antes de reacomodarse).
   */
  reyes: { tiradas: { asiento: number; carta: Carta }[]; reparte: number; equipos: number[] | null; apodos: string[] }
  /** Te sacaron de la mesa (por ejemplo, por dejar vencer el tiempo varias veces seguidas). */
  expulsado: { motivo: string }
  error: { motivo: string }
  /** Cola pública: hace rato que no aparece nadie. */
  ofrecerBot: Record<string, never>
  /** Quién está en el chat de voz (llega cada vez que cambia algo de la sala). */
  voz: EstadoVoz
  /** Señalización de voz que te manda otra persona (`de` es su número en la voz). */
  senalVoz: { de: number; senal: SenalVoz }
}

export type TipoMensajeCliente = keyof MensajesCliente
export type TipoMensajeServidor = keyof MensajesServidor

export { describirAccion, describirEvento, TEXTO_CANTO, TEXTO_CORTE, TEXTO_ORDEN } from './textos'
export * from './avatar'
export * from './mesas'
export * from './barajas'
export * from './reyes'
export * from './tipografias'
export * from './rarezas'
export * from './tienda'
export * from './voz'
