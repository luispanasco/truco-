import { create } from 'zustand'
import { mismaCarta } from '@truco/engine'
import type { Carta, CartasMostradas, Evento, ResultadoEnfrentamiento, ResultadoVuelta, VistaPartida } from '@truco/engine'
import type { Senia } from '@truco/bots'
import { describirEvento, TEXTO_CANTO, type InfoSala, type MensajeChat, type MensajesCliente } from '@truco/shared'
import type { Conexion, EstadoConexion, MensajeServidor } from './conexion/tipos'
import { sonarEvento } from './sonido'

export interface Jugada {
  asiento: number
  carta: Carta
  /** Vuelta en la que se tiró (0, 1 o 2). */
  vuelta: number
}

/**
 * Las cartas que quedan en la mesa: todas las del enfrentamiento en curso, cada jugador
 * las suyas frente a sí, una por vuelta. Se levantan al terminar la mano (o el duelo).
 */
export interface MesaVisible {
  jugadas: Jugada[]
  /** Las vueltas ya cerradas, en orden. */
  vueltas: { resultado: ResultadoVuelta; ganador: number | null }[]
}

/** Cartas sin jugar que alguien da vuelta al terminar la mano, con su tanto ("Flor de 33"). */
export interface Mostradas extends CartasMostradas {
  etiqueta: string
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
  /** Señas de los rivales que alcanzaste a ver (sin la carta si la sala no la deja ver). */
  pescadas: { de: number; senia: Senia | null; id: number }[]
  turno: { asientos: number[]; venceEn: number | null }
  error: { motivo: string; id: number } | null
  /** Solo online: si hay conexión con el servidor. */
  estadoConexion: EstadoConexion
  /** Cola pública: el servidor ofrece jugar contra un bot porque no aparece nadie. */
  ofrecerBot: boolean
  /** Resultado de la mano que acaba de terminar, mientras dura la pausa entre manos. */
  finDeMano: string | null
  /** Cartas que se dieron vuelta al terminar (flor o envido ganado), mientras dura la pausa. */
  mostradas: Mostradas[]

  conectar(conexion: Conexion): void
  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]): void
  salir(): void
}

const MESA_VACIA: MesaVisible = { jugadas: [], vueltas: [] }
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
    // Suena junto con lo que se ve (el globo del canto, la carta): la vista todavía es la de
    // antes del evento, así se sabe cuántos fósforos se suman.
    sonarEvento(ev, get().vista?.puntos)
    switch (ev.tipo) {
      case 'cartaJugada':
        set((s) => ({
          mesa: { ...s.mesa, jugadas: [...s.mesa.jugadas, { asiento: ev.asiento, carta: ev.carta, vuelta: s.mesa.vueltas.length }] },
        }))
        break
      case 'vueltaTerminada':
        set((s) => ({ mesa: { ...s.mesa, vueltas: [...s.mesa.vueltas, { resultado: ev.resultado, ganador: ev.ganador }] } }))
        break
      case 'enfrentamientoIniciado':
        // Arranca un duelo o una mano nueva: lo del anterior se levanta.
        set({ mesa: MESA_VACIA })
        break
      case 'enfrentamientoTerminado':
        set({ mostradas: etiquetarMostradas(ev.resultado, get().vista) })
        break
      case 'cantoTruco':
      case 'cantoFlor':
        mostrarGlobo(ev.asiento, `¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'cantoEnvido':
        mostrarGlobo(ev.asiento, `${ev.primeroEstaElEnvido ? 'Envido va primero. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`)
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
      set({ finDeMano: null, mesa: MESA_VACIA, mostradas: [] })
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
        // La vista manda: así la mesa queda bien también al volver tras recargar la página.
        // Lo mostrado al terminar queda solo si terminó la partida (no hay pausa que lo limpie).
        set((s) => ({
          vista: m.datos,
          mesa: mesaDesdeVista(m.datos, s.mesa),
          ...(m.datos.ganador === null && s.mostradas.length > 0 ? { mostradas: [] } : {}),
        }))
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
      case 'seniaPescada':
        set((s) => ({ pescadas: [...s.pescadas.slice(-20), { ...m.datos, id: ++contador }] }))
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
    pescadas: [],
    turno: { asientos: [], venceEn: null },
    error: null,
    finDeMano: null,
    mostradas: [],
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
        pescadas: [],
        turno: { asientos: [], venceEn: null },
        error: null,
        finDeMano: null,
        mostradas: [],
        estadoConexion: 'conectada',
        ofrecerBot: false,
      })
    },
  }
})

/** Las cartas del enfrentamiento en curso según la vista; si no cambió nada, deja la mesa como está. */
function mesaDesdeVista(v: VistaPartida, antes: MesaVisible): MesaVisible {
  const e = v.mano.enfrentamientos[v.mano.actual]
  if (!e) return MESA_VACIA
  const jugadas = e.vueltas.flatMap((vu, i) => vu.jugadas.map((j) => ({ asiento: j.asiento, carta: j.carta, vuelta: i })))
  const vueltas = e.vueltas.flatMap((vu) => (vu.resultado === null ? [] : [{ resultado: vu.resultado, ganador: vu.ganador }]))
  const igual =
    vueltas.length === antes.vueltas.length &&
    jugadas.length === antes.jugadas.length &&
    jugadas.every((j, i) => {
      const a = antes.jugadas[i]!
      return a.asiento === j.asiento && a.vuelta === j.vuelta && mismaCarta(a.carta, j.carta)
    })
  return igual ? antes : { jugadas, vueltas }
}

/** "Flor de 33" o "Envido 31": el tanto real de quien muestra, según por qué las muestra. */
function etiquetarMostradas(r: ResultadoEnfrentamiento, v: VistaPartida | null): Mostradas[] {
  // La vista todavía es la del enfrentamiento que terminó: ahí figura quién cantó flor.
  const e = v?.mano.enfrentamientos[v.mano.actual]
  return (r.mostradas ?? []).map((m) => {
    const t = r.revelados.find((x) => x.asiento === m.asiento)
    const cantoFlor = e ? e.flor.cantadas.some((f) => f.asiento === m.asiento) : t?.flor != null
    const etiqueta = !t ? '' : cantoFlor && t.flor !== null ? `Flor de ${t.flor}` : `Envido ${t.envido}`
    return { ...m, etiqueta }
  })
}
