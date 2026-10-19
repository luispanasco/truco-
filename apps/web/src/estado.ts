import { create } from 'zustand'
import { mismaCarta, nombreCarta } from '@truco/engine'
import type { Carta, CartasMostradas, Evento, ResultadoEnfrentamiento, ResultadoVuelta, TipoCorte, VistaPartida } from '@truco/engine'
import type { Senia } from '@truco/bots'
import {
  describirEvento,
  TEXTO_CANTO,
  TEXTO_CORTE,
  TEXTO_ORDEN,
  type InfoSala,
  type LugarPublico,
  type MensajeChat,
  type MensajesCliente,
  type MensajesServidor,
} from '@truco/shared'
import type { Conexion, EstadoConexion, MensajeServidor } from './conexion/tipos'
import { sonarEfecto, sonarEvento } from './sonido'
import { aplicarTemaDeSala, aplicarTemaPropio } from './temaSala'
import { planReyes } from './tiradaReyes'
import { useCuenta } from './cuenta/cuenta'
import { CORTE_MS, GIRO_MS, REPARTO_MS } from './componentes/Mazo'

export interface Jugada {
  asiento: number
  /** null: no la podés ver (tapada, o pieza de otro duelo en el pica-pica). */
  carta: Carta | null
  tapada?: boolean
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
  /**
   * Señas de tus compañeros, con la mano en que te las hicieron (y si fue una repetición).
   * La de envido trae el número (`tanto`), que pone el servidor.
   */
  senias: { de: number; senia: Senia; mano: number; repetida?: boolean; tanto?: number; id: number }[]
  /** El último compañero que te pidió que le repitas las señas. */
  pedidoSenias: { de: number; id: number } | null
  /** Señas de los rivales que alcanzaste a ver (sin la carta si la sala no la deja ver). */
  pescadas: { de: number; senia: Senia | null; tanto?: number; id: number }[]
  /** `pie`: si le toca a tu bot y se espera que le digas qué jugar (sos su pie). */
  turno: { asientos: number[]; venceEn: number | null; pie?: number }
  error: { motivo: string; id: number } | null
  /** Solo online: si hay conexión con el servidor. */
  estadoConexion: EstadoConexion
  /** Cola pública: el servidor ofrece jugar contra un bot porque no aparece nadie. */
  ofrecerBot: boolean
  /** Resultado de la mano que acaba de terminar, mientras dura la pausa entre manos. */
  finDeMano: string | null
  /** Cartas que se dieron vuelta al terminar (flor o envido ganado), mientras dura la pausa. */
  mostradas: Mostradas[]
  /**
   * Los reyes que se tiraron antes de empezar, mientras se muestran: en la mesa (`enMesa`,
   * con los lugares y tu asiento de antes de reacomodarse) o, con movimiento reducido, en un cuadro.
   */
  reyes: ReyesEnCurso | null
  /** Te sacaron de la mesa. */
  expulsado: string | null
  /** Fase 2: lo que cobraste por la partida que terminó (solo con tu cuenta). */
  monedas: MensajesServidor['monedas'] | null
  /** Fase 2: cómo se movió tu Elo en la partida que terminó (solo entre personas con cuenta). */
  elo: MensajesServidor['elo'] | null
  /** El último corte del mazo: la mesa lo anima antes de mostrar la muestra y repartir. */
  corte: { asiento: number; corte: TipoCorte; id: number } | null
  cerrarReyes(): void

  conectar(conexion: Conexion): void
  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]): void
  salir(): void
}

export type ReyesEnCurso = MensajesServidor['reyes'] & {
  id: number
  enMesa: boolean
  /** Los lugares y tu asiento al tirar (contra la compu no hay sala antes: null y 0). */
  lugaresAntes: LugarPublico[] | null
  yoAntes: number
}

const MESA_VACIA: MesaVisible = { jugadas: [], vueltas: [] }
const DURACION_GLOBO = 2600
/**
 * Al terminar una mano, las cartas quedan a la vista este tiempo con el resultado y después
 * se levantan. Lo que llegue mientras tanto (la mano nueva) espera en cola.
 */
export const PAUSA_ENTRE_MANOS = 1000

let contador = 0
let desuscribir: (() => void) | null = null
let desuscribirEstado: (() => void) | null = null
let enPausa = false
let cola: MensajeServidor[] = []
let timerPausa: ReturnType<typeof setTimeout> | null = null
/**
 * Mientras se tiran reyes en la mesa, la primera mano espera en la misma cola que la pausa entre
 * manos (la sala no: trae los lugares nuevos). Si la mesa no avisa que terminó, se sigue igual.
 */
let enReyes = false
let timerReyes: ReturnType<typeof setTimeout> | null = null
let porReproducir: MensajeServidor[] = []
/**
 * Las señas (y las pescadas) que llegan mientras se corta y se reparte esperan a que todos tengan
 * sus cartas: si no, un compañero señaría antes de tenerlas.
 */
let seniasHasta = 0
let seniasEnEspera: MensajeServidor[] = []
let timerSenias: ReturnType<typeof setTimeout> | null = null

/** Al pasar lo que esperó a los reyes: cuánto dejar ver cada tanda antes de la siguiente. */
function esperaTras(eventos: Evento[]): number {
  if (eventos.some((e) => e.tipo === 'corte')) return 2100
  if (eventos.some((e) => e.tipo === 'cartaJugada')) return 900
  return 700
}

const movimientoReducido = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
          mesa: {
            ...s.mesa,
            jugadas: [
              ...s.mesa.jugadas,
              { asiento: ev.asiento, carta: ev.carta, vuelta: s.mesa.vueltas.length, ...(ev.tapada ? { tapada: true } : {}) },
            ],
          },
        }))
        if (ev.tapada) mostrarGlobo(ev.asiento, 'Paso')
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
        // Con "flor y truco" el globo ya lo dice todo.
        if (get().globos[ev.asiento]?.texto !== '¡Flor y truco!') mostrarGlobo(ev.asiento, `¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'cantoFlor':
        mostrarGlobo(ev.asiento, ev.yTruco ? '¡Flor y truco!' : `¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'orden':
        // El pie lo dice, sin nombrar a quién (las de qué carta tirar las ven solo él y el que la recibe).
        mostrarGlobo(ev.asiento, TEXTO_ORDEN[ev.que](ev.vamosA !== undefined ? nombre(ev.vamosA) : ''))
        break
      case 'corte':
        mostrarGlobo(ev.asiento, TEXTO_CORTE[ev.corte])
        set({ corte: { asiento: ev.asiento, corte: ev.corte, id: ++contador } })
        if (!movimientoReducido()) seniasHasta = Date.now() + CORTE_MS[ev.corte] + REPARTO_MS + (ev.corte === 'sacarMuestra' ? 0 : GIRO_MS)
        break
      case 'cantoEnvido':
        mostrarGlobo(ev.asiento, `${ev.primeroEstaElEnvido ? 'Envido va primero. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`)
        break
      case 'respuesta':
        if (ev.a === 'flor') mostrarGlobo(ev.asiento, ev.respuesta === 'quiero' ? '¡Con flor quiero!' : 'Con flor me achico')
        else mostrarGlobo(ev.asiento, ev.respuesta === 'quiero' ? '¡Quiero!' : 'No quiero')
        break
      case 'tantoDeclarado':
        mostrarGlobo(ev.asiento, ev.tanto === null ? 'Son buenas' : String(ev.tanto))
        break
      case 'florMostrada':
        mostrarGlobo(ev.asiento, String(ev.suma))
        break
      case 'florResuelta':
        // Querida la contraflor, cada uno dice su flor en el momento.
        for (const t of ev.tantos) mostrarGlobo(t.asiento, t.tanto < 0 ? 'No tenía flor' : `Flor de ${t.tanto}`)
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

  /**
   * Lo que quedó esperando durante la tirada (el corte, el reparto y, si los bots fueron
   * rápidos, las primeras jugadas) se pasa de a poco, como si recién pasara: si no, el corte
   * se pisa con las cartas que ya tiraron. Lo que llega mientras tanto espera detrás.
   */
  const reproducir = () => {
    timerReyes = null
    porReproducir.push(...cola)
    cola = []
    enReyes = false
    while (porReproducir.length > 0) {
      const m = porReproducir.shift()!
      alMensaje(m)
      if (enPausa) {
        // Terminó una mano: lo que falta va detrás de lo que dejó la pausa.
        cola = [...cola, ...porReproducir]
        porReproducir = []
        return
      }
      if (m.tipo === 'eventos' && porReproducir.some((x) => x.tipo === 'eventos')) {
        enReyes = true
        timerReyes = setTimeout(reproducir, esperaTras(m.datos))
        return
      }
    }
  }

  /** Terminó el reparto: se ven las señas que esperaban (si se volvió a cortar, siguen esperando). */
  const soltarSenias = () => {
    timerSenias = null
    const pendientes = seniasEnEspera
    seniasEnEspera = []
    for (const m of pendientes) alMensaje(m)
  }

  /** Terminó la tirada de reyes: sigue lo que quedó esperando. */
  const terminarReyes = () => {
    if (timerReyes) clearTimeout(timerReyes)
    timerReyes = null
    set({ reyes: null })
    if (enReyes) reproducir()
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
    // Mientras se tiran reyes, también; la sala no (trae los lugares nuevos y lleva a la mesa).
    if ((enPausa || (enReyes && m.tipo !== 'sala')) && m.tipo !== 'chat' && m.tipo !== 'error') {
      cola.push(m)
      return
    }
    if ((m.tipo === 'senia' || m.tipo === 'seniaPescada') && Date.now() < seniasHasta) {
      seniasEnEspera.push(m)
      timerSenias ??= setTimeout(soltarSenias, seniasHasta - Date.now())
      return
    }
    switch (m.tipo) {
      case 'sala':
        // Online, la mesa y la baraja son las del anfitrión; contra la compu, las tuyas (como siempre).
        if (get().conexion?.tipo === 'online') aplicarTemaDeSala(m.datos)
        set({
          sala: m.datos,
          ...(m.datos.fase !== 'esperando' ? { ofrecerBot: false } : {}),
          // En la revancha, lo cobrado en la partida anterior ya no se muestra.
          ...(m.datos.fase === 'jugando' ? { monedas: null, elo: null } : {}),
        })
        break
      case 'vista':
        // El primer reparto no llega como evento: la partida arranca con la primera vista.
        if (!get().vista) sonarEfecto('repartir')
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
        set((s) => ({ senias: [...s.senias.slice(-40), { ...m.datos, id: ++contador }] }))
        break
      case 'pidenSenias':
        set({ pedidoSenias: { de: m.datos.de, id: ++contador } })
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
      case 'reyes': {
        // Se tiran en la mesa y la primera mano espera; con movimiento reducido, en un cuadro.
        const enMesa = !movimientoReducido()
        const sala = get().sala
        set({ reyes: { ...m.datos, id: ++contador, enMesa, lugaresAntes: sala?.lugares ?? null, yoAntes: sala?.yo ?? 0 } })
        if (enMesa) {
          enReyes = true
          if (timerReyes) clearTimeout(timerReyes)
          timerReyes = setTimeout(terminarReyes, planReyes(m.datos.tiradas, true).fin + 4000)
        }
        break
      }
      case 'expulsado':
        set({ expulsado: m.datos.motivo })
        break
      case 'elo':
        set({ elo: m.datos })
        break
      case 'monedas':
        set({ monedas: m.datos })
        useCuenta.setState({ saldo: m.datos.saldo })
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
    pedidoSenias: null,
    pescadas: [],
    turno: { asientos: [], venceEn: null },
    error: null,
    finDeMano: null,
    mostradas: [],
    estadoConexion: 'conectada',
    ofrecerBot: false,
    reyes: null,
    expulsado: null,
    monedas: null,
    elo: null,
    corte: null,

    cerrarReyes() {
      terminarReyes()
    },

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
      if (timerReyes) clearTimeout(timerReyes)
      timerReyes = null
      enReyes = false
      porReproducir = []
      cola = []
      if (timerSenias) clearTimeout(timerSenias)
      timerSenias = null
      seniasEnEspera = []
      seniasHasta = 0
      const conexion = get().conexion
      conexion?.salir()
      // Fuera de la sala vuelven tu mesa y tu baraja.
      if (conexion?.tipo === 'online') aplicarTemaPropio()
      set({
        conexion: null,
        sala: null,
        vista: null,
        mesa: MESA_VACIA,
        globos: {},
        registro: [],
        chat: [],
        senias: [],
        pedidoSenias: null,
        pescadas: [],
        turno: { asientos: [], venceEn: null },
        error: null,
        finDeMano: null,
        mostradas: [],
        estadoConexion: 'conectada',
        ofrecerBot: false,
            reyes: null,
        expulsado: null,
        monedas: null,
        elo: null,
        corte: null,
      })
    },
  }
})

/** Las cartas del enfrentamiento en curso según la vista; si no cambió nada, deja la mesa como está. */
function mesaDesdeVista(v: VistaPartida, antes: MesaVisible): MesaVisible {
  const e = v.mano.enfrentamientos[v.mano.actual]
  if (!e) return MESA_VACIA
  const jugadas: Jugada[] = e.vueltas.flatMap((vu, i) =>
    vu.jugadas.map((j) => ({ asiento: j.asiento, carta: j.carta, vuelta: i, ...(j.tapada ? { tapada: true } : {}) })),
  )
  const vueltas = e.vueltas.flatMap((vu) => (vu.resultado === null ? [] : [{ resultado: vu.resultado, ganador: vu.ganador }]))
  const igual =
    vueltas.length === antes.vueltas.length &&
    jugadas.length === antes.jugadas.length &&
    jugadas.every((j, i) => {
      const a = antes.jugadas[i]!
      return a.asiento === j.asiento && a.vuelta === j.vuelta && (a.carta && j.carta ? mismaCarta(a.carta, j.carta) : a.carta === j.carta)
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
