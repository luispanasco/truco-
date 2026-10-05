import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import {
  BARAJA_DEFAULT,
  CARTAS_JUGADAS_DEFAULT,
  MESA_DEFAULT,
  TODO_PERMITIDO,
  TIEMPOS_SALA_DEFAULT,
  avatarAlAzar,
  codificarAvatar,
  normalizarAvatar,
  normalizarBaraja,
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
  /**
   * Prueba de la tienda (fase 1, todavía sin monedas): todo lo pago se puede elegir. El servidor
   * lo acepta mientras tenga prendida la tienda de prueba. En la fase 2 se va: vale lo comprado.
   */
  tiendaDesbloqueada: boolean
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
    baraja: BARAJA_DEFAULT,
    mesaBustos: false,
    cartasJugadas: CARTAS_JUGADAS_DEFAULT,
    mesa: MESA_DEFAULT,
    tiendaDesbloqueada: false,
  }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Perfil> | null
    const perfil = { ...porDefecto, ...(guardado ?? {}) }
    perfil.tiendaDesbloqueada = perfil.tiendaDesbloqueada === true
    perfil.cartasJugadas = normalizarCartasJugadas(perfil.cartasJugadas)
    const cosmeticos = cosmeticosPermitidos(perfil)
    const cambio = (['avatar', 'mesa', 'baraja'] as const).some((k) => cosmeticos[k] !== perfil[k])
    Object.assign(perfil, cosmeticos)
    // Se guarda enseguida: el perfil nuevo o migrado tiene que ser el mismo en todas las pantallas.
    if (!guardado || cambio) guardarPerfil(perfil)
    return perfil
  } catch {
    return porDefecto
  }
}

/**
 * El avatar, la mesa y la baraja que se pueden usar. Los emojis de antes (o un código roto) pasan
 * a un avatar armado desde el apodo; lo que no existe vuelve a lo de siempre; y lo de la tienda
 * vuelve a lo gratis, como hace el servidor (así se ve lo mismo que ven los demás), salvo con la
 * tienda de prueba desbloqueada.
 */
export function cosmeticosPermitidos(p: Perfil): Pick<Perfil, 'avatar' | 'mesa' | 'baraja'> {
  const puede = p.tiendaDesbloqueada ? TODO_PERMITIDO : undefined
  return {
    avatar: normalizarAvatar(p.avatar, puede) ?? avatarDe(p.apodo || p.invitadoId),
    mesa: normalizarMesa(p.mesa, puede),
    baraja: normalizarBaraja(p.baraja, puede),
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
