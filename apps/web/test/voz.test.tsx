import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { crearConfig, crearPartida, vistaPara } from '@truco/engine'
import { ICE_DEFAULT, SENIAS_DEFAULT, type EstadoVoz, type InfoSala, type MensajesCliente } from '@truco/shared'
import { AnilloVoz, ControlesVoz } from '../src/componentes/ControlesVoz'
import { MenuJugador } from '../src/componentes/MenuJugador'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'
import { leerPerfil } from '../src/perfil'
import { usarEntornoVoz, useVoz } from '../src/voz/estado'
import { MallaVoz, nivelDeRms, type EntornoVoz } from '../src/voz/malla'

// ── Navegador de mentira: conexiones WebRTC, micrófono y audio ──────

class PcFalsa {
  static todas: PcFalsa[] = []
  onicecandidate: ((ev: { candidate: unknown }) => void) | null = null
  ontrack: ((ev: { streams: unknown[]; track: unknown }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  connectionState = 'new'
  localDescription: { type: string; sdp: string } | null = null
  remoteDescription: { type: string; sdp: string } | null = null
  senders: { track: unknown }[] = []
  transceivers: unknown[] = []
  candidatos: unknown[] = []
  cerrada = false
  constructor(readonly config: { iceServers: unknown }) {
    PcFalsa.todas.push(this)
  }
  addTrack(track: unknown) {
    this.senders.push({ track })
  }
  addTransceiver(_tipo: string, init: unknown) {
    this.transceivers.push(init)
  }
  getSenders() {
    return this.senders
  }
  async createOffer() {
    return { type: 'offer', sdp: 'oferta' }
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'respuesta' }
  }
  async setLocalDescription(d: { type: string; sdp: string }) {
    this.localDescription = d
  }
  async setRemoteDescription(d: { type: string; sdp: string }) {
    this.remoteDescription = d
  }
  async addIceCandidate(c: unknown) {
    this.candidatos.push(c)
  }
  close() {
    this.cerrada = true
  }
  /** Como si llegara el audio del otro. */
  llegaAudio() {
    this.ontrack?.({ streams: [{ id: 'remoto' }], track: {} })
  }
}

function entornoFalso({ negar = false } = {}) {
  const pista = { enabled: true, detenida: false, stop: () => (pista.detenida = true) }
  const microfono = { getAudioTracks: () => [pista], getTracks: () => [pista] }
  const reproductores: { silenciado: boolean; cerrado: boolean }[] = []
  let pedidos = 0
  const entorno: EntornoVoz = {
    crearConexion: (config) => new PcFalsa(config as { iceServers: unknown }) as unknown as RTCPeerConnection,
    pedirMicrofono: async () => {
      pedidos++
      if (negar) throw Object.assign(new Error('no'), { name: 'NotAllowedError' })
      return microfono as unknown as MediaStream
    },
    reproducir: () => {
      const r = { silenciado: false, cerrado: false }
      reproductores.push(r)
      return { silenciar: (s) => void (r.silenciado = s), cerrar: () => void (r.cerrado = true) }
    },
    medir: () => ({ nivel: () => 0, soltar: () => {} }),
    cerrar: () => {},
  }
  return { entorno, pista, reproductores, pedidos: () => pedidos }
}

const esperar = () => new Promise((r) => setTimeout(r, 0))

function estadoVoz(yo: number | null, participantes: [number, number][]): EstadoVoz {
  return { activa: true, yo, participantes: participantes.map(([id, asiento]) => ({ id, asiento })), servidoresIce: ICE_DEFAULT }
}

beforeEach(() => {
  PcFalsa.todas = []
})

describe('la malla de voz', () => {
  it('el que llega ofrece a los que ya estaban; con los que llegan después espera su oferta', async () => {
    const { entorno } = entornoFalso()
    const enviados: { tipo: string; datos: unknown }[] = []
    const m = new MallaVoz((tipo, datos) => void enviados.push({ tipo, datos }), entorno, () => {})
    expect(await m.activar({ abierto: true, pulsar: false })).toBe('listo')
    expect(enviados).toEqual([{ tipo: 'voz', datos: { activa: true } }])

    m.alEstado(estadoVoz(3, [[1, 0], [2, 2], [3, 1]]))
    await esperar()
    expect(PcFalsa.todas).toHaveLength(2)
    expect(PcFalsa.todas[0]!.config.iceServers).toEqual(ICE_DEFAULT)
    expect(PcFalsa.todas.every((pc) => pc.senders.length === 1)).toBe(true)
    expect(enviados.filter((e) => e.tipo === 'senalVoz')).toEqual([
      { tipo: 'senalVoz', datos: { a: 1, senal: { tipo: 'oferta', sdp: 'oferta' } } },
      { tipo: 'senalVoz', datos: { a: 2, senal: { tipo: 'oferta', sdp: 'oferta' } } },
    ])

    // Un candidato que llega antes que la respuesta espera; con la respuesta, entra.
    const candidato = { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }
    await m.alSenal(1, { tipo: 'candidato', candidato })
    expect(PcFalsa.todas[0]!.candidatos).toEqual([])
    await m.alSenal(1, { tipo: 'respuesta', sdp: 'r' })
    expect(PcFalsa.todas[0]!.remoteDescription).toEqual({ type: 'answer', sdp: 'r' })
    expect(PcFalsa.todas[0]!.candidatos).toEqual([candidato])

    // Llega uno nuevo: no se le ofrece, se le contesta.
    enviados.length = 0
    m.alEstado(estadoVoz(3, [[1, 0], [2, 2], [3, 1], [4, 3]]))
    await esperar()
    expect(PcFalsa.todas).toHaveLength(2)
    await m.alSenal(4, { tipo: 'oferta', sdp: 'o4' })
    expect(PcFalsa.todas).toHaveLength(3)
    expect(PcFalsa.todas[2]!.remoteDescription).toEqual({ type: 'offer', sdp: 'o4' })
    expect(PcFalsa.todas[2]!.senders).toHaveLength(1)
    expect(enviados).toContainEqual({ tipo: 'senalVoz', datos: { a: 4, senal: { tipo: 'respuesta', sdp: 'respuesta' } } })
    // Una oferta de uno que llegó antes no corresponde (ofrece siempre el último).
    await m.alSenal(2, { tipo: 'oferta', sdp: 'cruzada' })
    expect(PcFalsa.todas).toHaveLength(3)
  })

  it('quien se va cierra su conexión y su audio; al cortarse se cierra todo y al volver se entra de nuevo', async () => {
    const { entorno, reproductores } = entornoFalso()
    const enviados: { tipo: string; datos: unknown }[] = []
    const m = new MallaVoz((tipo, datos) => void enviados.push({ tipo, datos }), entorno, () => {})
    await m.activar({ abierto: true, pulsar: false })
    m.alEstado(estadoVoz(5, [[1, 0], [2, 1], [5, 2]]))
    await esperar()
    PcFalsa.todas[0]!.llegaAudio()
    expect(reproductores).toHaveLength(1)
    m.alEstado(estadoVoz(5, [[2, 1], [5, 2]]))
    expect(PcFalsa.todas[0]!.cerrada).toBe(true)
    expect(reproductores[0]!.cerrado).toBe(true)
    expect(PcFalsa.todas[1]!.cerrada).toBe(false)

    m.alCortarse()
    expect(PcFalsa.todas[1]!.cerrada).toBe(true)
    enviados.length = 0
    m.alReconectarse()
    expect(enviados).toEqual([{ tipo: 'voz', datos: { activa: true } }])
    // Con el número nuevo vuelve a ofrecer a los que estaban.
    m.alEstado(estadoVoz(7, [[2, 1], [7, 2]]))
    await esperar()
    expect(PcFalsa.todas).toHaveLength(3)
    expect(PcFalsa.todas[2]!.cerrada).toBe(false)
  })

  it('mute propio, mantener para hablar y silenciar a otro', async () => {
    const { entorno, pista, reproductores } = entornoFalso()
    const m = new MallaVoz(() => {}, entorno, () => {})
    await m.activar({ abierto: true, pulsar: false })
    expect(pista.enabled).toBe(true)
    m.cambiarAbierto(false)
    expect(pista.enabled).toBe(false)
    m.cambiarAbierto(true)
    m.cambiarPulsar(true)
    expect(pista.enabled).toBe(false)
    m.cambiarPulsando(true)
    expect(pista.enabled).toBe(true)
    m.cambiarPulsando(false)
    expect(pista.enabled).toBe(false)

    m.alEstado(estadoVoz(2, [[1, 1], [2, 0]]))
    await esperar()
    PcFalsa.todas[0]!.llegaAudio()
    m.silenciar(1, true)
    expect(reproductores[0]!.silenciado).toBe(true)
    m.silenciar(1, false)
    expect(reproductores[0]!.silenciado).toBe(false)
    // Lo silenciado sigue al asiento: si se silencia antes de que llegue el audio, llega callado.
    m.silenciar(3, true)
    m.alEstado(estadoVoz(4, [[1, 1], [3, 3], [4, 0]]))
    await esperar()
    PcFalsa.todas.at(-1)!.llegaAudio()
    expect(reproductores.at(-1)!.silenciado).toBe(true)
  })

  it('sin permiso para el micrófono entra igual, solo para escuchar; al cerrar suelta todo', async () => {
    const negado = entornoFalso({ negar: true })
    const enviados: { tipo: string; datos: unknown }[] = []
    const m = new MallaVoz((tipo, datos) => void enviados.push({ tipo, datos }), negado.entorno, () => {})
    expect(await m.activar({ abierto: true, pulsar: false })).toBe('negado')
    expect(enviados).toEqual([{ tipo: 'voz', datos: { activa: true } }])
    m.alEstado(estadoVoz(2, [[1, 0], [2, 1]]))
    await esperar()
    expect(PcFalsa.todas[0]!.senders).toEqual([])
    expect(PcFalsa.todas[0]!.transceivers).toEqual([{ direction: 'recvonly' }])

    const { entorno, pista } = entornoFalso()
    const m2 = new MallaVoz(() => {}, entorno, () => {})
    await m2.activar({ abierto: true, pulsar: false })
    m2.alEstado(estadoVoz(9, [[8, 0], [9, 1]]))
    await esperar()
    m2.cerrar()
    expect(pista.detenida).toBe(true)
    expect(PcFalsa.todas.at(-1)!.cerrada).toBe(true)
  })

  it('el nivel del audio va en escalones de un cuarto', () => {
    expect(nivelDeRms(0)).toBe(0)
    expect(nivelDeRms(0.0005)).toBe(0)
    expect(nivelDeRms(0.005)).toBe(0.25)
    expect(nivelDeRms(0.05)).toBe(0.75)
    expect(nivelDeRms(0.5)).toBe(1)
  })
})

// ── Los controles en la mesa ───────────────────────────────────────

/** Conexión online de mentira, con varios oyentes (la mesa y la voz escuchan las dos). */
function conexionFalsa() {
  const oyentes = new Set<(m: MensajeServidor) => void>()
  const enviados: { tipo: keyof MensajesCliente; datos: unknown }[] = []
  const c = {
    tipo: 'online' as const,
    roomId: 'VOZ01',
    enviar: (tipo: keyof MensajesCliente, datos: unknown) => void enviados.push({ tipo, datos }),
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyentes.add(o)
      return () => void oyentes.delete(o)
    },
    salir: () => {},
  }
  return { c: c as Conexion, enviados, llegar: (m: MensajeServidor) => act(() => oyentes.forEach((o) => o(m))) }
}

function sala(voz: boolean, formato: '1v1' | '2v2' = '1v1'): InfoSala {
  const n = formato === '1v1' ? 2 : 4
  return {
    codigo: 'VOZ01',
    publica: false,
    tiempos: { turnoS: 30, primeraJugadaS: 60 },
    cartasJugadas: 'quedan',
    tirarReyes: 'no',
    voz,
    mesa: 'boliche',
    baraja: 'propia',
    fase: 'jugando',
    formato,
    config: crearConfig({ formato }),
    botsEnVacios: true,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    chatEquipo: n > 2,
    lugares: Array.from({ length: n }, (_, a) => ({
      asiento: a,
      tipo: a < 2 ? ('humano' as const) : ('bot' as const),
      apodo: ['Luis', 'Ana', 'Bot 1', 'Bot 2'][a]!,
      avatar: null,
      conectado: a < 2,
      anfitrion: a === 0,
    })),
    yo: 0,
    revancha: [],
  }
}

afterEach(() => {
  act(() => {
    useVoz.getState().desactivar()
    useJuego.getState().salir()
  })
  usarEntornoVoz(null)
  cleanup()
  localStorage.clear()
})

function conVoz(voz = true, entorno = entornoFalso()) {
  usarEntornoVoz(() => entorno.entorno)
  const f = conexionFalsa()
  act(() => useJuego.getState().conectar(f.c))
  f.llegar({ tipo: 'sala', datos: sala(voz) })
  return { ...f, ...entorno }
}

describe('los controles de la voz', () => {
  it('no aparecen si la sala no tiene voz', () => {
    conVoz(false)
    render(<ControlesVoz />)
    expect(screen.queryByRole('button', { name: /voz/i })).toBeNull()
  })

  it('el micrófono se pide recién al activar; después se cierra y se abre desde el panel', async () => {
    const { enviados, pista, pedidos } = conVoz()
    render(<ControlesVoz />)
    expect(pedidos()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Activar la voz' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chat de voz: micrófono abierto' })).toBeTruthy())
    expect(pedidos()).toBe(1)
    expect(enviados).toContainEqual({ tipo: 'voz', datos: { activa: true } })

    fireEvent.click(screen.getByRole('button', { name: 'Chat de voz: micrófono abierto' }))
    const panel = screen.getByRole('dialog', { name: 'Chat de voz' })
    expect(within(panel).getByText('Todavía no hay nadie más en la voz.')).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar el micrófono' }))
    expect(pista.enabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Chat de voz: micrófono cerrado' })).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Abrir el micrófono' }))
    expect(pista.enabled).toBe(true)

    fireEvent.click(within(panel).getByRole('button', { name: 'Salir de la voz' }))
    expect(enviados.at(-1)).toEqual({ tipo: 'voz', datos: { activa: false } })
    expect(pista.detenida).toBe(true)
    expect(screen.getByRole('button', { name: 'Activar la voz' })).toBeTruthy()
  })

  it('sin permiso para el micrófono se escucha igual, con un aviso claro', async () => {
    const { enviados } = conVoz(true, entornoFalso({ negar: true }))
    render(<ControlesVoz />)
    fireEvent.click(screen.getByRole('button', { name: 'Activar la voz' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/No diste permiso.*escuchás a los demás/))
    expect(screen.getByRole('button', { name: 'Chat de voz: solo escuchás' })).toBeTruthy()
    expect(enviados).toContainEqual({ tipo: 'voz', datos: { activa: true } })
    expect(screen.queryByRole('button', { name: 'Cerrar el micrófono' })).toBeNull()
  })

  it('mantener apretado para hablar: se guarda en el perfil y el micrófono se abre solo mientras se aprieta', async () => {
    const { pista } = conVoz()
    render(<ControlesVoz />)
    fireEvent.click(screen.getByRole('button', { name: 'Activar la voz' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chat de voz: micrófono abierto' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Chat de voz: micrófono abierto' }))
    fireEvent.click(screen.getByRole('switch', { name: /Mantener apretado para hablar/ }))
    expect(leerPerfil().vozPulsar).toBe(true)
    expect(pista.enabled).toBe(false)
    const hablar = screen.getByRole('button', { name: 'Mantené apretado para hablar' })
    fireEvent.pointerDown(hablar, { pointerId: 1 })
    expect(pista.enabled).toBe(true)
    expect(hablar.textContent).toContain('Hablando')
    fireEvent.pointerUp(hablar, { pointerId: 1 })
    expect(pista.enabled).toBe(false)
  })

  it('desde el menú de otro jugador se deja de escuchar su voz, y su anillo lo muestra', async () => {
    const { llegar } = conVoz()
    render(<ControlesVoz />)
    fireEvent.click(screen.getByRole('button', { name: 'Activar la voz' }))
    await waitFor(() => expect(useVoz.getState().activa).toBe(true))
    llegar({ tipo: 'voz', datos: estadoVoz(2, [[1, 1], [2, 0]]) })
    const ana = sala(true).lugares[1]!
    const { container } = render(
      <>
        <AnilloVoz asiento={1} />
        <MenuJugador lugar={ana} silenciado={false} alSilenciar={() => {}} alReportar={() => {}} alCerrar={() => {}} />
      </>,
    )
    expect(container.querySelector('.anillo-voz')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar su voz' }))
    expect(useVoz.getState().silenciados).toEqual([1])
    expect(container.querySelector('.anillo-voz.silenciado')).toBeTruthy()
  })

  it('el anillo crece con el nivel de quien habla y no aparece si no estás en la voz', () => {
    const { container } = render(<AnilloVoz asiento={1} />)
    expect(container.querySelector('.anillo-voz')).toBeNull()
    act(() => useVoz.setState({ activa: true, enVoz: [0, 1], niveles: { 1: 0.75 } }))
    const anillo = container.querySelector<HTMLElement>('.anillo-voz.hablando')!
    expect(anillo.style.getPropertyValue('--nivel')).toBe('0.75')
    act(() => useVoz.setState({ niveles: {} }))
    expect(container.querySelector('.anillo-voz.hablando')).toBeNull()
    act(() => useVoz.setState({ activa: false, enVoz: [] }))
  })
})

describe('con voz, el pie igual les dice a sus bots qué jugar', () => {
  it('en la mesa está el botón del pie, con voz y sin voz', async () => {
    for (const voz of [false, true]) {
      const f = conexionFalsa()
      act(() => useJuego.getState().conectar(f.c))
      const estado = crearPartida({
        jugadores: [0, 1, 2, 3].map((a) => ({ id: `j${a}`, nombre: `J${a}`, bot: a >= 2 })),
        semilla: 3,
        config: crearConfig({ formato: '2v2' }),
        reparte: 3,
      })
      render(
        <MemoryRouter>
          <Mesa />
        </MemoryRouter>,
      )
      f.llegar({ tipo: 'sala', datos: sala(voz, '2v2') })
      f.llegar({ tipo: 'vista', datos: vistaPara(estado, 'j0') })
      await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy())
      expect(screen.queryByRole('button', { name: /pie/i })).toBeTruthy()
      act(() => useJuego.getState().salir())
      cleanup()
    }
  })
})
