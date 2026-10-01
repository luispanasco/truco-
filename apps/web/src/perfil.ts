import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import type { Baraja } from './baraja'

/** Datos que se recuerdan en este navegador. Si el almacenamiento falla, se usan los valores por defecto. */
export interface Perfil {
  invitadoId: string
  apodo: string
  avatar: string
  formato: Formato
  nivelBots: Nivel
  ayudas: boolean
  picaPica: boolean
  /** Bots sin demora, para partidas cortas. */
  rapido: boolean
  /** Ojear las cartas al empezar cada mano (si no, llegan directo en abanico). */
  ojear: boolean
  /** Contra bots: si los rivales pueden pescar señas (el gesto, 20 %). */
  pescarSenias: boolean
  /** Contra bots: señas solo antes de jugar la primera carta de la mano. */
  seniasAntesDeJugar: boolean
  /** Dibujo de las cartas (cosmético): la baraja propia en SVG o la clásica de Fournier (1878). */
  baraja: Baraja
}

export const AVATARES = ['🧉', '🐴', '🦉', '🐂', '🦊', '🐸', '🐶', '🐱', '🌞', '⭐']

const CLAVE = 'truco.perfil'

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function leerPerfil(): Perfil {
  const porDefecto: Perfil = { invitadoId: nuevoId(), apodo: '', avatar: AVATARES[0]!, formato: '1v1', nivelBots: 'medio', ayudas: true, picaPica: true, rapido: false, ojear: true, pescarSenias: true, seniasAntesDeJugar: false, baraja: 'propia' }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Perfil> | null
    const perfil = { ...porDefecto, ...(guardado ?? {}) }
    // Una baraja que ya no existe (o un valor roto) vuelve a la propia.
    if (perfil.baraja !== 'propia' && perfil.baraja !== 'fournier1878') perfil.baraja = 'propia'
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
