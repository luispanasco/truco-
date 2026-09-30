import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'

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
}

export const AVATARES = ['🧉', '🐴', '🦉', '🐂', '🦊', '🐸', '🐶', '🐱', '🌞', '⭐']

const CLAVE = 'truco.perfil'

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function leerPerfil(): Perfil {
  const porDefecto: Perfil = { invitadoId: nuevoId(), apodo: '', avatar: AVATARES[0]!, formato: '1v1', nivelBots: 'medio', ayudas: true, picaPica: true, rapido: false, ojear: true }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Perfil> | null
    return { ...porDefecto, ...(guardado ?? {}) }
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
