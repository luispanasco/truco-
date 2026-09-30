import { randomInt } from 'node:crypto'
import { matchMaker, Room, type Client } from 'colyseus'
import {
  apply,
  cantidadJugadores,
  crearConfig,
  crearPartida,
  esperandoA,
  vistaPara,
  type Accion,
  type ConfigSala,
  type EstadoPartida,
  type Evento,
} from '@truco/engine'
import { crearBot, SENIAS, type Bot, type Nivel, type Senia, type SeniasRecibidas } from '@truco/bots'
import {
  LIMITES,
  type CanalChat,
  type FaseSala,
  type InfoSala,
  type MensajeChat,
  type MensajesCliente,
  type MensajesServidor,
  type OpcionesCrearSala,
  type OpcionesUnirse,
} from '@truco/shared'
import { LimiteFrecuencia, filtrarTexto, prepararMensaje } from './chat'
import { generarCodigoUnico } from './codigos'
import { Archivo, type RegistroPartida } from './registro'

export interface Tiempos {
  /** Tiempo para jugar; al vencer juega un bot por el jugador. */
  turnoMs: number
  /** Demora al azar antes de que juegue un bot. */
  botMinMs: number
  botMaxMs: number
  /** Sin humanos conectados, la sala se cierra después de este tiempo. */
  cierreSinHumanosMs: number
  /** Cola pública: a los cuántos ms de esperar solo se ofrece jugar contra un bot. */
  ofrecerBotMs: number
  /** Ventana para reconectarse a la misma sesión tras un corte. */
  reconexionS: number
}

export const TIEMPOS_DEFAULT: Tiempos = {
  turnoMs: 30_000,
  botMinMs: 800,
  botMaxMs: 2_000,
  cierreSinHumanosMs: 120_000,
  ofrecerBotMs: 30_000,
  reconexionS: 20,
}

/** Nivel del bot que juega por un humano desconectado o que se quedó sin tiempo. */
const NIVEL_REEMPLAZO: Nivel = 'medio'
const NIVELES: Nivel[] = ['facil', 'medio', 'dificil']

interface Lugar {
  asiento: number
  tipo: 'libre' | 'humano' | 'bot'
  invitadoId: string | null
  apodo: string
  avatar: string | null
  sessionId: string | null
  conectado: boolean
}

interface DatosCliente {
  asiento: number
}

const idJugador = (asiento: number) => `j${asiento}`

function lugarLibre(asiento: number): Lugar {
  return { asiento, tipo: 'libre', invitadoId: null, apodo: '', avatar: null, sessionId: null, conectado: false }
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

  override maxMessagesPerSecond = 30

  private codigo: string | null = null
  private fase: FaseSala = 'esperando'
  private config: ConfigSala = crearConfig()
  private botsEnVacios = true
  private nivelBots: Nivel = 'medio'
  private ayudas = true
  private lugares: Lugar[] = []
  private anfitrion: string | null = null

  private estado: EstadoPartida | null = null
  private bots: (Bot | null)[] = []
  private reemplazos: Bot[] = []
  private senias: SeniasRecibidas[] = []
  private numeroMano = -1
  private registro: RegistroPartida | null = null
  private inicioMs = 0

  private version = 0
  private timerJuego: NodeJS.Timeout | null = null
  private timerCierre: NodeJS.Timeout | null = null
  private timerOfrecer: NodeJS.Timeout | null = null

  private limitesAccion = new Map<string, LimiteFrecuencia>()
  private limitesChat = new Map<string, LimiteFrecuencia>()
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
    this.maxClients = this.lugares.length
    this.registrarMensajes()
    this.revisarCierre()
  }

  override onJoin(client: Client, opciones: OpcionesUnirse) {
    const invitadoId = texto(opciones?.invitadoId, 64)
    const apodo = texto(opciones?.apodo, LIMITES.largoApodo)
    if (!invitadoId || invitadoId.length < 8) throw new Error('Falta el ID de invitado')
    if (!apodo) throw new Error('Falta el apodo')

    let lugar = this.lugares.find((l) => l.invitadoId === invitadoId)
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
    lugar.apodo = filtrarTexto(apodo)
    lugar.avatar = texto(opciones?.avatar, 40)
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
      lugar.sessionId = null
      lugar.conectado = false
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
      if (!this.hayCompanieros()) throw new Rechazo('Ahora no hay compañeros a quien hacerle señas')
      this.entregarSenias(asiento, [senia])
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

    manejar('iniciar', (_client, asiento) => {
      this.exigirAnfitrion(asiento)
      if (this.fase !== 'esperando') throw new Rechazo('La partida ya empezó')
      this.iniciar()
    })

    manejar('jugarContraBot', () => {
      if (!this.publica || this.fase !== 'esperando') throw new Rechazo('Ahora no se puede')
      this.iniciar(true)
    })
  }

  // ── Configuración y espera ───────────────────────────────────────

  private aplicarConfiguracion(op: Partial<OpcionesCrearSala>) {
    // El modo sucio se habilita recién en la fase 3.
    this.config = crearConfig({ ...this.config, ...(op.config ?? {}), modoSucio: false })
    if (!['1v1', '2v2', '3v3'].includes(this.config.formato)) throw new Rechazo('Formato inválido')
    if (typeof op.botsEnVacios === 'boolean') this.botsEnVacios = op.botsEnVacios
    if (op.nivelBots && NIVELES.includes(op.nivelBots)) this.nivelBots = op.nivelBots
    if (typeof op.ayudas === 'boolean') this.ayudas = op.ayudas
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
    this.maxClients = n
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
      l.conectado = false
    }
    this.limpiarTimer('timerOfrecer')
    this.bots = this.lugares.map((l) => (l.tipo === 'bot' ? crearBot(this.nivelBots, randomInt(2 ** 31)) : null))
    this.reemplazos = this.lugares.map(() => crearBot(NIVEL_REEMPLAZO, randomInt(2 ** 31)))
    const semilla = randomInt(2 ** 31)
    this.estado = crearPartida({
      jugadores: this.lugares.map((l) => ({ id: idJugador(l.asiento), nombre: l.apodo })),
      semilla,
      config: this.config,
    })
    this.fase = 'jugando'
    if (this.publica) void this.setPrivate(true)
    this.inicioMs = Date.now()
    this.registro = {
      sala: this.roomId,
      inicio: new Date().toISOString(),
      fin: null,
      semilla,
      config: this.config,
      jugadores: this.lugares.map((l) => ({
        asiento: l.asiento,
        apodo: l.apodo,
        tipo: l.tipo === 'bot' ? 'bot' : 'humano',
        invitadoId: l.invitadoId,
      })),
      acciones: [],
      resultado: null,
    }
    this.enviarSala()
    this.alNuevaMano()
    this.difundir([])
    this.programar()
  }

  /** Aplica una jugada; devuelve el motivo si es inválida. */
  private aplicar(asiento: number, accion: Accion, porBot: boolean): string | null {
    const r = apply(this.estado!, { ...accion, jugador: idJugador(asiento) } as Accion)
    if (!r.ok) return r.motivo
    this.estado = r.estado
    this.registro?.acciones.push({ ms: Date.now() - this.inicioMs, asiento, accion: { ...accion, jugador: idJugador(asiento) } as Accion, porBot })
    if (r.estado.mano.numero !== this.numeroMano) this.alNuevaMano()
    this.difundir(r.eventos)
    if (r.estado.ganador !== null) this.terminar()
    else this.programar()
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
  private programar() {
    this.version++
    this.limpiarTimer('timerJuego')
    if (this.fase !== 'jugando' || !this.estado) return
    const version = this.version
    const esperando = esperandoA(this.estado)
    const humanos = esperando.filter((a) => this.humanoConectado(a))
    if (humanos.length === 0) {
      const a = esperando[0]
      if (a === undefined) return
      const { botMinMs, botMaxMs } = this.tiempos
      const demora = botMinMs + (botMaxMs > botMinMs ? randomInt(botMaxMs - botMinMs + 1) : 0)
      this.timerJuego = setTimeout(() => this.jugarBot(a, version), demora)
      this.broadcast('turno', { asientos: esperando, venceEn: null })
    } else {
      const venceEn = Date.now() + this.tiempos.turnoMs
      this.timerJuego = setTimeout(() => this.jugarBot(humanos[0]!, version), this.tiempos.turnoMs)
      this.broadcast('turno', { asientos: esperando, venceEn })
    }
  }

  private jugarBot(asiento: number, version: number) {
    this.timerJuego = null
    if (version !== this.version || !this.estado || this.fase !== 'jugando') return
    const lugar = this.lugares[asiento]!
    const bot = lugar.tipo === 'bot' ? this.bots[asiento]! : this.reemplazos[asiento]!
    const vista = vistaPara(this.estado, idJugador(asiento))
    const accion = bot.decidir(vista, this.senias[asiento])
    const motivo = this.aplicar(asiento, accion, true)
    if (motivo) {
      // No debería pasar: el bot elige entre las acciones válidas. Por las dudas, la primera.
      console.error(`Bot en ${this.roomId} eligió una acción inválida: ${motivo}`)
      const primera = vista.accionesValidas.find((a) => a.tipo !== 'irseAlMazo') ?? vista.accionesValidas[0]
      if (primera) this.aplicar(asiento, primera, true)
    }
  }

  // ── Señas ────────────────────────────────────────────────────────

  private hayCompanieros(): boolean {
    return this.fase === 'jugando' && this.lugares.length > 2 && !!this.estado && !this.estado.mano.picaPica
  }

  private alNuevaMano() {
    this.numeroMano = this.estado!.mano.numero
    this.senias = this.lugares.map(() => ({}))
    if (!this.hayCompanieros()) return
    // Los bots (y los reemplazos de quien no está) hacen sus señas al empezar la mano.
    for (const l of this.lugares) {
      if (this.humanoConectado(l.asiento)) continue
      const bot = l.tipo === 'bot' ? this.bots[l.asiento]! : this.reemplazos[l.asiento]!
      const senias = bot.hacerSenias(vistaPara(this.estado!, idJugador(l.asiento)))
      if (senias.length > 0) this.entregarSenias(l.asiento, senias)
      else for (const b of this.companierosDe(l.asiento)) this.senias[b]![l.asiento] ??= []
    }
  }

  /** Las señas llegan solo a los compañeros: nunca al equipo rival. */
  private entregarSenias(de: number, senias: Senia[]) {
    for (const b of this.companierosDe(de)) {
      this.senias[b]![de] = [...(this.senias[b]![de] ?? []), ...senias]
      if (this.humanoConectado(b)) for (const senia of senias) this.enviarA(b, 'senia', { de, senia })
    }
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
      if (eventos.length > 0) this.enviarA(l.asiento, 'eventos', eventos)
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
}
