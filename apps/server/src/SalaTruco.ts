import { randomInt } from 'node:crypto'
import { matchMaker, Room, type Client } from 'colyseus'
import {
  apply,
  barajar,
  cantidadJugadores,
  crearBaraja,
  crearConfig,
  crearPartida,
  enfrentamientoActual,
  equipoDe,
  esperandoA,
  eventosPara,
  LARGOS_PARTIDA,
  liderDe,
  vistaPara,
  type Accion,
  type ConfigSala,
  type EstadoPartida,
  type Evento,
} from '@truco/engine'
import { crearBot, NIVELES_BOT, SENIAS, type Bot, type Nivel, type Senia, type SeniasRecibidas, type Sugerencia } from '@truco/bots'
import {
  avatarAlAzar,
  BARAJA_DEFAULT,
  codificarAvatar,
  MESA_DEFAULT,
  normalizarBaraja,
  normalizarMesa,
  TODO_PERMITIDO,
  LIMITES,
  normalizarAvatar,
  ESPERA_PEDIR_SENIAS_MS,
  MOTIVO_SENIA_TARDE,
  MOTIVO_SIN_SENIAS,
  SENIAS_DEFAULT,
  normalizarSenias,
  normalizarTiempos,
  normalizarCartasJugadas,
  normalizarTirarReyes,
  planReyes,
  tirarReyes,
  CARTAS_JUGADAS_DEFAULT,
  TIRAR_REYES_DEFAULT,
  VENCIDOS_PARA_SACAR,
  ESPERA_ORDEN_MS,
  TIEMPOS_SALA_DEFAULT,
  yaJugoEnLaMano,
  type CanalChat,
  type ConfigSenias,
  type ConfigTiempos,
  type CartasJugadas,
  type FaseSala,
  type IdBaraja,
  type IdMesa,
  type InfoSala,
  type MensajeChat,
  type MensajesCliente,
  type MensajesServidor,
  type OpcionesCrearSala,
  type OpcionesUnirse,
  type TirarReyes,
} from '@truco/shared'
import { LimiteFrecuencia, filtrarTexto, prepararMensaje } from './chat'
import { generarCodigoUnico } from './codigos'
import { Archivo, type RegistroPartida } from './registro'
import type { Cuentas } from './cuentas/api'
import type { Usuario } from './cuentas/auth'

export interface Tiempos {
  /**
   * Tiempo para jugar fijo para todas las salas (tests y `TRUCO_TURNO_MS`); al vencer juega
   * un bot por el jugador. Con null (lo normal) vale el de cada sala (`ConfigTiempos`).
   * Fijado, pisa también la primera jugada del mano, salvo que se fije `primeraJugadaMs`:
   * así los tests que ya fijaban el turno siguen midiendo lo mismo.
   */
  turnoMs: number | null
  /** Tiempo fijo para la primera jugada del mano; null: el de la sala (o `turnoMs` si está fijado). */
  primeraJugadaMs: number | null
  /**
   * Cuántos ms dura cada segundo de los tiempos de la sala: 1000 de verdad; en los tests,
   * menos, para medir la configuración de la sala sin esperar minutos.
   */
  msPorSegundo: number
  /** Demora al azar antes de que juegue un bot. */
  botMinMs: number
  botMaxMs: number
  /** Sin humanos conectados, la sala se cierra después de este tiempo. */
  cierreSinHumanosMs: number
  /** Cola pública: a los cuántos ms de esperar solo se ofrece jugar contra un bot. */
  ofrecerBotMs: number
  /** Ventana para reconectarse a la misma sesión tras un corte. */
  reconexionS: number
  /** Espera extra al cerrar una vuelta y al terminar una mano, para que se vea el resultado. */
  pausaVueltaMs: number
  pausaManoMs: number
  /** Lo que tarda un bot en cumplir una orden del pie (ver `ESPERA_ORDEN_MS`). */
  esperaOrdenMs: [number, number]
}

export const TIEMPOS_DEFAULT: Tiempos = {
  turnoMs: null,
  primeraJugadaMs: null,
  msPorSegundo: 1_000,
  botMinMs: 1_000,
  botMaxMs: 1_800,
  cierreSinHumanosMs: 120_000,
  ofrecerBotMs: 30_000,
  reconexionS: 20,
  pausaVueltaMs: 3_000,
  pausaManoMs: 5_000,
  esperaOrdenMs: ESPERA_ORDEN_MS,
}

/** Nivel del bot que juega por un humano desconectado o que se quedó sin tiempo. */
const NIVEL_REEMPLAZO: Nivel = 'medio'
const NIVELES: Nivel[] = NIVELES_BOT

interface Lugar {
  asiento: number
  tipo: 'libre' | 'humano' | 'bot'
  invitadoId: string | null
  /** La cuenta con la que entró (fase 2), o null si juega como invitado. */
  cuentaId: string | null
  apodo: string
  avatar: string | null
  sessionId: string | null
  conectado: boolean
  /** La mesa y la baraja que tiene elegidas (ya validadas): las del anfitrión son las de la sala. */
  mesa: IdMesa
  baraja: IdBaraja
  /** Si se le aceptan cosas pagas (tienda de prueba prendida y desbloqueada en su navegador). */
  tienda: boolean
}

interface DatosCliente {
  asiento: number
}

const idJugador = (asiento: number) => `j${asiento}`

/**
 * Tope de conexiones de la sala. Es el doble de los lugares porque quien recarga la
 * página entra con una conexión nueva mientras la vieja sigue esperando reconectarse:
 * con el tope justo, Colyseus la rechazaría por sala llena antes de que `onJoin` la
 * reconozca por su ID de invitado. Quién se sienta lo controla `onJoin`.
 */
const margenConexiones = (lugares: number) => lugares * 2

function lugarLibre(asiento: number): Lugar {
  return {
    asiento,
    tipo: 'libre',
    invitadoId: null,
    cuentaId: null,
    apodo: '',
    avatar: null,
    sessionId: null,
    conectado: false,
    mesa: MESA_DEFAULT,
    baraja: BARAJA_DEFAULT,
    tienda: false,
  }
}

function texto(x: unknown, max: number): string | null {
  if (typeof x !== 'string') return null
  const t = x.trim().slice(0, max)
  return t.length > 0 ? t : null
}

/** Rechazo de una operación con un motivo para el jugador. */
class Rechazo extends Error {}

/**
 * Una partida. El estado del juego nunca se sincroniza entero: cada jugador recibe
 * solo su vista por mensaje. El servidor valida todo con el motor.
 */
export class SalaTruco extends Room {
  /** Los reemplaza la subclase que arma `crearServidor`. */
  tiempos: Tiempos = TIEMPOS_DEFAULT
  archivo: Archivo | null = null
  publica = false
  /**
   * Fase 1, para probar: si el cliente avisa que desbloqueó la tienda, se le acepta todo lo pago
   * (`TRUCO_TIENDA_DE_PRUEBA`). En la fase 2 se apaga y solo vale lo que compró cada uno.
   */
  tiendaDePrueba = false
  /** Cuentas (fase 2): si está, quien manda un token de sesión entra con su cuenta. */
  cuentas: Cuentas | null = null

  override maxMessagesPerSecond = 30

  private codigo: string | null = null
  private fase: FaseSala = 'esperando'
  private config: ConfigSala = crearConfig()
  private botsEnVacios = true
  private nivelBots: Nivel = 'medio'
  private ayudas = true
  private configSenias: ConfigSenias = SENIAS_DEFAULT
  private configTiempos: ConfigTiempos = TIEMPOS_SALA_DEFAULT
  private cartasJugadas: CartasJugadas = CARTAS_JUGADAS_DEFAULT
  private tirarReyes: TirarReyes = TIRAR_REYES_DEFAULT
  private lugares: Lugar[] = []
  private anfitrion: string | null = null

  private estado: EstadoPartida | null = null
  private bots: (Bot | null)[] = []
  private reemplazos: Bot[] = []
  private senias: SeniasRecibidas[] = []
  /** Mano en curso y si ya se cortó: las señas de los bots se hacen recién con las cartas en la mano. */
  private claveMano = ''
  /** Por equipo: la última sugerencia del pie, válida en la vuelta en que la dijo. */
  private sugerencias: ({ sugerencia: Sugerencia; vuelta: string } | null)[] = [null, null]
  /** Si la última tirada de reyes cambió a alguien de lugar (la mesa anima el cambio). */
  private reacomodados = false
  /** Por asiento: jugadas seguidas que se le vencieron. */
  private vencidos = new Map<number, number>()
  private registro: RegistroPartida | null = null
  private inicioMs = 0
  /** Quién repartió la primera mano de la partida actual; en la revancha reparte el siguiente. */
  private reparteInicial: number | null = null
  /** Terminada la partida: asientos que pidieron la revancha. */
  private pedidosRevancha = new Set<number>()

  private version = 0
  private timerJuego: NodeJS.Timeout | null = null
  private timerCierre: NodeJS.Timeout | null = null
  private timerOfrecer: NodeJS.Timeout | null = null

  private limitesAccion = new Map<string, LimiteFrecuencia>()
  private limitesChat = new Map<string, LimiteFrecuencia>()
  private limitesPedirSenias = new Map<string, LimiteFrecuencia>()
  /** Por invitado: asientos que silenció. */
  private silenciados = new Map<string, Set<number>>()
  private historialChat: MensajeChat[] = []

  // ── Ciclo de vida ────────────────────────────────────────────────

  override async onCreate(opciones: OpcionesCrearSala = {} as OpcionesCrearSala) {
    this.autoDispose = false
    if (this.publica) {
      this.config = crearConfig({ formato: '1v1' })
      this.ayudas = false
      this.nivelBots = NIVEL_REEMPLAZO
    } else {
      this.aplicarConfiguracion(opciones)
      this.codigo = await generarCodigoUnico(async (c) => (await matchMaker.getRoomById(c)) !== undefined)
      this.roomId = this.codigo
      await this.setPrivate(true)
    }
    this.lugares = Array.from({ length: cantidadJugadores(this.config.formato) }, (_, a) => lugarLibre(a))
    this.maxClients = margenConexiones(this.lugares.length)
    this.registrarMensajes()
    this.revisarCierre()
  }

  /** Con un token de sesión, se verifica la cuenta; sin token se entra como invitado. */
  override async onAuth(_client: Client, opciones: OpcionesUnirse): Promise<Usuario | true> {
    const token = typeof opciones?.token === 'string' ? opciones.token : null
    if (!token || !this.cuentas) return true
    const usuario = await this.cuentas.verificar(token)
    if (!usuario) throw new Error('La sesión venció: volvé a entrar a tu cuenta')
    return usuario
  }

  override onJoin(client: Client, opciones: OpcionesUnirse) {
    const cuentaId = typeof client.auth === 'object' && client.auth ? (client.auth as Usuario).id : null
    const invitadoId = texto(opciones?.invitadoId, 64)
    const apodo = texto(opciones?.apodo, LIMITES.largoApodo)
    if (!invitadoId || invitadoId.length < 8) throw new Error('Falta el ID de invitado')
    if (!apodo) throw new Error('Falta el apodo')

    // Con cuenta, el lugar se recupera también desde otro dispositivo.
    let lugar = this.lugares.find((l) => l.invitadoId === invitadoId || (cuentaId !== null && l.cuentaId === cuentaId))
    if (lugar) {
      // Vuelve alguien que ya tenía lugar (otra pestaña o reconexión tardía).
      const anterior = lugar.sessionId ? this.clients.get(lugar.sessionId) : undefined
      if (anterior && anterior !== client) anterior.leave()
    } else {
      if (this.fase !== 'esperando') throw new Error('La partida ya empezó')
      lugar = this.lugares.find((l) => l.tipo === 'libre')
      if (!lugar) throw new Error('La sala está llena')
      lugar.tipo = 'humano'
      lugar.invitadoId = invitadoId
    }
    lugar.cuentaId = cuentaId
    lugar.apodo = filtrarTexto(apodo)
    lugar.tienda = this.tiendaDePrueba && opciones?.tiendaDesbloqueada === true
    // Un avatar inválido o con piezas que no tiene se reemplaza por uno armado desde el apodo.
    lugar.avatar =
      normalizarAvatar(opciones?.avatar, lugar.tienda ? TODO_PERMITIDO : undefined) ?? codificarAvatar(avatarAlAzar(lugar.apodo))
    this.elegirMesaYBaraja(lugar, opciones ?? {})
    lugar.sessionId = client.sessionId
    lugar.conectado = true
    client.userData = { asiento: lugar.asiento } satisfies DatosCliente
    this.anfitrion ??= invitadoId

    this.revisarCierre()
    this.enviarSala()
    if (this.estado) {
      this.enviar(client, 'vista', vistaPara(this.estado, idJugador(lugar.asiento)))
      this.programar()
    }
    if (this.publica && this.fase === 'esperando') this.revisarColaPublica()
  }

  override onDrop(client: Client) {
    const lugar = this.lugarDe(client)
    if (lugar) {
      lugar.conectado = false
      this.alCambiarConexion()
    }
    this.allowReconnection(client, this.tiempos.reconexionS)
  }

  override onReconnect(client: Client) {
    const lugar = this.lugarDe(client)
    if (!lugar) return
    lugar.conectado = true
    this.enviar(client, 'sala', this.infoSala(lugar.asiento))
    if (this.estado) this.enviar(client, 'vista', vistaPara(this.estado, idJugador(lugar.asiento)))
    this.alCambiarConexion()
  }

  override onLeave(client: Client) {
    const lugar = this.lugarDe(client)
    if (!lugar) return
    if (this.fase === 'esperando') {
      // Antes de empezar, irse libera el lugar.
      const eraAnfitrion = lugar.invitadoId === this.anfitrion
      this.lugares[lugar.asiento] = lugarLibre(lugar.asiento)
      if (eraAnfitrion) this.anfitrion = this.lugares.find((l) => l.tipo === 'humano')?.invitadoId ?? null
      this.limpiarTimer('timerOfrecer')
    } else {
      // Con la partida en curso, el lugar queda guardado y juega un bot hasta que vuelva.
      // Terminada, el lugar también queda (si hay revancha, juega su reemplazo), pero
      // su pedido de revancha ya no cuenta.
      lugar.sessionId = null
      lugar.conectado = false
      this.pedidosRevancha.delete(lugar.asiento)
    }
    this.alCambiarConexion()
  }

  override onDispose() {
    this.limpiarTimer('timerJuego')
    this.limpiarTimer('timerCierre')
    this.limpiarTimer('timerOfrecer')
    if (this.registro && !this.registro.resultado) {
      this.registro.resultado = { abandonada: true }
      this.guardarRegistro()
    }
  }

  // ── Mensajes ─────────────────────────────────────────────────────

  private registrarMensajes() {
    const manejar = <K extends keyof MensajesCliente>(
      tipo: K,
      fn: (client: Client, asiento: number, datos: MensajesCliente[K]) => void,
    ) => {
      this.onMessage(tipo, (client: Client, datos: MensajesCliente[K]) => {
        const lugar = this.lugarDe(client)
        if (!lugar) return
        try {
          fn(client, lugar.asiento, datos ?? ({} as MensajesCliente[K]))
        } catch (e) {
          if (e instanceof Rechazo) this.enviar(client, 'error', { motivo: e.message })
          else throw e
        }
      })
    }

    manejar('accion', (client, asiento, { accion }) => {
      if (!this.limite(this.limitesAccion, client, 10, 1000)) throw new Rechazo('Demasiadas acciones seguidas')
      if (this.fase !== 'jugando' || !this.estado) throw new Rechazo('La partida no está en juego')
      if (!accion || typeof accion !== 'object' || typeof accion.tipo !== 'string') throw new Rechazo('Acción inválida')
      const motivo = this.aplicar(asiento, accion, false)
      if (motivo) throw new Rechazo(motivo)
    })

    manejar('chat', (client, asiento, { texto: t, canal }) => {
      if (!this.limite(this.limitesChat, client, 3, 5000)) throw new Rechazo('Esperá un poco antes de mandar otro mensaje')
      const limpio = prepararMensaje(t)
      if (!limpio) return
      const c: CanalChat = canal === 'equipo' ? 'equipo' : 'general'
      if (c === 'equipo' && !this.chatEquipo()) throw new Rechazo('En esta sala no hay chat de equipo')
      const mensaje: MensajeChat = { de: asiento, apodo: this.lugares[asiento]!.apodo, texto: limpio, canal: c, hora: Date.now() }
      this.historialChat = [...this.historialChat.slice(-99), mensaje]
      for (const l of this.lugares) {
        if (l.tipo !== 'humano' || !l.conectado) continue
        if (c === 'equipo' && l.asiento % 2 !== asiento % 2) continue
        if (l.asiento !== asiento && this.silenciados.get(l.invitadoId!)?.has(asiento)) continue
        this.enviarA(l.asiento, 'chat', mensaje)
      }
    })

    manejar('senia', (client, asiento, { senia }) => {
      if (!this.limite(this.limitesAccion, client, 10, 1000)) throw new Rechazo('Demasiadas acciones seguidas')
      if (!(SENIAS as readonly string[]).includes(senia)) throw new Rechazo('Seña inválida')
      if (!this.configSenias.habilitadas) throw new Rechazo(MOTIVO_SIN_SENIAS)
      if (!this.hayCompanieros()) throw new Rechazo('Ahora no hay compañeros a quien hacerle señas')
      if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado!.mano, asiento)) {
        throw new Rechazo(MOTIVO_SENIA_TARDE)
      }
      this.entregarSenias(asiento, [senia])
    })

    manejar('pedirSenias', (client, asiento, { asiento: otro }) => {
      if (!this.configSenias.habilitadas) throw new Rechazo(MOTIVO_SIN_SENIAS)
      if (!this.hayCompanieros()) throw new Rechazo('Ahora no hay compañeros a quien pedirle señas')
      const comp = Number(otro)
      if (!this.companierosDe(asiento).includes(comp)) throw new Rechazo('Solo le podés pedir señas a un compañero')
      const apodo = this.lugares[comp]!.apodo
      if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado!.mano, comp)) {
        throw new Rechazo(`${apodo} ya jugó su carta: en esta sala las señas se hacen antes`)
      }
      // De a un pedido cada tanto a cada compañero (en 3v3 se le puede pedir al otro).
      const clave = `${client.sessionId}:${comp}`
      let limite = this.limitesPedirSenias.get(clave)
      if (!limite) this.limitesPedirSenias.set(clave, (limite = new LimiteFrecuencia(1, ESPERA_PEDIR_SENIAS_MS)))
      if (!limite.permitir()) throw new Rechazo('Esperá un poco antes de volver a pedirle')
      if (this.humanoConectado(comp)) {
        this.enviarA(comp, 'pidenSenias', { de: asiento })
        return
      }
      // Un bot (o el que juega por quien no está) repite enseguida lo que ya marcó.
      const hechas = this.senias[asiento]![comp] ?? []
      if (hechas.length === 0) throw new Rechazo(`${apodo} no tiene señas para hacerte`)
      this.entregarSenias(comp, hechas, true)
    })

    manejar('repetirSenias', (client, asiento) => {
      if (!this.limite(this.limitesAccion, client, 10, 1000)) throw new Rechazo('Demasiadas acciones seguidas')
      if (!this.configSenias.habilitadas) throw new Rechazo(MOTIVO_SIN_SENIAS)
      if (!this.hayCompanieros()) throw new Rechazo('Ahora no hay compañeros a quien hacerle señas')
      if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado!.mano, asiento)) {
        throw new Rechazo(MOTIVO_SENIA_TARDE)
      }
      // Las que ya hizo en esta mano: las tiene anotadas cualquiera de sus compañeros.
      const comp = this.companierosDe(asiento)[0]
      const hechas = comp === undefined ? [] : (this.senias[comp]![asiento] ?? [])
      if (hechas.length === 0) throw new Rechazo('Todavía no hiciste señas en esta mano')
      this.entregarSenias(asiento, hechas, true)
    })

    manejar('sugerir', (client, asiento, { sugerencia }) => {
      if (!this.limite(this.limitesAccion, client, 10, 1000)) throw new Rechazo('Demasiadas acciones seguidas')
      if (this.fase !== 'jugando' || !this.estado) throw new Rechazo('La partida no está en juego')
      const e = enfrentamientoActual(this.estado)
      const equipo = equipoDe(asiento)
      if (liderDe(this.estado, e, equipo) !== asiento) throw new Rechazo('Sugiere el pie')
      const valida: Sugerencia | null =
        sugerencia?.tipo === 'veni'
          ? { tipo: 'veni' }
          : sugerencia?.tipo === 'vamosA' &&
              e.participantes.includes(Number(sugerencia.asiento)) &&
              Number(sugerencia.asiento) !== asiento &&
              equipoDe(Number(sugerencia.asiento)) === equipo
            ? { tipo: 'vamosA', asiento: Number(sugerencia.asiento) }
            : null
      if (!valida) throw new Rechazo('Sugerencia inválida')
      this.sugerencias[equipo] = { sugerencia: valida, vuelta: this.claveVuelta() }
      // Se dice en voz alta: la oyen todos.
      for (const l of this.lugares) {
        if (this.humanoConectado(l.asiento)) this.enviarA(l.asiento, 'sugerencia', { de: asiento, sugerencia: valida })
      }
    })

    manejar('silenciar', (_client, asiento, { asiento: otro, silenciar }) => {
      const inv = this.lugares[asiento]!.invitadoId!
      const set = this.silenciados.get(inv) ?? new Set<number>()
      if (silenciar) set.add(Number(otro))
      else set.delete(Number(otro))
      this.silenciados.set(inv, set)
    })

    manejar('reportar', (_client, asiento, { asiento: otro, motivo }) => {
      const reportado = this.lugares[Number(otro)]
      if (!reportado || reportado.tipo !== 'humano') throw new Rechazo('Solo se puede reportar a una persona')
      void this.archivo?.guardarReporte({
        sala: this.roomId,
        hora: new Date().toISOString(),
        de: { asiento, invitadoId: this.lugares[asiento]!.invitadoId },
        a: { asiento: reportado.asiento, invitadoId: reportado.invitadoId, apodo: reportado.apodo },
        motivo: typeof motivo === 'string' ? motivo.slice(0, 500) : '',
        mensajes: this.historialChat.filter((m) => m.de === reportado.asiento).slice(-20),
      })
    })

    manejar('elegirAsiento', (_client, asiento, { asiento: destino }) => {
      if (this.fase !== 'esperando') throw new Rechazo('La partida ya empezó')
      const nuevo = this.lugares[Number(destino)]
      if (!nuevo || nuevo.tipo !== 'libre') throw new Rechazo('Ese lugar no está libre')
      this.lugares[nuevo.asiento] = { ...this.lugares[asiento]!, asiento: nuevo.asiento }
      this.lugares[asiento] = lugarLibre(asiento)
      const client = this.clients.get(this.lugares[nuevo.asiento]!.sessionId!)
      if (client) client.userData = { asiento: nuevo.asiento } satisfies DatosCliente
      this.enviarSala()
    })

    manejar('configurar', (_client, asiento, opciones) => {
      this.exigirAnfitrion(asiento)
      if (this.publica) throw new Rechazo('La sala pública no se configura')
      if (this.fase !== 'esperando') throw new Rechazo('La partida ya empezó')
      const antes = this.config.formato
      this.aplicarConfiguracion(opciones)
      if (this.config.formato !== antes) this.cambiarCantidadDeLugares()
      this.enviarSala()
    })

    manejar('mesaYBaraja', (_client, asiento, datos) => {
      if (this.fase !== 'esperando') throw new Rechazo('La partida ya empezó')
      this.elegirMesaYBaraja(this.lugares[asiento]!, datos)
      this.enviarSala()
    })

    manejar('iniciar', (_client, asiento) => {
      this.exigirAnfitrion(asiento)
      if (this.fase !== 'esperando') throw new Rechazo('La partida ya empezó')
      this.iniciar()
    })

    manejar('jugarContraBot', () => {
      if (!this.publica || this.fase !== 'esperando') throw new Rechazo('Ahora no se puede')
      this.iniciar(true)
    })

    manejar('revancha', (_client, asiento) => {
      if (this.fase !== 'terminada') throw new Rechazo('La partida no terminó')
      if (this.pedidosRevancha.has(asiento)) return
      this.pedidosRevancha.add(asiento)
      if (!this.revisarRevancha()) this.enviarSala()
    })
  }

  // ── Configuración y espera ───────────────────────────────────────

  private aplicarConfiguracion(op: Partial<OpcionesCrearSala>) {
    // El modo sucio se habilita recién en la fase 3. Las malas y el tramo del pica-pica salen del largo.
    const { puntosMalas: _malas, tramoPicaPica: _tramo, ...pedido } = { ...this.config, ...(op.config ?? {}) }
    const puntosPartida = (LARGOS_PARTIDA as readonly number[]).includes(pedido.puntosPartida) ? pedido.puntosPartida : 30
    this.config = crearConfig({
      ...pedido,
      puntosPartida,
      toquesYGritos: pedido.toquesYGritos === 'pie' ? 'pie' : 'cualquiera',
      corte: pedido.corte === true,
      modoSucio: false,
    })
    if (!['1v1', '2v2', '3v3'].includes(this.config.formato)) throw new Rechazo('Formato inválido')
    if (typeof op.botsEnVacios === 'boolean') this.botsEnVacios = op.botsEnVacios
    if (op.nivelBots && NIVELES.includes(op.nivelBots)) this.nivelBots = op.nivelBots
    if (typeof op.ayudas === 'boolean') this.ayudas = op.ayudas
    if (op.senias && typeof op.senias === 'object') this.configSenias = normalizarSenias(op.senias, this.configSenias)
    if (op.tiempos && typeof op.tiempos === 'object') this.configTiempos = normalizarTiempos(op.tiempos, this.configTiempos)
    this.cartasJugadas = normalizarCartasJugadas(op.cartasJugadas, this.cartasJugadas)
    this.tirarReyes = normalizarTirarReyes(op.tirarReyes, this.tirarReyes)
  }

  /**
   * Lo que no existe o no puede usar vuelve a lo de siempre (boliche y la baraja propia); lo que
   * no manda queda como estaba.
   */
  private elegirMesaYBaraja(lugar: Lugar, op: { mesa?: unknown; baraja?: unknown }) {
    const puede = lugar.tienda ? TODO_PERMITIDO : undefined
    if (op.mesa !== undefined) lugar.mesa = normalizarMesa(op.mesa, puede)
    if (op.baraja !== undefined) lugar.baraja = normalizarBaraja(op.baraja, puede)
  }

  /** El anfitrión pone la mesa y la baraja; la cola pública no tiene, así que van las de siempre. */
  private delAnfitrion(): Lugar | undefined {
    if (this.publica) return undefined
    return this.lugares.find((l) => l.invitadoId !== null && l.invitadoId === this.anfitrion)
  }

  private cambiarCantidadDeLugares() {
    const humanos = this.lugares.filter((l) => l.tipo === 'humano')
    const n = cantidadJugadores(this.config.formato)
    if (humanos.length > n) throw new Rechazo('Hay más personas que lugares en ese formato')
    this.lugares = Array.from({ length: n }, (_, a) => lugarLibre(a))
    humanos.forEach((h, i) => {
      this.lugares[i] = { ...h, asiento: i }
      const client = h.sessionId ? this.clients.get(h.sessionId) : undefined
      if (client) client.userData = { asiento: i } satisfies DatosCliente
    })
    this.maxClients = margenConexiones(n)
  }

  private exigirAnfitrion(asiento: number) {
    if (this.lugares[asiento]?.invitadoId !== this.anfitrion) throw new Rechazo('Solo el anfitrión puede hacer eso')
  }

  private revisarColaPublica() {
    const humanos = this.lugares.filter((l) => l.tipo === 'humano').length
    if (humanos === this.lugares.length) {
      this.iniciar()
    } else if (!this.timerOfrecer) {
      this.timerOfrecer = setTimeout(() => {
        this.timerOfrecer = null
        if (this.fase === 'esperando') this.broadcast('ofrecerBot', {})
      }, this.tiempos.ofrecerBotMs)
    }
  }

  // ── Partida ──────────────────────────────────────────────────────

  private iniciar(completarConBots = this.botsEnVacios) {
    const libres = this.lugares.filter((l) => l.tipo === 'libre')
    if (libres.length > 0 && !completarConBots) throw new Rechazo('Faltan jugadores')
    let numeroBot = 0
    for (const l of libres) {
      numeroBot++
      l.tipo = 'bot'
      l.apodo = `Bot ${numeroBot}`
      // Los bots pueden lucir piezas de la tienda; cada sala les arma caras distintas.
      l.avatar = codificarAvatar(avatarAlAzar(`${this.roomId}-${numeroBot}`, false))
      l.conectado = false
    }
    this.limpiarTimer('timerOfrecer')
    this.empezarPartida()
  }

  /**
   * Arranca una partida con los lugares como están: la primera o una revancha.
   * En la revancha reparte el siguiente al que repartió primero la anterior, así la mano rota.
   */
  private empezarPartida() {
    const n = this.lugares.length
    // Por defecto reparte el último, así el asiento 0 es mano (como en el motor). En la primera
    // partida de la sala se pueden tirar reyes.
    const reyes = this.reparteInicial === null && this.tirarReyes !== 'no' ? this.tirarLosReyes() : null
    const reparte = reyes ? reyes.reparte : this.reparteInicial === null ? n - 1 : (this.reparteInicial + 1) % n
    this.reparteInicial = reparte
    this.pedidosRevancha.clear()
    this.bots = this.lugares.map((l) => (l.tipo === 'bot' ? crearBot(this.nivelBots, randomInt(2 ** 31)) : null))
    this.reemplazos = this.lugares.map(() => crearBot(NIVEL_REEMPLAZO, randomInt(2 ** 31)))
    const semilla = randomInt(2 ** 31)
    this.estado = crearPartida({
      jugadores: this.lugares.map((l) => ({ id: idJugador(l.asiento), nombre: l.apodo, bot: l.tipo === 'bot' })),
      semilla,
      config: this.config,
      reparte,
    })
    this.vencidos.clear()
    this.sugerencias = [null, null]
    this.fase = 'jugando'
    if (this.publica) void this.setPrivate(true)
    this.inicioMs = Date.now()
    this.registro = {
      sala: this.roomId,
      inicio: new Date().toISOString(),
      fin: null,
      semilla,
      reparte,
      config: this.config,
      jugadores: this.lugares.map((l) => ({
        asiento: l.asiento,
        apodo: l.apodo,
        tipo: l.tipo === 'bot' ? 'bot' : 'humano',
        invitadoId: l.invitadoId,
        cuentaId: l.cuentaId,
      })),
      acciones: [],
      resultado: null,
    }
    if (reyes) {
      for (const l of this.lugares) if (this.humanoConectado(l.asiento)) this.enviarA(l.asiento, 'reyes', reyes)
    }
    this.enviarSala()
    this.claveMano = ''
    this.revisarNuevaMano()
    this.difundir([])
    // Mientras la mesa muestra la tirada de reyes no corre el reloj del primer turno.
    const cambiaron = reyes !== null && reyes.equipos !== null && this.reacomodados
    this.programar([], reyes && this.tiempos.pausaManoMs > 0 ? planReyes(reyes.tiradas, cambiaron).fin : 0)
  }

  /**
   * Tira reyes (ver `tirarReyes`): desde el anfitrión, el primer rey reparte y, con equipos, los
   * del rey quedan juntos (se reacomodan los lugares).
   */
  private tirarLosReyes(): MensajesServidor['reyes'] {
    const n = this.lugares.length
    const conEquipos = this.tirarReyes === 'reparteYEquipos'
    const mazo = barajar(crearBaraja(), randomInt(2 ** 31)).resultado
    const r = tirarReyes(n, this.delAnfitrion()?.asiento ?? 0, mazo, conEquipos)
    const apodos = this.lugares.map((l) => l.apodo)
    this.reacomodados = r.asientoNuevo.some((b, a) => b !== a)
    if (this.reacomodados) {
      const antes = this.lugares
      this.lugares = antes.map((_, b) => ({ ...antes[r.asientoNuevo.indexOf(b)]!, asiento: b }))
      for (const l of this.lugares) {
        const client = l.sessionId ? this.clients.get(l.sessionId) : undefined
        if (client) client.userData = { asiento: l.asiento } satisfies DatosCliente
      }
    }
    return { tiradas: r.tiradas, reparte: r.asientoNuevo[r.conRey[0]!]!, equipos: conEquipos && n > 2 ? r.conRey : null, apodos }
  }

  /**
   * Si todos los humanos conectados pidieron la revancha, la arranca. Devuelve si arrancó.
   * Los desconectados no cuentan: conservan su lugar y juega su reemplazo.
   */
  private revisarRevancha(): boolean {
    if (this.fase !== 'terminada') return false
    const conectados = this.lugares.filter((l) => this.humanoConectado(l.asiento))
    if (conectados.length === 0 || !conectados.every((l) => this.pedidosRevancha.has(l.asiento))) return false
    this.empezarPartida()
    return true
  }

  /** Aplica una jugada; devuelve el motivo si es inválida. */
  private aplicar(asiento: number, accion: Accion, porBot: boolean): string | null {
    const r = apply(this.estado!, { ...accion, jugador: idJugador(asiento) } as Accion)
    if (!r.ok) return r.motivo
    this.estado = r.estado
    this.registro?.acciones.push({ ms: Date.now() - this.inicioMs, asiento, accion: { ...accion, jugador: idJugador(asiento) } as Accion, porBot })
    if (!porBot) this.vencidos.delete(asiento)
    this.revisarNuevaMano()
    this.difundir(r.eventos)
    if (r.estado.ganador !== null) this.terminar()
    else this.programar(r.eventos)
    return null
  }

  private terminar() {
    this.fase = 'terminada'
    this.limpiarTimer('timerJuego')
    this.version++
    if (this.registro && this.estado) {
      this.registro.fin = new Date().toISOString()
      this.registro.resultado = { ganador: this.estado.ganador!, puntos: this.estado.puntos }
      this.guardarRegistro()
    }
    this.broadcast('turno', { asientos: [], venceEn: null })
    this.enviarSala()
  }

  /** Decide quién tiene que jugar y arma el reloj del turno o la jugada del bot. */
  private programar(eventos: Evento[] = [], esperaMs = 0) {
    this.version++
    this.limpiarTimer('timerJuego')
    if (this.fase !== 'jugando' || !this.estado) return
    const extra =
      esperaMs +
      (eventos.some((ev) => ev.tipo === 'enfrentamientoTerminado')
        ? this.tiempos.pausaManoMs
        : eventos.some((ev) => ev.tipo === 'vueltaTerminada')
          ? this.tiempos.pausaVueltaMs
          : 0)
    // Si el pie acaba de mandar a alguien (él o un bot), el que la cumple no canta al instante.
    const ordeno = this.ordenarDelPie() || eventos.some((ev) => ev.tipo === 'orden')
    const [ordenMin, ordenMax] = this.tiempos.esperaOrdenMs
    const reaccion = ordeno ? ordenMin + (ordenMax > ordenMin ? randomInt(ordenMax - ordenMin + 1) : 0) : 0
    const version = this.version
    const esperando = esperandoA(this.estado)
    const humanos = esperando.filter((a) => this.humanoConectado(a))
    if (humanos.length === 0) {
      const a = esperando[0]
      if (a === undefined) return
      const { botMinMs, botMaxMs } = this.tiempos
      const demora = extra + reaccion + botMinMs + (botMaxMs > botMinMs ? randomInt(botMaxMs - botMinMs + 1) : 0)
      this.timerJuego = setTimeout(() => this.jugarBot(a, version), demora)
      this.broadcast('turno', { asientos: esperando, venceEn: null })
    } else {
      const espera = extra + this.tiempoDeTurno(esperando)
      const venceEn = Date.now() + espera
      this.timerJuego = setTimeout(() => this.jugarBot(humanos[0]!, version, true), espera)
      this.broadcast('turno', { asientos: esperando, venceEn })
    }
  }

  /**
   * Tiempo de la jugada que se espera: la primera jugada de la mano (el turno del mano
   * cuando en el enfrentamiento todavía no pasó nada: ni cartas, ni cantos, ni flor) tiene
   * el tiempo largo; todo lo demás (jugadas, respuestas, declaraciones), el normal.
   * En pica-pica cada duelo es un enfrentamiento, así que el mano de cada uno tiene el largo.
   */
  private tiempoDeTurno(esperando: number[]): number {
    const { turnoMs, primeraJugadaMs, msPorSegundo } = this.tiempos
    const normal = turnoMs ?? this.configTiempos.turnoS * msPorSegundo
    if (!this.esPrimeraJugada(esperando)) return normal
    return primeraJugadaMs ?? turnoMs ?? this.configTiempos.primeraJugadaS * msPorSegundo
  }

  private esPrimeraJugada(esperando: number[]): boolean {
    const m = this.estado!.mano
    const e = m.enfrentamientos[m.actual]
    if (!e || m.verificacion) return false
    return (
      esperando.length === 1 &&
      esperando[0] === e.mano &&
      e.turno === e.mano &&
      e.vueltas.length === 1 &&
      e.vueltas[0]!.jugadas.length === 0 &&
      e.truco.valor === 1 &&
      e.truco.pendiente === null &&
      e.envido.estado === 'libre' &&
      e.envido.cantos.length === 0 &&
      e.flor.estado === 'libre' &&
      e.flor.cantadas.length === 0
    )
  }

  private jugarBot(asiento: number, version: number, porTiempo = false) {
    this.timerJuego = null
    if (version !== this.version || !this.estado || this.fase !== 'jugando') return
    const lugar = this.lugares[asiento]!
    if (porTiempo) {
      // Al que deja vencer el tiempo varias veces seguidas se lo saca y queda un bot.
      const vencidos = (this.vencidos.get(asiento) ?? 0) + 1
      this.vencidos.set(asiento, vencidos)
      if (vencidos >= VENCIDOS_PARA_SACAR) this.sacar(asiento, 'Se te venció el tiempo varias veces seguidas')
    }
    const bot = lugar.tipo === 'bot' ? this.bots[asiento]! : this.reemplazos[asiento]!
    const vista = vistaPara(this.estado, idJugador(asiento))
    const sug = this.sugerencias[equipoDe(asiento)]
    const sugerencia = sug && sug.vuelta === this.claveVuelta() ? sug.sugerencia : undefined
    const accion = bot.decidir(vista, this.senias[asiento], sugerencia)
    const motivo = this.aplicar(asiento, accion, true)
    if (motivo) {
      // No debería pasar: el bot elige entre las acciones válidas. Por las dudas, la primera.
      console.error(`Bot en ${this.roomId} eligió una acción inválida: ${motivo}`)
      const primera = vista.accionesValidas.find((a) => a.tipo !== 'irseAlMazo') ?? vista.accionesValidas[0]
      if (primera) this.aplicar(asiento, primera, true)
    }
  }

  /** Saca a alguien de la mesa: su lugar queda para un bot y ya no puede volver a esta partida. */
  private sacar(asiento: number, motivo: string) {
    const lugar = this.lugares[asiento]!
    const client = lugar.sessionId ? this.clients.get(lugar.sessionId) : undefined
    if (client) this.enviar(client, 'expulsado', { motivo })
    lugar.tipo = 'bot'
    lugar.invitadoId = null
    lugar.sessionId = null
    lugar.conectado = false
    this.bots[asiento] = this.reemplazos[asiento]!
    this.vencidos.delete(asiento)
    client?.leave()
    this.enviarSala()
  }

  /** La vuelta en curso: una sugerencia del pie vale hasta que termina. */
  private claveVuelta(): string {
    if (!this.estado) return ''
    const m = this.estado.mano
    return `${m.numero}-${m.actual}-${m.enfrentamientos[m.actual]?.vueltas.length ?? 0}`
  }

  /**
   * Con "toques y gritos del pie": si le toca jugar a alguien y su pie no es una persona
   * conectada (un bot, o el que juega por quien no está), el pie decide si lo manda a tocar o a gritar.
   */
  /** Devuelve si mandó a alguien. */
  private ordenarDelPie(): boolean {
    const estado = this.estado
    if (!estado || estado.config.toquesYGritos !== 'pie' || estado.mano.cortando !== null || estado.mano.verificacion) return false
    const e = enfrentamientoActual(estado)
    const turno = e.turno
    if (turno === null || esperandoA(estado)[0] !== turno) return false
    const lider = liderDe(estado, e, equipoDe(turno))
    if (lider === null || lider === turno || this.humanoConectado(lider)) return false
    if (e.ordenes.some((o) => o.asiento === turno)) return false
    const bot = this.lugares[lider]!.tipo === 'bot' ? this.bots[lider]! : this.reemplazos[lider]!
    const que = bot.ordenar(vistaPara(estado, idJugador(lider)), this.senias[lider], turno)
    if (!que) return false
    const r = apply(estado, { tipo: 'mandar', jugador: idJugador(lider), a: turno, que })
    if (!r.ok) return false
    this.estado = r.estado
    this.registro?.acciones.push({ ms: Date.now() - this.inicioMs, asiento: lider, accion: { tipo: 'mandar', jugador: idJugador(lider), a: turno, que }, porBot: true })
    this.difundir(r.eventos)
    return true
  }

  // ── Señas ────────────────────────────────────────────────────────

  private hayCompanieros(): boolean {
    return this.fase === 'jugando' && this.lugares.length > 2 && !!this.estado && !this.estado.mano.picaPica
  }

  /** Si empezó una mano o se terminó de cortar: reinicia las señas y hacen las suyas los bots. */
  private revisarNuevaMano() {
    const m = this.estado!.mano
    const clave = `${m.numero}-${m.cortando === null}`
    if (clave === this.claveMano) return
    const nuevaMano = !this.claveMano.startsWith(`${m.numero}-`)
    this.claveMano = clave
    if (nuevaMano) this.senias = this.lugares.map(() => ({}))
    // Hasta que no se corta no hay cartas para señar.
    if (m.cortando === null) this.alNuevaMano()
  }

  private alNuevaMano() {
    // Sin señas en la mesa, los bots no hacen ni reciben ninguna (juegan a ciegas).
    if (!this.hayCompanieros() || !this.configSenias.habilitadas) return
    // Los bots (y los reemplazos de quien no está) hacen sus señas al empezar la mano.
    for (const l of this.lugares) {
      if (this.humanoConectado(l.asiento)) continue
      const bot = l.tipo === 'bot' ? this.bots[l.asiento]! : this.reemplazos[l.asiento]!
      const senias = bot.hacerSenias(vistaPara(this.estado!, idJugador(l.asiento)))
      if (senias.length > 0) this.entregarSenias(l.asiento, senias)
      else for (const b of this.companierosDe(l.asiento)) this.senias[b]![l.asiento] ??= []
    }
  }

  /**
   * Las señas se les hacen a los compañeros. Cada rival, según la sala, puede pescar
   * cada una con cierta probabilidad: la sortea el servidor, nunca el cliente. Una seña
   * repetida no se anota de nuevo (ya la tienen), pero se puede pescar como cualquiera.
   */
  private entregarSenias(de: number, senias: Senia[], repetida = false) {
    const mano = this.estado!.mano.numero
    for (const b of this.companierosDe(de)) {
      if (!repetida) this.senias[b]![de] = [...(this.senias[b]![de] ?? []), ...senias]
      if (this.humanoConectado(b)) {
        for (const senia of senias) this.enviarA(b, 'senia', { de, senia, mano, ...(repetida ? { repetida } : {}) })
      }
    }
    const { pescar, probabilidadPescar } = this.configSenias
    if (pescar === 'nunca') return
    for (const r of this.rivalesDe(de)) {
      for (const senia of senias) {
        if (!(Math.random() < probabilidadPescar)) continue
        const vista = pescar === 'gestoYCarta' ? senia : null
        if (this.humanoConectado(r)) this.enviarA(r, 'seniaPescada', { de, senia: vista })
        // Los bots (y los reemplazos) usan lo que pescaron para imaginar la mano del rival.
        else if (vista && !(repetida && this.senias[r]![de]?.includes(vista))) {
          this.senias[r]![de] = [...(this.senias[r]![de] ?? []), vista]
        }
      }
    }
  }

  private rivalesDe(asiento: number): number[] {
    return this.lugares.filter((l) => l.asiento % 2 !== asiento % 2).map((l) => l.asiento)
  }

  private companierosDe(asiento: number): number[] {
    return this.lugares.filter((l) => l.asiento !== asiento && l.asiento % 2 === asiento % 2).map((l) => l.asiento)
  }

  // ── Envíos ───────────────────────────────────────────────────────

  private enviar<K extends keyof MensajesServidor>(client: Client, tipo: K, datos: MensajesServidor[K]) {
    client.send(tipo, datos)
  }

  private enviarA<K extends keyof MensajesServidor>(asiento: number, tipo: K, datos: MensajesServidor[K]) {
    const sessionId = this.lugares[asiento]?.sessionId
    const client = sessionId ? this.clients.get(sessionId) : undefined
    if (client && this.lugares[asiento]!.conectado) this.enviar(client, tipo, datos)
  }

  /** A cada humano: los eventos públicos y su propia vista. */
  private difundir(eventos: Evento[]) {
    if (!this.estado) return
    for (const l of this.lugares) {
      if (!this.humanoConectado(l.asiento)) continue
      if (eventos.length > 0) this.enviarA(l.asiento, 'eventos', eventosPara(eventos, l.asiento))
      this.enviarA(l.asiento, 'vista', vistaPara(this.estado, idJugador(l.asiento)))
    }
  }

  private enviarSala() {
    for (const client of this.clients) {
      const asiento = (client.userData as DatosCliente | undefined)?.asiento ?? null
      this.enviar(client, 'sala', this.infoSala(asiento))
    }
  }

  private infoSala(yo: number | null): InfoSala {
    return {
      codigo: this.codigo,
      publica: this.publica,
      fase: this.fase,
      formato: this.config.formato,
      config: this.config,
      botsEnVacios: this.botsEnVacios,
      nivelBots: this.nivelBots,
      ayudas: this.ayudas,
      senias: this.configSenias,
      tiempos: this.configTiempos,
      cartasJugadas: this.cartasJugadas,
      tirarReyes: this.tirarReyes,
      mesa: this.delAnfitrion()?.mesa ?? MESA_DEFAULT,
      baraja: this.delAnfitrion()?.baraja ?? BARAJA_DEFAULT,
      chatEquipo: this.chatEquipo(),
      lugares: this.lugares.map((l) => ({
        asiento: l.asiento,
        tipo: l.tipo,
        apodo: l.apodo,
        avatar: l.avatar,
        conectado: l.tipo === 'humano' && l.conectado,
        anfitrion: l.invitadoId !== null && l.invitadoId === this.anfitrion,
      })),
      yo,
      revancha: this.fase === 'terminada' ? [...this.pedidosRevancha].sort((x, y) => x - y) : [],
    }
  }

  // ── Utilidades ───────────────────────────────────────────────────

  private chatEquipo(): boolean {
    return !this.publica && this.lugares.length > 2
  }

  private lugarDe(client: Client): Lugar | undefined {
    return this.lugares.find((l) => l.sessionId === client.sessionId)
  }

  private humanoConectado(asiento: number): boolean {
    const l = this.lugares[asiento]
    return !!l && l.tipo === 'humano' && l.conectado
  }

  private alCambiarConexion() {
    // Si se fue el único que faltaba pedir la revancha, arranca con los que quedan.
    if (this.revisarRevancha()) {
      this.revisarCierre()
      return
    }
    this.enviarSala()
    this.revisarCierre()
    // Si esperábamos a quien se fue, ahora juega su bot (o viceversa).
    if (this.fase === 'jugando') this.programar()
  }

  private revisarCierre() {
    const hayHumanos = this.lugares.some((l) => l.tipo === 'humano' && l.conectado)
    if (hayHumanos) {
      this.limpiarTimer('timerCierre')
    } else if (!this.timerCierre) {
      this.timerCierre = setTimeout(() => void this.disconnect(), this.tiempos.cierreSinHumanosMs)
    }
  }

  private limite(mapa: Map<string, LimiteFrecuencia>, client: Client, maximo: number, ventanaMs: number): boolean {
    let l = mapa.get(client.sessionId)
    if (!l) mapa.set(client.sessionId, (l = new LimiteFrecuencia(maximo, ventanaMs)))
    return l.permitir()
  }

  private limpiarTimer(nombre: 'timerJuego' | 'timerCierre' | 'timerOfrecer') {
    const t = this[nombre]
    if (t) clearTimeout(t)
    this[nombre] = null
  }

  private guardarRegistro() {
    if (this.registro) void this.archivo?.guardarPartida(this.registro).catch((e) => console.error(e))
  }

  /** Solo para tests: el estado completo de la partida. */
  estadoParaTests(): EstadoPartida | null {
    return this.estado
  }

  /** Solo para tests: las señas que conoce cada asiento en la mano (propias del equipo y pescadas). */
  seniasParaTests(): SeniasRecibidas[] {
    return this.senias
  }
}
