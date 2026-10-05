import { create } from 'zustand'

/**
 * Ajustes de sonido, guardados en este navegador. Van aparte del perfil (su propia clave)
 * porque son del aparato, no de la persona: en el celular quizás lo querés callado.
 */
export interface AjustesSonido {
  /** Efectos de la mesa: repartir, tirar una carta, fin de vuelta, puntos. */
  efectos: boolean
  /** Volumen de 0 a 1, para efectos y voces. */
  volumen: number
  /** Voz de los cantos (necesita un pack de voces publicado). */
  voz: boolean
  /** Id del pack de voces elegido (null: el primero que haya). */
  pack: string | null
}

export const AJUSTES_SONIDO_POR_DEFECTO: AjustesSonido = { efectos: true, volumen: 0.7, voz: true, pack: null }

const CLAVE = 'truco.sonido'

export function leerAjustesSonido(): AjustesSonido {
  const a = { ...AJUSTES_SONIDO_POR_DEFECTO }
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<AjustesSonido> | null
    if (typeof guardado?.efectos === 'boolean') a.efectos = guardado.efectos
    if (typeof guardado?.volumen === 'number' && Number.isFinite(guardado.volumen)) a.volumen = Math.min(1, Math.max(0, guardado.volumen))
    if (typeof guardado?.voz === 'boolean') a.voz = guardado.voz
    if (typeof guardado?.pack === 'string') a.pack = guardado.pack
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): quedan los valores por defecto.
  }
  return a
}

interface EstadoAjustes extends AjustesSonido {
  cambiar(cambios: Partial<AjustesSonido>): void
}

export const useAjustesSonido = create<EstadoAjustes>()((set, get) => ({
  ...leerAjustesSonido(),
  cambiar(cambios) {
    const { cambiar: _, ...actual } = { ...get(), ...cambios }
    actual.volumen = Math.min(1, Math.max(0, actual.volumen))
    set(actual)
    try {
      localStorage.setItem(CLAVE, JSON.stringify(actual))
    } catch {
      // Si no se puede guardar, vale para esta sesión.
    }
  },
}))
