import { create } from 'zustand'
import type { Conexion } from '../conexion/tipos'
import { useJuego } from '../estado'
import { guardarPerfil, leerPerfil } from '../perfil'
import { MallaVoz, type EntornoVoz, type EstadoMicrofono, type InfoPar } from './malla'
import { crearEntornoNavegador, hayVozEnElNavegador } from './navegador'

/**
 * Estado del chat de voz en la mesa. Va atado a la conexión online: al salir de la sala (o al
 * entrar a otra) se cierra todo. Contra la compu no hay voz.
 */
export interface EstadoVozMesa {
  /** Si la activaste (aunque no tengas micrófono: escuchás igual). */
  activa: boolean
  /** Mientras se pide el permiso del micrófono. */
  pidiendo: boolean
  /** Cómo quedó el micrófono al activar (null si no se activó). */
  microfono: EstadoMicrofono | null
  /** Mute propio: con false, el micrófono no manda nada. */
  abierto: boolean
  /** Mantener apretado para hablar (preferencia propia, se guarda en el perfil). */
  pulsar: boolean
  /** Con `pulsar`: si está apretando el botón para hablar. */
  pulsando: boolean
  /** Asientos que están en la voz según el servidor (también el tuyo, si entraste). */
  enVoz: number[]
  /** Tu asiento en la voz, cuando el servidor ya te anotó. */
  asientoPropio: number | null
  pares: InfoPar[]
  /** Por asiento: nivel del audio (0 a 1) para el anillo de quien habla. */
  niveles: Record<number, number>
  /** Asientos que dejaste de escuchar (solo para vos). */
  silenciados: number[]
  /** Aviso para la persona (por ejemplo, si no dio permiso para el micrófono). */
  aviso: string | null

  activar(): Promise<void>
  desactivar(): void
  cambiarAbierto(abierto: boolean): void
  cambiarPulsar(pulsar: boolean): void
  cambiarPulsando(pulsando: boolean): void
  silenciar(asiento: number, silenciado: boolean): void
}

const AVISOS_MICROFONO: Record<Exclude<EstadoMicrofono, 'listo'>, string> = {
  negado:
    'No diste permiso para usar el micrófono: escuchás a los demás, pero no te oyen. Para hablar, habilitalo en los ajustes del navegador para este sitio y volvé a activar la voz.',
  sinMicrofono: 'No encontramos un micrófono: escuchás a los demás, pero no te oyen.',
  sinSoporte: 'Este navegador no deja usar el micrófono acá (hace falta una conexión segura, https): escuchás a los demás, pero no te oyen.',
}

let fabricaEntorno: (() => EntornoVoz | null) | null = null

/** Si hay voz en este navegador (o en los tests, si se armó un entorno de mentira). */
export function vozPosible(): boolean {
  return fabricaEntorno !== null || hayVozEnElNavegador()
}

/** Solo para tests: el entorno (WebRTC, micrófono, audio) que usa la malla. */
export function usarEntornoVoz(f: (() => EntornoVoz | null) | null) {
  fabricaEntorno = f
}

let malla: MallaVoz | null = null
let conexionActual: Conexion | null = null
let desuscribir: (() => void)[] = []

const INICIAL = {
  activa: false,
  pidiendo: false,
  microfono: null,
  abierto: true,
  pulsando: false,
  enVoz: [],
  asientoPropio: null,
  pares: [],
  niveles: {},
  silenciados: [],
  aviso: null,
} satisfies Partial<EstadoVozMesa>

export const useVoz = create<EstadoVozMesa>()((set, get) => ({
  ...INICIAL,
  pulsar: leerPerfil().vozPulsar,

  async activar() {
    const conexion = conexionActual
    if (!conexion || malla || get().pidiendo) return
    const entorno = fabricaEntorno ? fabricaEntorno() : hayVozEnElNavegador() ? crearEntornoNavegador() : null
    if (!entorno) {
      set({ aviso: 'Este navegador no tiene chat de voz.' })
      return
    }
    const nueva = new MallaVoz(
      (tipo, datos) => conexion.enviar(tipo, datos),
      entorno,
      (i) => {
        if (malla === nueva) set({ asientoPropio: i.asientoPropio, pares: i.pares, niveles: i.niveles })
      },
    )
    malla = nueva
    escucharConexion(conexion)
    const { abierto, pulsar, silenciados } = get()
    for (const a of silenciados) nueva.silenciar(a, true)
    set({ pidiendo: true, aviso: null })
    const microfono = await nueva.activar({ abierto, pulsar })
    // Si mientras tanto salió de la sala, ya está todo cerrado.
    if (malla !== nueva) return
    set({ activa: true, pidiendo: false, microfono, aviso: microfono === 'listo' ? null : AVISOS_MICROFONO[microfono] })
  },

  desactivar() {
    const m = malla
    malla = null
    m?.desactivar()
    dejarDeEscuchar()
    set({ activa: false, pidiendo: false, microfono: null, pulsando: false, enVoz: [], asientoPropio: null, pares: [], niveles: {}, aviso: null })
  },

  cambiarAbierto(abierto) {
    malla?.cambiarAbierto(abierto)
    set({ abierto })
  },

  cambiarPulsar(pulsar) {
    malla?.cambiarPulsar(pulsar)
    set({ pulsar, pulsando: false })
    guardarPerfil({ ...leerPerfil(), vozPulsar: pulsar })
  },

  cambiarPulsando(pulsando) {
    if (get().pulsando === pulsando) return
    malla?.cambiarPulsando(pulsando)
    set({ pulsando })
  },

  silenciar(asiento, silenciado) {
    malla?.silenciar(asiento, silenciado)
    const resto = get().silenciados.filter((a) => a !== asiento)
    set({ silenciados: silenciado ? [...resto, asiento] : resto })
  },
}))

function dejarDeEscuchar() {
  for (const f of desuscribir) f()
  desuscribir = []
}

/** Engancha la voz a una conexión nueva (o la suelta, con null): cierra lo anterior. */
function cambiarConexion(conexion: Conexion | null) {
  if (conexion === conexionActual) return
  dejarDeEscuchar()
  const m = malla
  malla = null
  m?.cerrar()
  conexionActual = conexion?.tipo === 'online' ? conexion : null
  useVoz.setState({ ...INICIAL, pulsar: leerPerfil().vozPulsar })
}

/**
 * Los mensajes de la voz se escuchan recién al activarla: así la mesa recibe primero todo lo
 * que la conexión guardó mientras nadie escuchaba (la primera `sala`, por ejemplo).
 */
function escucharConexion(conexion: Conexion) {
  dejarDeEscuchar()
  desuscribir.push(
    conexion.escuchar((msj) => {
      if (msj.tipo === 'voz') {
        const e = msj.datos
        useVoz.setState({ enVoz: e.participantes.map((p) => p.asiento) })
        malla?.alEstado(e)
        // El anfitrión apagó la voz: se cierra todo.
        if (!e.activa && useVoz.getState().activa) {
          useVoz.getState().desactivar()
          useVoz.setState({ aviso: 'En esta sala ya no hay chat de voz.' })
        }
      } else if (msj.tipo === 'senalVoz') {
        void malla?.alSenal(msj.datos.de, msj.datos.senal)
      }
    }),
  )
  // Si se corta la conexión con el servidor, este ya nos sacó de la voz: al volver, se entra de nuevo.
  let cortada = false
  const observar = conexion.observarEstado?.((estado) => {
    if (estado === 'conectada') {
      if (cortada) malla?.alReconectarse()
      cortada = false
    } else {
      cortada = true
      malla?.alCortarse()
    }
  })
  if (observar) desuscribir.push(observar)
}

cambiarConexion(useJuego.getState().conexion)
useJuego.subscribe((s) => cambiarConexion(s.conexion))
