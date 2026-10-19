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
  liderDe,
  esBotMandado,
  debeCantarFlor,
  pendienteActual,
  vistaPara,
  type Accion,
  type ConfigSala,
  type EstadoPartida,
  type Evento,
  type Formato,
} from '@truco/engine'
import { crearBot, type Bot, type Nivel, type Senia, type SeniasRecibidas } from '@truco/bots'
import {
  MOTIVO_ENVIDO_CON_FLOR,
  MOTIVO_SENIA_TARDE,
  MOTIVO_SENIA_TEMPRANO,
  MOTIVO_SIN_SENIAS,
  envidoDeSenia,
  avatarAlAzar,
  codificarAvatar,
  normalizarSenias,
  normalizarTirarReyes,
  tirarReyes,
  ESPERA_ORDEN_MS,
  yaJugoEnLaMano,
  type ConfigSenias,
  type InfoSala,
  type MensajesCliente,
  type MensajesServidor,
  type TirarReyes,
} from '@truco/shared'
import {
  BARAJA_DEFAULT,
  MESA_DEFAULT,
  normalizarCartasJugadas,
  TIEMPOS_SALA_DEFAULT,
  type CartasJugadas,
  type IdBaraja,
  type IdMesa,
} from '@truco/shared'
import type { Conexion, MensajeServidor } from './tipos'

export interface OpcionesLocal {
  apodo: string
  avatar: string | null
  formato: Formato
  nivelBots: Nivel
  config?: Partial<ConfigSala>
  ayudas?: boolean
  /** Si los rivales pescan señas y cuándo se pueden hacer (como en la sala online). */
  senias?: Partial<ConfigSenias>
  /** Si las cartas jugadas quedan en la mesa o se levantan en cada vuelta. */
  cartasJugadas?: CartasJugadas
  /** Tirar reyes para ver quién reparte (y armar los equipos) en la primera partida. */
  tirarReyes?: TirarReyes
  /** Tu mesa y tu baraja (contra la compu no hay anfitrión: se ven las tuyas). */
  mesa?: IdMesa
  baraja?: IdBaraja
  /** Para los tests: el sorteo de las señas pescadas (por defecto, Math.random). */
  azar?: () => number
  /** Demora de los bots en ms [mínimo, máximo]. En los tests, [0, 0]. */
  demoraBots?: [number, number]
  /** Espera extra al cerrar una vuelta y al terminar una mano, para que se vea el resultado. */
  pausas?: { vuelta: number; mano: number }
  semilla?: number
}

const NOMBRES_BOTS = ['Bot Pepe', 'Bot Chela', 'Bot Tito', 'Bot Mirta', 'Bot Ruben']
const DEMORA_BOTS: [number, number] = [1000, 1800]
/** Si no le decís nada a tu bot (sos su pie), después de este rato decide solo. */
const ESPERA_ORDEN_TUYA_MS = 25_000
/** La pausa entre manos coincide con la de la interfaz (PAUSA_ENTRE_MANOS), más un margen. */
const PAUSAS = { vuelta: 3000, mano: 1200 }
const id = (asiento: number) => `j${asiento}`

/**
 * Partida contra bots que corre entera en el navegador. Imita al servidor: manda
 * los mismos mensajes (sala, vista, eventos, turno, señas) para que la mesa no
 * distinga si juega online o sin conexión. La persona siempre está en el asiento 0.
 */
export class ConexionLocal implements Conexion {
  readonly tipo = 'local' as const
  private oyentes = new Set<(m: MensajeServidor) => void>()
  private config: ConfigSala
  private estado!: EstadoPartida
  private bots: (Bot | null)[] = []
  private senias: SeniasRecibidas[] = []
  /** Mano en curso y si ya se cortó: los bots hacen sus señas recién con las cartas en la mano. */
  private claveMano = ''
  /** Lo que sugeriste como pie, válido en la vuelta en que lo dijiste. */
  /** Nombre de cada asiento: con los reyes, los bots cambian de lugar (la persona sigue en el 0). */
  private nombres: string[] = []
  private primera = true
  private timer: ReturnType<typeof setTimeout> | null = null
  private version = 0
  private semilla: number
  private terminada = false
  private configSenias: ConfigSenias

  constructor(private readonly op: OpcionesLocal) {
    this.config = crearConfig({ ...op.config, formato: op.formato, modoSucio: false })
    this.semilla = op.semilla ?? Math.floor(Math.random() * 2 ** 31)
    this.configSenias = normalizarSenias(op.senias)
  }

  escuchar(oyente: (m: MensajeServidor) => void) {
    this.oyentes.add(oyente)
    // Como el servidor: al entrar llega la sala; la partida arranca enseguida.
    if (this.oyentes.size === 1) this.diferir(() => this.iniciar())
    return () => void this.oyentes.delete(oyente)
  }

  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]) {
    this.diferir(() => this.recibir(tipo, datos))
  }

  salir() {
    this.version++
    if (this.timer) clearTimeout(this.timer)
    this.oyentes.clear()
  }

  // ── Internos ─────────────────────────────────────────────────────

  private recibir<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]) {
    switch (tipo) {
      case 'accion': {
        const { accion } = datos as MensajesCliente['accion']
        const motivo = this.terminada ? 'La partida terminó' : this.aplicar(0, accion)
        if (motivo) this.emitir('error', { motivo })
        return
      }
      case 'chat': {
        const { texto, canal } = datos as MensajesCliente['chat']
        const limpio = texto.trim().slice(0, 200)
        if (limpio) this.emitir('chat', { de: 0, apodo: this.op.apodo, texto: limpio, canal, hora: Date.now() })
        return
      }
      case 'senia': {
        const n = this.estado.jugadores.length
        if (!this.configSenias.habilitadas) {
          this.emitir('error', { motivo: MOTIVO_SIN_SENIAS })
        } else if (this.terminada || n <= 2 || this.estado.mano.picaPica) {
          this.emitir('error', { motivo: 'Ahora no hay compañeros a quien hacerle señas' })
        } else if (this.estado.mano.cortando !== null || !this.estado.mano.muestra) {
          // Las señas se hacen con las cartas en la mano: no mientras se corta o se reparte.
          this.emitir('error', { motivo: MOTIVO_SENIA_TEMPRANO })
        } else if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado.mano, 0)) {
          this.emitir('error', { motivo: MOTIVO_SENIA_TARDE })
        } else if ((datos as MensajesCliente['senia']).senia === 'envido' && envidoDeSenia(this.estado.mano, 0) === null) {
          this.emitir('error', { motivo: MOTIVO_ENVIDO_CON_FLOR })
        } else {
          // Solo la seña: el número de la de envido lo saca entregarSenias de tus cartas.
          this.entregarSenias(0, [(datos as MensajesCliente['senia']).senia])
        }
        return
      }
      case 'pedirSenias': {
        // Contra la compu tus compañeros son bots: repiten enseguida lo que ya marcaron.
        const comp = Number((datos as MensajesCliente['pedirSenias']).asiento)
        const n = this.estado.jugadores.length
        const nombre = this.nombre(comp)
        if (!this.configSenias.habilitadas) this.emitir('error', { motivo: MOTIVO_SIN_SENIAS })
        else if (this.terminada || n <= 2 || this.estado.mano.picaPica || comp <= 0 || comp >= n || comp % 2 !== 0) {
          this.emitir('error', { motivo: 'Solo le podés pedir señas a un compañero' })
        } else if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado.mano, comp)) {
          this.emitir('error', { motivo: `${nombre} ya jugó su carta: en esta sala las señas se hacen antes` })
        } else {
          const hechas = this.senias[0]![comp] ?? []
          if (hechas.length === 0) this.emitir('error', { motivo: `${nombre} no tiene señas para hacerte` })
          else this.entregarSenias(comp, hechas, true)
        }
        return
      }
      case 'revancha':
        if (this.terminada) {
          this.semilla = (this.semilla * 1103515245 + 12345) >>> 0
          this.iniciar()
        }
        return
      default:
        return
    }
  }

  private iniciar() {
    const n = cantidadJugadores(this.config.formato)
    this.terminada = false
    if (this.nombres.length !== n) this.nombres = Array.from({ length: n }, (_, a) => (a === 0 ? this.op.apodo : NOMBRES_BOTS[(a - 1) % NOMBRES_BOTS.length]!))
    // En la primera partida se pueden tirar reyes: el primer rey reparte y, con equipos, los
    // bots se reacomodan (vos seguís en tu lugar).
    const modo = normalizarTirarReyes(this.op.tirarReyes)
    let reparte = this.semilla % n
    if (this.primera && modo !== 'no') {
      const mazo = barajar(crearBaraja(), this.semilla ^ 0x5eed).resultado
      const r = tirarReyes(n, 0, mazo, modo === 'reparteYEquipos', 0)
      const antes = this.nombres
      this.nombres = antes.map((_, b) => antes[r.asientoNuevo.indexOf(b)]!)
      reparte = r.asientoNuevo[r.conRey[0]!]!
      this.emitir('reyes', { tiradas: r.tiradas, reparte, equipos: modo === 'reparteYEquipos' && n > 2 ? r.conRey : null, apodos: antes })
    }
    this.primera = false
    this.bots = Array.from({ length: n }, (_, a) => (a === 0 ? null : crearBot(this.op.nivelBots, this.semilla + a * 7919)))
    this.estado = crearPartida({
      jugadores: Array.from({ length: n }, (_, a) => ({ id: id(a), nombre: this.nombre(a), bot: a !== 0 })),
      semilla: this.semilla,
      config: this.config,
      reparte,
    })
    this.claveMano = ''
    this.emitir('sala', this.infoSala())
    this.revisarNuevaMano()
    this.difundir([])
    this.programar()
  }

  /** Si empezó una mano o se terminó de cortar: reinicia las señas y hacen las suyas los bots. */
  private revisarNuevaMano() {
    const m = this.estado.mano
    const clave = `${m.numero}-${m.cortando === null}`
    if (clave === this.claveMano) return
    const nueva = !this.claveMano.startsWith(`${m.numero}-`)
    this.claveMano = clave
    if (nueva) this.senias = this.estado.jugadores.map(() => ({}))
    if (m.cortando === null) this.alNuevaMano()
  }

  /**
   * Si le toca a un bot y su pie es otro bot, el pie decide si lo manda a tocar o a gritar.
   * (En tu equipo el pie sos vos.) Devuelve si mandó a alguien.
   */
  private ordenarDelPie(turno: number): boolean {
    const estado = this.estado
    if (estado.mano.cortando !== null) return false
    const e = enfrentamientoActual(estado)
    if (e.turno !== turno) return false
    const lider = liderDe(estado, e, equipoDe(turno))
    if (lider === null || lider === turno || lider === 0 || e.ordenes.some((o) => o.asiento === turno)) return false
    const que = this.bots[lider]!.ordenar(vistaPara(estado, id(lider)), this.senias[lider], turno)
    if (!que) return false
    const r = apply(estado, { tipo: 'mandar', jugador: id(lider), a: turno, que })
    if (!r.ok) return false
    this.estado = r.estado
    this.difundir(r.eventos)
    return true
  }

  /**
   * Si le toca jugar a un bot tuyo (sos su pie) y todavía no le dijiste qué: se lo espera. Si tiene
   * que declarar, contestar o cantar la flor, lo hace solo.
   */
  private esperaTuOrden(a: number): boolean {
    const estado = this.estado
    if (estado.mano.cortando !== null || estado.mano.verificacion) return false
    const e = enfrentamientoActual(estado)
    if (e.turno !== a || pendienteActual(e) !== null || !esBotMandado(estado, e, a)) return false
    if (liderDe(estado, e, equipoDe(a)) !== 0 || e.ordenes.some((o) => o.asiento === a)) return false
    return !debeCantarFlor(estado, e, a)
  }

  /** Lo que tarda en cumplir una orden del pie (en los tests, con bots sin demora, nada). */
  private esperaOrden(): number {
    if (this.op.demoraBots) return 0
    const [min, max] = ESPERA_ORDEN_MS
    return min + Math.random() * (max - min)
  }

  /** Cada bot luce siempre el mismo avatar (puede tener piezas de la tienda); la persona, el de su perfil. */
  private avatar(asiento: number) {
    return asiento === 0 ? this.op.avatar : codificarAvatar(avatarAlAzar(this.nombre(asiento), false))
  }

  private nombre(asiento: number) {
    return this.nombres[asiento] ?? (asiento === 0 ? this.op.apodo : NOMBRES_BOTS[(asiento - 1) % NOMBRES_BOTS.length]!)
  }

  private infoSala(): InfoSala {
    const n = cantidadJugadores(this.config.formato)
    return {
      codigo: null,
      publica: false,
      // Contra bots no hay reloj: los tiempos no se usan.
      tiempos: TIEMPOS_SALA_DEFAULT,
      cartasJugadas: normalizarCartasJugadas(this.op.cartasJugadas),
      tirarReyes: normalizarTirarReyes(this.op.tirarReyes),
      // Contra la compu no hay chat de voz.
      voz: false,
      mesa: this.op.mesa ?? MESA_DEFAULT,
      baraja: this.op.baraja ?? BARAJA_DEFAULT,
      fase: this.terminada ? 'terminada' : 'jugando',
      formato: this.config.formato,
      config: this.config,
      botsEnVacios: true,
      nivelBots: this.op.nivelBots,
      ayudas: this.op.ayudas ?? true,
      senias: this.configSenias,
      chatEquipo: n > 2,
      lugares: Array.from({ length: n }, (_, a) => ({
        asiento: a,
        tipo: a === 0 ? 'humano' : 'bot',
        apodo: this.nombre(a),
        avatar: this.avatar(a),
        conectado: a === 0,
        anfitrion: a === 0,
      })),
      yo: 0,
      revancha: [],
    }
  }

  private aplicar(asiento: number, accion: Accion): string | null {
    const r = apply(this.estado, { ...accion, jugador: id(asiento) } as Accion)
    if (!r.ok) return r.motivo
    this.estado = r.estado
    if (r.estado.ganador !== null) {
      this.terminada = true
      this.emitir('turno', { asientos: [], venceEn: null })
      this.emitir('sala', this.infoSala())
      this.difundir(r.eventos)
      return null
    }
    this.revisarNuevaMano()
    this.difundir(r.eventos)
    this.programar(r.eventos)
    return null
  }

  /** Si el juego espera a un bot, lo hace jugar después de una demora. */
  private programar(eventos: Evento[] = []) {
    this.version++
    if (this.timer) clearTimeout(this.timer)
    const esperando = esperandoA(this.estado)
    if (esperando.includes(0) || esperando.length === 0) {
      this.emitir('turno', { asientos: esperando, venceEn: null })
      return
    }
    const a = esperando[0]!
    const [min, max] = this.op.demoraBots ?? DEMORA_BOTS
    const pausas = this.op.pausas ?? (this.op.demoraBots ? { vuelta: 0, mano: 0 } : PAUSAS)
    const extra = eventos.some((ev) => ev.tipo === 'enfrentamientoTerminado')
      ? pausas.mano
      : eventos.some((ev) => ev.tipo === 'vueltaTerminada')
        ? pausas.vuelta
        : 0
    const version = this.version
    // Tu bot no juega hasta que le digas qué (sos su pie); si no le decís nada, al rato decide solo.
    if (this.esperaTuOrden(a)) {
      this.emitir('turno', { asientos: esperando, venceEn: null, pie: 0 })
      this.timer = setTimeout(() => {
        if (version !== this.version) return
        const accion = this.bots[a]!.decidir(vistaPara(this.estado, id(a)), this.senias[a])
        const motivo = this.aplicar(a, accion)
        if (motivo) console.error('Un bot eligió una acción inválida:', motivo)
        // Con bots sin demora (los tests) no se espera; con el juego rápido, sí: el pie sos vos.
      }, this.op.demoraBots?.[1] === 0 ? 0 : ESPERA_ORDEN_TUYA_MS)
      return
    }
    this.emitir('turno', { asientos: esperando, venceEn: null })
    const jugar = () => {
      if (version !== this.version) return
      const accion = this.bots[a]!.decidir(vistaPara(this.estado, id(a)), this.senias[a])
      const motivo = this.aplicar(a, accion)
      if (motivo) console.error('Un bot eligió una acción inválida:', motivo)
    }
    // Si el pie (vos u otro bot) lo acaba de mandar, el bot no canta al instante.
    const mandado = eventos.some((ev) => ev.tipo === 'orden') ? this.esperaOrden() : 0
    this.timer = setTimeout(
      () => {
        if (version !== this.version) return
        if (this.ordenarDelPie(a)) this.timer = setTimeout(jugar, this.esperaOrden())
        else jugar()
      },
      extra + mandado + min + Math.random() * (max - min),
    )
  }

  private alNuevaMano() {
    const n = this.estado.jugadores.length
    if (n <= 2 || this.estado.mano.picaPica || !this.configSenias.habilitadas) return
    for (let a = 1; a < n; a++) {
      const senias = this.bots[a]!.hacerSenias(vistaPara(this.estado, id(a)))
      this.entregarSenias(a, senias)
    }
  }

  /**
   * Las señas llegan a los compañeros; cada rival puede pescar cada una, como en el servidor.
   * Una repetida no se anota de nuevo. La de envido lleva el número del tanto real.
   */
  private entregarSenias(de: number, senias: Senia[], repetida = false) {
    const n = this.estado.jugadores.length
    const mano = this.estado.mano.numero
    const envido = envidoDeSenia(this.estado.mano, de)
    if (envido === null) senias = senias.filter((s) => s !== 'envido')
    if (senias.length === 0) return
    const conNumero = (senia: Senia) => (senia === 'envido' ? { tanto: envido! } : {})
    const anotarEnvido = (a: number) => (this.senias[a]!.envido = { ...this.senias[a]!.envido, [de]: envido! })
    for (let b = de % 2; b < n; b += 2) {
      if (b === de) continue
      if (!repetida) {
        this.senias[b]![de] = [...(this.senias[b]![de] ?? []), ...senias]
        if (senias.includes('envido')) anotarEnvido(b)
      }
      if (b === 0) for (const senia of senias) this.emitir('senia', { de, senia, mano, ...conNumero(senia), ...(repetida ? { repetida } : {}) })
    }
    const { pescar, probabilidadPescar } = this.configSenias
    if (pescar === 'nunca') return
    const azar = this.op.azar ?? Math.random
    for (let r = 1 - (de % 2); r < n; r += 2) {
      for (const senia of senias) {
        if (!(azar() < probabilidadPescar)) continue
        const vista = pescar === 'gestoYCarta' ? senia : null
        if (r === 0) this.emitir('seniaPescada', { de, senia: vista, ...(vista ? conNumero(vista) : {}) })
        else if (vista && !(repetida && this.senias[r]![de]?.includes(vista))) {
          this.senias[r]![de] = [...(this.senias[r]![de] ?? []), vista]
          if (vista === 'envido') anotarEnvido(r)
        }
      }
    }
  }

  private difundir(eventos: Evento[]) {
    if (eventos.length > 0) this.emitir('eventos', eventosPara(eventos, 0))
    this.emitir('vista', vistaPara(this.estado, id(0)))
  }

  private emitir<K extends keyof MensajesServidor>(tipo: K, datos: MensajesServidor[K]) {
    const m = { tipo, datos } as MensajeServidor
    for (const o of this.oyentes) o(m)
  }

  private diferir(f: () => void) {
    setTimeout(f, 0)
  }
}
