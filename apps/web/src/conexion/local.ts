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
  type Formato,
} from '@truco/engine'
import { crearBot, type Bot, type Nivel, type Senia, type SeniasRecibidas } from '@truco/bots'
import {
  MOTIVO_SENIA_TARDE,
  MOTIVO_SIN_SENIAS,
  avatarAlAzar,
  codificarAvatar,
  normalizarSenias,
  yaJugoEnLaMano,
  type ConfigSenias,
  type InfoSala,
  type MensajesCliente,
  type MensajesServidor,
} from '@truco/shared'
import { normalizarCartasJugadas, TIEMPOS_SALA_DEFAULT, type CartasJugadas } from '@truco/shared'
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
/** La pausa entre manos coincide con la de la interfaz (PAUSA_ENTRE_MANOS), más un margen. */
const PAUSAS = { vuelta: 900, mano: 2700 }
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
  private numeroMano = -1
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
        } else if (this.configSenias.momento === 'antesDeJugar' && yaJugoEnLaMano(this.estado.mano, 0)) {
          this.emitir('error', { motivo: MOTIVO_SENIA_TARDE })
        } else {
          this.entregarSenias(0, [(datos as MensajesCliente['senia']).senia])
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
    this.bots = Array.from({ length: n }, (_, a) => (a === 0 ? null : crearBot(this.op.nivelBots, this.semilla + a * 7919)))
    this.estado = crearPartida({
      jugadores: Array.from({ length: n }, (_, a) => ({ id: id(a), nombre: this.nombre(a) })),
      semilla: this.semilla,
      config: this.config,
      reparte: this.semilla % n,
    })
    this.numeroMano = -1
    this.emitir('sala', this.infoSala())
    this.alNuevaMano()
    this.difundir([])
    this.programar()
  }

  /** Cada bot luce siempre el mismo avatar (puede tener piezas de la tienda); la persona, el de su perfil. */
  private avatar(asiento: number) {
    return asiento === 0 ? this.op.avatar : codificarAvatar(avatarAlAzar(this.nombre(asiento), false))
  }

  private nombre(asiento: number) {
    return asiento === 0 ? this.op.apodo : NOMBRES_BOTS[(asiento - 1) % NOMBRES_BOTS.length]!
  }

  private infoSala(): InfoSala {
    const n = cantidadJugadores(this.config.formato)
    return {
      codigo: null,
      publica: false,
      // Contra bots no hay reloj: los tiempos no se usan.
      tiempos: TIEMPOS_SALA_DEFAULT,
      cartasJugadas: normalizarCartasJugadas(this.op.cartasJugadas),
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
    if (r.estado.mano.numero !== this.numeroMano) this.alNuevaMano()
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
    this.emitir('turno', { asientos: esperando, venceEn: null })
    this.timer = setTimeout(
      () => {
        if (version !== this.version) return
        const accion = this.bots[a]!.decidir(vistaPara(this.estado, id(a)), this.senias[a])
        const motivo = this.aplicar(a, accion)
        if (motivo) console.error('Un bot eligió una acción inválida:', motivo)
      },
      extra + min + Math.random() * (max - min),
    )
  }

  private alNuevaMano() {
    this.numeroMano = this.estado.mano.numero
    const n = this.estado.jugadores.length
    this.senias = Array.from({ length: n }, () => ({}))
    if (n <= 2 || this.estado.mano.picaPica || !this.configSenias.habilitadas) return
    for (let a = 1; a < n; a++) {
      const senias = this.bots[a]!.hacerSenias(vistaPara(this.estado, id(a)))
      this.entregarSenias(a, senias)
    }
  }

  /** Las señas llegan a los compañeros; cada rival puede pescar cada una, como en el servidor. */
  private entregarSenias(de: number, senias: Senia[]) {
    const n = this.estado.jugadores.length
    for (let b = de % 2; b < n; b += 2) {
      if (b === de) continue
      this.senias[b]![de] = [...(this.senias[b]![de] ?? []), ...senias]
      if (b === 0) for (const senia of senias) this.emitir('senia', { de, senia })
    }
    const { pescar, probabilidadPescar } = this.configSenias
    if (pescar === 'nunca') return
    const azar = this.op.azar ?? Math.random
    for (let r = 1 - (de % 2); r < n; r += 2) {
      for (const senia of senias) {
        if (!(azar() < probabilidadPescar)) continue
        const vista = pescar === 'gestoYCarta' ? senia : null
        if (r === 0) this.emitir('seniaPescada', { de, senia: vista })
        else if (vista) this.senias[r]![de] = [...(this.senias[r]![de] ?? []), vista]
      }
    }
  }

  private difundir(eventos: Evento[]) {
    if (eventos.length > 0) this.emitir('eventos', eventos)
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
