import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import {
  CARTAS_JUGADAS_DEFAULT,
  MESA_DEFAULT,
  TIEMPOS_SALA_DEFAULT,
  avatarAlAzar,
  codificarAvatar,
  normalizarAvatar,
  normalizarCartasJugadas,
  normalizarMesa,
  type CartasJugadas,
  type ConfigTiempos,
  type IdMesa,
} from '@truco/shared'
import type { Baraja } from './baraja'

/** Datos que se recuerdan en este navegador. Si el almacenamiento falla, se usan los valores por defecto. */
export interface Perfil {
  invitadoId: string
  apodo: string
  /** El avatar por capas, codificado ("a1.…"): es lo que viaja al servidor. */
  avatar: string
  formato: Formato
  nivelBots: Nivel
  ayudas: boolean
  picaPica: boolean
  /** Bots sin demora, para partidas cortas. */
  rapido: boolean
  /** Ojear las cartas al empezar cada mano (si no, llegan directo en abanico). */
  ojear: boolean
  /** Si se juega con señas (contra bots y como propuesta al crear una sala). */
  seniasHabilitadas: boolean
  /** Contra bots: si los rivales pueden pescar señas (el gesto, 20 %). */
  pescarSenias: boolean
  /** Contra bots: señas solo antes de jugar la primera carta de la mano. */
  seniasAntesDeJugar: boolean
  /** Tiempos de la última sala que armó (por jugada y primera jugada del mano). */
  tiempos: ConfigTiempos
  /** Dibujo de las cartas (cosmético): la baraja propia en SVG o la clásica de Fournier (1878). */
  baraja: Baraja
  /** Si las cartas jugadas quedan en la mesa o se levantan en cada vuelta (contra bots y al crear una sala). */
  cartasJugadas: CartasJugadas
  /** Prueba: en la mesa, los demás sentados de medio cuerpo detrás del paño (en vez del círculo). */
  mesaBustos: boolean
  /** La mesa (paño y madera) con la que se ve la partida y el fondo de la app (cosmético). */
  mesa: IdMesa
}

const CLAVE = 'truco.perfil'

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Un avatar al azar con piezas gratis, siempre el mismo para el mismo texto. */
export const avatarDe = (texto: string) => codificarAvatar(avatarAlAzar(texto))

export function leerPerfil(): Perfil {
  const invitadoId = nuevoId()
  const porDefecto: Perfil = {
    invitadoId,
    apodo: '',
    avatar: avatarDe(invitadoId),
    formato: '1v1',
    nivelBots: 'medio',
    ayudas: true,
    picaPica: true,
    rapido: false,
    ojear: true,
    pescarSenias: true,
    seniasAntesDeJugar: false,
    seniasHabilitadas: true,
    tiempos: TIEMPOS_SALA_DEFAULT,
    baraja: 'propia',
    mesaBustos: false,
    cartasJugadas: CARTAS_JUGADAS_DEFAULT,
    mesa: MESA_DEFAULT,
  }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Perfil> | null
    const perfil = { ...porDefecto, ...(guardado ?? {}) }
    // Una baraja que ya no existe (o un valor roto) vuelve a la propia.
    if (perfil.baraja !== 'propia' && perfil.baraja !== 'fournier1878') perfil.baraja = 'propia'
    perfil.cartasJugadas = normalizarCartasJugadas(perfil.cartasJugadas)
    // Los emojis de antes (o un código roto) pasan a un avatar armado desde el apodo; las piezas
    // de la tienda vuelven a las gratis, como hace el servidor, así se ve lo mismo que ven los demás.
    const avatar = normalizarAvatar(perfil.avatar) ?? avatarDe(perfil.apodo || perfil.invitadoId)
    // Una mesa que no existe, o una de la tienda (todavía no se pueden comprar), vuelve a la de boliche.
    const mesa = normalizarMesa(perfil.mesa)
    const cambio = avatar !== perfil.avatar || mesa !== perfil.mesa
    perfil.avatar = avatar
    perfil.mesa = mesa
    // Se guarda enseguida: el perfil nuevo o migrado tiene que ser el mismo en todas las pantallas.
    if (!guardado || cambio) guardarPerfil(perfil)
    return perfil
  } catch {
    return porDefecto
  }
}

export function guardarPerfil(p: Perfil) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    // Sin almacenamiento (modo privado): no se recuerda, pero la app sigue funcionando.
  }
}

/**
 * La mesa de bustos todavía es una prueba: se prende y se apaga desde Más opciones o con
 * `?bustos=1` / `?bustos=0` en la dirección (queda guardado, así sobrevive al ir a la mesa).
 */
export function bustosDesdeUrl(busqueda: string) {
  const valor = new URLSearchParams(busqueda).get('bustos')
  if (valor !== '1' && valor !== '0') return
  guardarPerfil({ ...leerPerfil(), mesaBustos: valor === '1' })
}
