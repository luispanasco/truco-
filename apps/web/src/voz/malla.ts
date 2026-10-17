import type { CandidatoIce, EstadoVoz, MensajesCliente, SenalVoz, ServidorIce } from '@truco/shared'

/**
 * Chat de voz en malla: cada par de personas con la voz activada se conecta directo por WebRTC
 * (con 6 en la mesa, cada uno arma 5 conexiones). El servidor de juego solo reenvía la
 * señalización. Entre dos, la oferta la hace siempre el de número más alto (el que entró
 * después a la voz): así nunca se cruzan dos ofertas.
 *
 * No sabe nada de React: avisa los cambios con `alCambiar` y el estado de la mesa
 * (voz/estado.ts) los muestra.
 */

/** Cómo quedó el micrófono al activar la voz. Sin micrófono se escucha igual. */
export type EstadoMicrofono = 'listo' | 'negado' | 'sinMicrofono' | 'sinSoporte'

export type EstadoPar = 'conectando' | 'conectado' | 'cortado'

/** La conexión con otra persona, como la ve la interfaz. */
export interface InfoPar {
  id: number
  asiento: number
  estado: EstadoPar
  /** Si ya llega su audio. */
  conAudio: boolean
}

export interface InstantaneaVoz {
  /** Tu asiento según el servidor, o null si todavía no te anotó en la voz. */
  asientoPropio: number | null
  pares: InfoPar[]
  /** Por asiento (también el tuyo): nivel del audio de 0 a 1, en escalones. */
  niveles: Record<number, number>
}

/** Lo que reproduce el audio de otra persona. */
export interface Reproductor {
  silenciar(silenciado: boolean): void
  cerrar(): void
}

/** Lo que mide el nivel de un audio. */
export interface Medidor {
  /** De 0 (silencio) a 1. */
  nivel(): number
  soltar(): void
}

/** Lo que la malla usa del navegador (en los tests se reemplaza). */
export interface EntornoVoz {
  crearConexion(config: RTCConfiguration): RTCPeerConnection
  pedirMicrofono(): Promise<MediaStream>
  reproducir(stream: MediaStream): Reproductor
  /** null si el navegador no puede medir (sin WebAudio). */
  medir(stream: MediaStream): Medidor | null
  cerrar(): void
}

type Enviar = <K extends 'voz' | 'senalVoz'>(tipo: K, datos: MensajesCliente[K]) => void

interface Par {
  id: number
  asiento: number
  pc: RTCPeerConnection
  oferente: boolean
  estado: EstadoPar
  reproductor: Reproductor | null
  medidor: Medidor | null
  /** Candidatos que llegaron antes que la oferta o la respuesta. */
  pendientes: CandidatoIce[]
}

/** Cada cuánto se mide el nivel del audio para el anillo de quien habla. */
const CADA_MS_NIVELES = 100
/** Si una conexión que armaste falla, se vuelve a intentar al rato. */
const REINTENTO_MS = 1500

/** Nivel en escalones de un cuarto: de -55 dB (nada) a -15 dB (lleno). */
export function nivelDeRms(rms: number): number {
  if (!(rms > 0)) return 0
  const db = 20 * Math.log10(rms)
  const n = Math.min(1, Math.max(0, (db + 55) / 40))
  return Math.round(n * 4) / 4
}

export class MallaVoz {
  private pares = new Map<number, Par>()
  /** Los que están en la voz, por número: su asiento. */
  private conocidos = new Map<number, number>()
  private yo: number | null = null
  private servidoresIce: ServidorIce[] = []
  private microfono: MediaStream | null = null
  private medidorPropio: Medidor | null = null
  private abierto = true
  private pulsar = false
  private pulsando = false
  /** Asientos que silenciaste (no los escuchás). */
  private silenciados = new Set<number>()
  private niveles: Record<number, number> = {}
  private timerNiveles: ReturnType<typeof setInterval> | null = null
  private reintentos = new Set<ReturnType<typeof setTimeout>>()
  private activa = false

  constructor(
    private readonly enviar: Enviar,
    private readonly entorno: EntornoVoz,
    private readonly alCambiar: (i: InstantaneaVoz) => void,
  ) {}

  /**
   * Pide el micrófono (recién acá, cuando la persona activa la voz) y entra a la voz. Si no lo
   * dan, entra igual: escucha a los demás aunque no la oigan.
   */
  async activar(op: { abierto: boolean; pulsar: boolean }): Promise<EstadoMicrofono> {
    this.activa = true
    this.abierto = op.abierto
    this.pulsar = op.pulsar
    let estado: EstadoMicrofono = 'listo'
    try {
      this.microfono = await this.entorno.pedirMicrofono()
    } catch (e) {
      const nombre = e instanceof Error || (typeof e === 'object' && e !== null) ? (e as { name?: string }).name : ''
      estado = nombre === 'NotFoundError' || nombre === 'OverconstrainedError' ? 'sinMicrofono' : nombre === 'NotSupportedError' ? 'sinSoporte' : 'negado'
    }
    // Si mientras se pedía el permiso salió de la voz (o de la sala), no se usa.
    if (!this.activa) {
      this.soltarMicrofono()
      return estado
    }
    if (this.microfono) {
      this.aplicarMicrofono()
      this.medidorPropio = this.entorno.medir(this.microfono)
    }
    this.timerNiveles = setInterval(() => this.medir(), CADA_MS_NIVELES)
    this.enviar('voz', { activa: true })
    return estado
  }

  /** Salir de la voz a propósito. */
  desactivar() {
    if (this.activa) this.enviar('voz', { activa: false })
    this.cerrar()
  }

  /** Cierra todo: conexiones, micrófono y medidores (al salir de la voz o de la sala). */
  cerrar() {
    this.activa = false
    this.cerrarPares()
    this.yo = null
    this.soltarMicrofono()
    if (this.timerNiveles) clearInterval(this.timerNiveles)
    this.timerNiveles = null
    this.niveles = {}
    this.entorno.cerrar()
    this.emitir()
  }

  /** Se cortó la conexión con el servidor: el servidor ya nos sacó de la voz y los demás cierran. */
  alCortarse() {
    if (!this.activa) return
    this.cerrarPares()
    this.yo = null
    this.emitir()
  }

  /** Volvió la conexión: si la voz estaba activada, se vuelve a entrar (con número nuevo). */
  alReconectarse() {
    if (this.activa) this.enviar('voz', { activa: true })
  }

  get estaActiva(): boolean {
    return this.activa
  }

  /** Micrófono abierto o cerrado (mute propio). */
  cambiarAbierto(abierto: boolean) {
    this.abierto = abierto
    this.aplicarMicrofono()
  }

  /** Mantener apretado para hablar: prendido, el micrófono se abre solo mientras se aprieta. */
  cambiarPulsar(pulsar: boolean) {
    this.pulsar = pulsar
    this.pulsando = false
    this.aplicarMicrofono()
  }

  cambiarPulsando(pulsando: boolean) {
    this.pulsando = pulsando
    this.aplicarMicrofono()
  }

  /** Dejar de escuchar a alguien (o volver a escucharlo). Solo para vos: los demás lo siguen oyendo. */
  silenciar(asiento: number, silenciado: boolean) {
    if (silenciado) this.silenciados.add(asiento)
    else this.silenciados.delete(asiento)
    for (const p of this.pares.values()) if (p.asiento === asiento) p.reproductor?.silenciar(silenciado)
  }

  /** Si el micrófono manda sonido ahora. */
  get transmitiendo(): boolean {
    return !!this.microfono && this.abierto && (!this.pulsar || this.pulsando)
  }

  /** Llegó quién está en la voz. */
  alEstado(e: EstadoVoz) {
    this.servidoresIce = e.servidoresIce
    this.conocidos = new Map(e.participantes.map((p) => [p.id, p.asiento]))
    if (!this.activa) return
    if (!e.activa) {
      // La sala ya no tiene voz (el anfitrión la apagó).
      this.cerrar()
      return
    }
    if (e.yo === null) {
      // Todavía no nos anotó (llegó algo de antes) o nos sacó: sin número no hay conexiones.
      if (this.yo !== null) this.alCortarse()
      return
    }
    if (e.yo !== this.yo) {
      // Número nuevo (volvimos a entrar): todo de cero.
      this.cerrarPares()
      this.yo = e.yo
    }
    for (const [id, par] of [...this.pares]) {
      const asiento = this.conocidos.get(id)
      if (asiento === undefined) this.cerrarPar(id)
      else if (asiento !== par.asiento) {
        par.asiento = asiento
        par.reproductor?.silenciar(this.silenciados.has(asiento))
      }
    }
    // A los que ya estaban (número más bajo) les ofrece el que llega.
    for (const p of e.participantes) {
      if (p.id < this.yo && !this.pares.has(p.id)) void this.ofrecer(this.crearPar(p.id, p.asiento, true))
    }
    this.emitir()
  }

  /** Llegó una señal de otra persona. */
  async alSenal(de: number, senal: SenalVoz) {
    if (!this.activa || this.yo === null) return
    let par = this.pares.get(de)
    try {
      if (senal.tipo === 'oferta') {
        // Ofrece el de número más alto: una oferta de uno más bajo no corresponde.
        if (de < this.yo || par?.oferente) return
        // Otra oferta del mismo: la conexión anterior falló y la vuelve a armar de cero.
        if (par) this.cerrarPar(de)
        par = this.crearPar(de, this.conocidos.get(de) ?? -1, false)
        const pc = par.pc
        await pc.setRemoteDescription({ type: 'offer', sdp: senal.sdp })
        // Lo propio va en el mismo canal de audio que abrió la oferta.
        if (this.microfono && pc.getSenders().every((s) => !s.track)) {
          for (const t of this.microfono.getAudioTracks()) pc.addTrack(t, this.microfono)
        }
        const respuesta = await pc.createAnswer()
        await pc.setLocalDescription(respuesta)
        this.mandar(de, { tipo: 'respuesta', sdp: pc.localDescription?.sdp ?? respuesta.sdp ?? '' })
        await this.vaciarPendientes(par)
      } else if (senal.tipo === 'respuesta') {
        if (!par?.oferente) return
        await par.pc.setRemoteDescription({ type: 'answer', sdp: senal.sdp })
        await this.vaciarPendientes(par)
      } else if (par && senal.candidato) {
        if (par.pc.remoteDescription) await par.pc.addIceCandidate(senal.candidato).catch(() => {})
        else par.pendientes.push(senal.candidato)
      }
    } catch (e) {
      console.warn('Voz: no se pudo armar la conexión', e)
      if (par && this.pares.get(par.id) === par) {
        par.estado = 'cortado'
        this.emitir()
      }
    }
  }

  // ── Por dentro ───────────────────────────────────────────────────

  private crearPar(id: number, asiento: number, oferente: boolean): Par {
    const pc = this.entorno.crearConexion({ iceServers: this.servidoresIce as RTCIceServer[] })
    const par: Par = { id, asiento, pc, oferente, estado: 'conectando', reproductor: null, medidor: null, pendientes: [] }
    this.pares.set(id, par)
    pc.onicecandidate = (ev) => {
      const c = ev.candidate
      this.mandar(id, { tipo: 'candidato', candidato: c ? { candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null } : null })
    }
    pc.ontrack = (ev) => {
      if (par.reproductor || this.pares.get(id) !== par) return
      const stream = ev.streams[0] ?? new MediaStream([ev.track])
      par.reproductor = this.entorno.reproducir(stream)
      par.reproductor.silenciar(this.silenciados.has(par.asiento))
      par.medidor = this.entorno.medir(stream)
      this.emitir()
    }
    pc.onconnectionstatechange = () => {
      if (this.pares.get(id) !== par) return
      const s = pc.connectionState
      par.estado = s === 'connected' ? 'conectado' : s === 'failed' || s === 'closed' ? 'cortado' : 'conectando'
      // Si falla la que armaste vos, se vuelve a armar (el otro la cierra al llegar la oferta nueva).
      if (s === 'failed' && par.oferente) this.reintentar(par)
      this.emitir()
    }
    return par
  }

  private async ofrecer(par: Par) {
    const pc = par.pc
    try {
      if (this.microfono) for (const t of this.microfono.getAudioTracks()) pc.addTrack(t, this.microfono)
      else pc.addTransceiver('audio', { direction: 'recvonly' })
      const oferta = await pc.createOffer()
      await pc.setLocalDescription(oferta)
      if (this.pares.get(par.id) !== par) return
      this.mandar(par.id, { tipo: 'oferta', sdp: pc.localDescription?.sdp ?? oferta.sdp ?? '' })
    } catch (e) {
      console.warn('Voz: no se pudo ofrecer la conexión', e)
      par.estado = 'cortado'
      this.emitir()
    }
  }

  private reintentar(par: Par) {
    const t = setTimeout(() => {
      this.reintentos.delete(t)
      if (!this.activa || this.yo === null || this.pares.get(par.id) !== par) return
      const asiento = this.conocidos.get(par.id)
      this.cerrarPar(par.id)
      if (asiento !== undefined) void this.ofrecer(this.crearPar(par.id, asiento, true))
      this.emitir()
    }, REINTENTO_MS)
    this.reintentos.add(t)
  }

  private async vaciarPendientes(par: Par) {
    const pendientes = par.pendientes
    par.pendientes = []
    for (const c of pendientes) await par.pc.addIceCandidate(c).catch(() => {})
  }

  private mandar(a: number, senal: SenalVoz) {
    this.enviar('senalVoz', { a, senal })
  }

  private cerrarPar(id: number) {
    const par = this.pares.get(id)
    if (!par) return
    this.pares.delete(id)
    par.pc.onicecandidate = null
    par.pc.ontrack = null
    par.pc.onconnectionstatechange = null
    par.pc.close()
    par.reproductor?.cerrar()
    par.medidor?.soltar()
  }

  private cerrarPares() {
    for (const t of this.reintentos) clearTimeout(t)
    this.reintentos.clear()
    for (const id of [...this.pares.keys()]) this.cerrarPar(id)
  }

  private aplicarMicrofono() {
    const enviar = this.transmitiendo
    for (const t of this.microfono?.getAudioTracks() ?? []) t.enabled = enviar
  }

  private soltarMicrofono() {
    this.medidorPropio?.soltar()
    this.medidorPropio = null
    for (const t of this.microfono?.getTracks() ?? []) t.stop()
    this.microfono = null
  }

  private medir() {
    const niveles: Record<number, number> = {}
    const propio = this.yo !== null ? this.conocidos.get(this.yo) : undefined
    // Con el micrófono cerrado no se mide (la pista callada igual puede traer algo un instante).
    if (propio !== undefined && this.medidorPropio && this.transmitiendo) niveles[propio] = this.medidorPropio.nivel()
    for (const p of this.pares.values()) {
      if (p.medidor && !this.silenciados.has(p.asiento)) niveles[p.asiento] = p.medidor.nivel()
    }
    const cambio =
      Object.keys(niveles).length !== Object.keys(this.niveles).length ||
      Object.entries(niveles).some(([a, n]) => this.niveles[Number(a)] !== n)
    if (!cambio) return
    this.niveles = niveles
    this.emitir()
  }

  private emitir() {
    this.alCambiar({
      asientoPropio: this.yo !== null ? (this.conocidos.get(this.yo) ?? null) : null,
      pares: [...this.pares.values()].map((p) => ({ id: p.id, asiento: p.asiento, estado: p.estado, conAudio: p.reproductor !== null })),
      niveles: this.niveles,
    })
  }
}
