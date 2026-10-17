import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import {
  BARAJA_DEFAULT,
  CARTAS_JUGADAS_DEFAULT,
  MESA_DEFAULT,
  TODO_PERMITIDO,
  TIEMPOS_SALA_DEFAULT,
  TIPOGRAFIA_DEFAULT,
  avatarAlAzar,
  codificarAvatar,
  normalizarAvatar,
  normalizarBaraja,
  normalizarCartasJugadas,
  normalizarMesa,
  normalizarTipografia,
  normalizarTirarReyes,
  type CartasJugadas,
  type TirarReyes,
  type ConfigTiempos,
  type IdMesa,
  type IdTipografia,
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
  /** A cuánto se juega (contra bots y como propuesta al crear una sala): 20, 30 o 40. */
  puntosPartida: number
  /** Toques y gritos los decide el pie (en parejas y tríos). */
  toquesDelPie: boolean
  /** Cortar el mazo antes de cada mano. */
  corte: boolean
  /** Tirar reyes antes de la primera partida. */
  tirarReyes: TirarReyes
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
  /**
   * Cómo se ve la mesa: los demás en círculos, sentados de medio cuerpo detrás del paño, o la
   * mesa entera en perspectiva, como sentado frente a ella. Antes era `mesaBustos` (sí o no):
   * al leer el perfil se pasa a este campo (ver `vistaGuardada`).
   */
  vistaMesa: VistaMesa
  /** La mesa (paño y madera) con la que se ve la partida y el fondo de la app (cosmético). */
  mesa: IdMesa
  /** La letra de toda la app (cosmético). Es solo tuya: no viaja al servidor. */
  tipografia: IdTipografia
  /**
   * Prueba de la tienda (fase 1, todavía sin monedas): todo lo pago se puede elegir. El servidor
   * lo acepta mientras tenga prendida la tienda de prueba. En la fase 2 se va: vale lo comprado.
   */
  tiendaDesbloqueada: boolean
}

const CLAVE = 'truco.perfil'

/** Las vistas de la mesa que se pueden elegir. */
export const VISTAS_MESA = ['circulos', 'sentados', 'perspectiva'] as const
export type VistaMesa = (typeof VISTAS_MESA)[number]

const esVistaMesa = (v: unknown): v is VistaMesa => VISTAS_MESA.includes(v as VistaMesa)

/**
 * La vista de la mesa de un perfil guardado. Los de antes no tienen `vistaMesa` sino
 * `mesaBustos`: prendido eran los sentados y apagado (o sin nada), los círculos.
 */
export function vistaGuardada(guardado: { vistaMesa?: unknown; mesaBustos?: unknown } | null | undefined): VistaMesa {
  if (esVistaMesa(guardado?.vistaMesa)) return guardado.vistaMesa
  return guardado?.mesaBustos === true ? 'sentados' : 'circulos'
}

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
    puntosPartida: 30,
    toquesDelPie: false,
    corte: false,
    tirarReyes: 'no',
    rapido: false,
    ojear: true,
    pescarSenias: true,
    seniasAntesDeJugar: false,
    seniasHabilitadas: true,
    tiempos: TIEMPOS_SALA_DEFAULT,
    baraja: BARAJA_DEFAULT,
    vistaMesa: 'circulos',
    cartasJugadas: CARTAS_JUGADAS_DEFAULT,
    mesa: MESA_DEFAULT,
    tipografia: TIPOGRAFIA_DEFAULT,
    tiendaDesbloqueada: false,
  }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as (Partial<Perfil> & { mesaBustos?: unknown }) | null
    const { mesaBustos: _vieja, ...sinVieja } = guardado ?? {}
    const perfil: Perfil = { ...porDefecto, ...sinVieja }
    perfil.vistaMesa = vistaGuardada(guardado)
    // El campo viejo se reemplaza por el nuevo (una sola vez): la elección de cada uno se conserva.
    const migrada = !!guardado && (guardado.vistaMesa !== perfil.vistaMesa || 'mesaBustos' in guardado)
    perfil.tiendaDesbloqueada = perfil.tiendaDesbloqueada === true
    perfil.cartasJugadas = normalizarCartasJugadas(perfil.cartasJugadas)
    perfil.tirarReyes = normalizarTirarReyes(perfil.tirarReyes)
    if (![20, 30, 40].includes(perfil.puntosPartida)) perfil.puntosPartida = 30
    const cosmeticos = cosmeticosPermitidos(perfil)
    const cambio = (['avatar', 'mesa', 'baraja', 'tipografia'] as const).some((k) => cosmeticos[k] !== perfil[k])
    Object.assign(perfil, cosmeticos)
    // Se guarda enseguida: el perfil nuevo o migrado tiene que ser el mismo en todas las pantallas.
    if (!guardado || cambio || migrada) guardarPerfil(perfil)
    return perfil
  } catch {
    return porDefecto
  }
}

/**
 * El avatar, la mesa, la baraja y la tipografía que se pueden usar. Los emojis de antes (o un
 * código roto) pasan a un avatar armado desde el apodo; lo que no existe vuelve a lo de siempre; y
 * lo de la tienda vuelve a lo gratis, como hace el servidor (así se ve lo mismo que ven los demás),
 * salvo con la tienda de prueba desbloqueada. La tipografía no viaja, pero sigue la misma regla.
 */
export function cosmeticosPermitidos(p: Perfil): Pick<Perfil, 'avatar' | 'mesa' | 'baraja' | 'tipografia'> {
  const puede = p.tiendaDesbloqueada ? TODO_PERMITIDO : undefined
  return {
    avatar: normalizarAvatar(p.avatar, puede) ?? avatarDe(p.apodo || p.invitadoId),
    mesa: normalizarMesa(p.mesa, puede),
    baraja: normalizarBaraja(p.baraja, puede),
    tipografia: normalizarTipografia(p.tipografia, puede),
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
 * La vista de la mesa se elige en Más opciones, y también con `?vista=circulos|sentados|perspectiva`
 * en la dirección (queda guardada, así sobrevive al ir a la mesa). Sigue andando el `?bustos=1` /
 * `?bustos=0` de cuando los sentados eran una prueba.
 */
export function vistaDesdeUrl(busqueda: string) {
  const params = new URLSearchParams(busqueda)
  const vista = params.get('vista')
  const bustos = params.get('bustos')
  const elegida: VistaMesa | null = esVistaMesa(vista) ? vista : bustos === '1' ? 'sentados' : bustos === '0' ? 'circulos' : null
  if (elegida) guardarPerfil({ ...leerPerfil(), vistaMesa: elegida })
}
