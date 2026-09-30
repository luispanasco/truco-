import { create } from 'zustand'
import type { Carta, Evento, ResultadoVuelta, VistaPartida } from '@truco/engine'
import type { Senia } from '@truco/bots'
import { describirEvento, TEXTO_CANTO, type InfoSala, type MensajeChat, type MensajesCliente } from '@truco/shared'
import type { Conexion, EstadoConexion, MensajeServidor } from './conexion/tipos'

export interface Jugada {
  asiento: number
  carta: Carta
}

/** Las cartas que se ven en el centro: la vuelta en curso, o la última cerrada hasta que alguien tire. */
export interface MesaVisible {
  jugadas: Jugada[]
  cerrada: boolean
  resultado: ResultadoVuelta | null
  /** Asiento que ganó la vuelta cerrada. */
  ganador: number | null
}

export interface Globo {
  texto: string
  id: number
}

export interface LineaRegistro {
  id: number
  texto: string
}

interface EstadoJuego {
  conexion: Conexion | null
  sala: InfoSala | null
  vista: VistaPartida | null
  mesa: MesaVisible
  /** Globo de texto sobre el avatar de quien canta, por asiento. */
  globos: Record<number, Globo>
  registro: LineaRegistro[]
  chat: MensajeChat[]
  senias: { de: number; senia: Senia; id: number }[]
  turno: { asientos: number[]; venceEn: number | null }
  error: { motivo: string; id: number } | null
  /** Solo online: si hay conexión con el servidor. */
  estadoConexion: EstadoConexion
  /** Cola pública: el servidor ofrece jugar contra un bot porque no aparece nadie. */
  ofrecerBot: boolean
  /** Resultado de la mano que acaba de terminar, mientras dura la pausa entre manos. */
  finDeMano: string | null

  conectar(conexion: Conexion): void
  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]): void
  salir(): void
}

const MESA_VACIA: MesaVisible = { jugadas: [], cerrada: false, resultado: null, ganador: null }
const DURACION_GLOBO = 2600
/**
 * Al terminar una mano, las cartas quedan a la vista este tiempo con el resultado y después
 * se levantan. Lo que llegue mientras tanto (la mano nueva) espera en cola.
 */
export const PAUSA_ENTRE_MANOS = 2500

let contador = 0
let desuscribir: (() => void) | null = null
let desuscribirEstado: (() => void) | null = null
let enPausa = false
let cola: MensajeServidor[] = []
let timerPausa: ReturnType<typeof setTimeout> | null = null

export const useJuego = create<EstadoJuego>()((set, get) => {
  const nombre = (a: number) => get().sala?.lugares[a]?.apodo ?? `Jugador ${a + 1}`
  const yo = () => get().sala?.yo ?? 0
  const enEquipos = () => (get().sala?.lugares.length ?? 2) > 2
  const equipo = (e: 0 | 1) => (e === yo() % 2 ? (enEquipos() ? 'nosotros' : 'vos') : enEquipos() ? 'ellos' : nombre(1 - yo()))
  const gana = (e: 0 | 1, objeto: string) => {
    if (e === yo() % 2) return enEquipos() ? `${objeto} ganamos nosotros` : `${objeto} ganás vos`
    return enEquipos() ? `${objeto} ganan ellos` : `${objeto} gana ${nombre(1 - yo())}`
  }

  const mostrarGlobo = (asiento: number, texto: string) => {
    const globo = { texto, id: ++contador }
    set((s) => ({ globos: { ...s.globos, [asiento]: globo } }))
    setTimeout(() => {
      set((s) => {
        if (s.globos[asiento]?.id !== globo.id) return s
        const { [asiento]: _, ...resto } = s.globos
        return { globos: resto }
      })
    }, DURACION_GLOBO)
  }

  const alEvento = (ev: Evento) => {
    const texto = describirEvento(ev, nombre, equipo, gana)
    if (texto) {
      // Al registro va solo la primera línea (el resultado de la mano trae varias).
      const linea = texto.trim().split('\n')[0]!.trim()
      set((s) => ({ registro: [...s.registro.slice(-40), { id: ++contador, texto: linea }] }))
    }
    switch (ev.tipo) {
      case 'cartaJugada':
        set((s) => ({
          mesa: s.mesa.cerrada
            ? { ...MESA_VACIA, jugadas: [{ asiento: ev.asiento, carta: ev.carta }] }
            : { ...s.mesa, jugadas: [...s.mesa.jugadas, { asiento: ev.asiento, carta: ev.carta }] },
        }))
        break
      case 'vueltaTerminada':
        set((s) => ({ mesa: { ...s.mesa, cerrada: true, resultado: ev.resultado, ganador: ev.ganador } }))
        break
      case 'enfrentamientoIniciado':
        // Arranca un duelo o una mano nueva: lo que quede en la mesa se levanta con la próxima carta.
        set((s) => ({ mesa: { ...s.mesa, cerrada: true } }))
        break
      case 'cantoTruco':
      case 'cantoFlor':
        mostrarGlobo(ev.asiento, `¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'cantoEnvido':
        mostrarGlobo(ev.asiento, `${ev.primeroEstaElEnvido ? 'Primero está el envido. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'respuesta':
        mostrarGlobo(ev.asiento, ev.respuesta === 'quiero' ? '¡Quiero!' : 'No quiero')
        break
      case 'tantoDeclarado':
        mostrarGlobo(ev.asiento, ev.tanto === null ? 'Son buenas' : String(ev.tanto))
        break
      case 'alMazo':
        mostrarGlobo(ev.asiento, 'Me voy al mazo')
        break
    }
  }

  /** Pausa entre manos: muestra el resultado, deja las cartas y después levanta la mesa. */
  const pausar = (texto: string | null) => {
    enPausa = true
    set({ finDeMano: texto })
    timerPausa = setTimeout(() => {
      timerPausa = null
      enPausa = false
      set({ finDeMano: null, mesa: MESA_VACIA })
      const pendientes = cola
      cola = []
      for (const m of pendientes) alMensaje(m)
    }, PAUSA_ENTRE_MANOS)
  }

  const alEventos = (eventos: Evento[]) => {
    const terminaPartida = eventos.some((ev) => ev.tipo === 'partidaTerminada')
    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i]!
      alEvento(ev)
      if (ev.tipo === 'enfrentamientoTerminado' && !terminaPartida) {
        // El resto (puntos, reparto nuevo) se muestra después de la pausa.
        const texto = describirEvento(ev, nombre, equipo, gana)
        const resto = eventos.slice(i + 1)
        pausar(texto?.trim() ?? null)
        if (resto.length > 0) cola.push({ tipo: 'eventos', datos: resto })
        return
      }
    }
  }

  const alMensaje = (m: MensajeServidor) => {
    // Durante la pausa, todo lo de la mano nueva espera (el chat y los errores no).
    if (enPausa && m.tipo !== 'chat' && m.tipo !== 'error') {
      cola.push(m)
      return
    }
    switch (m.tipo) {
      case 'sala':
        set({ sala: m.datos, ...(m.datos.fase !== 'esperando' ? { ofrecerBot: false } : {}) })
        break
      case 'vista':
        set({ vista: m.datos })
        break
      case 'eventos':
        alEventos(m.datos)
        break
      case 'turno':
        set({ turno: m.datos })
        break
      case 'chat':
        set((s) => ({ chat: [...s.chat.slice(-99), m.datos] }))
        break
      case 'senia':
        set((s) => ({ senias: [...s.senias.slice(-20), { ...m.datos, id: ++contador }] }))
        break
      case 'error':
        set({ error: { motivo: m.datos.motivo, id: ++contador } })
        break
      case 'ofrecerBot':
        set({ ofrecerBot: true })
        break
    }
  }

  return {
    conexion: null,
    sala: null,
    vista: null,
    mesa: MESA_VACIA,
    globos: {},
    registro: [],
    chat: [],
    senias: [],
    turno: { asientos: [], venceEn: null },
    error: null,
    finDeMano: null,
    estadoConexion: 'conectada',
    ofrecerBot: false,

    conectar(conexion) {
      get().salir()
      set({ conexion })
      desuscribir = conexion.escuchar(alMensaje)
      desuscribirEstado = conexion.observarEstado?.((estadoConexion) => set({ estadoConexion })) ?? null
    },

    enviar(tipo, datos) {
      get().conexion?.enviar(tipo, datos)
    },

    salir() {
      desuscribir?.()
      desuscribir = null
      desuscribirEstado?.()
      desuscribirEstado = null
      if (timerPausa) clearTimeout(timerPausa)
      timerPausa = null
      enPausa = false
      cola = []
      get().conexion?.salir()
      set({
        conexion: null,
        sala: null,
        vista: null,
        mesa: MESA_VACIA,
        globos: {},
        registro: [],
        chat: [],
        senias: [],
        turno: { asientos: [], venceEn: null },
        error: null,
        finDeMano: null,
        estadoConexion: 'conectada',
        ofrecerBot: false,
      })
    },
  }
})
