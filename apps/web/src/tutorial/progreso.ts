import { create } from 'zustand'
import { LECCIONES, type IdLeccion, type ProgresoTutorial } from '@truco/shared'

/**
 * Lo hecho en el tutorial, en el dispositivo: no hace falta cuenta (el que no sabe jugar todavía
 * no se registró). Si no se puede leer o guardar (navegación privada), se sigue igual.
 */

const CLAVE = 'truco.tutorial'

function leer(): ProgresoTutorial {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<string, unknown>
    const progreso: ProgresoTutorial = {}
    for (const l of LECCIONES) {
      const e = crudo[l.id]
      if (e === 1 || e === 2 || e === 3) progreso[l.id] = e
    }
    return progreso
  } catch {
    return {}
  }
}

interface EstadoTutorial {
  progreso: ProgresoTutorial
  /** Anota la lección terminada; si ya estaba, queda la mejor vez. */
  terminar: (id: IdLeccion, estrellas: 1 | 2 | 3) => void
}

export const useTutorial = create<EstadoTutorial>((set, get) => ({
  progreso: leer(),
  terminar: (id, estrellas) => {
    const antes = get().progreso[id] ?? 0
    const progreso = { ...get().progreso, [id]: Math.max(antes, estrellas) as 1 | 2 | 3 }
    set({ progreso })
    try {
      localStorage.setItem(CLAVE, JSON.stringify(progreso))
    } catch {
      // Sin almacenamiento: queda hasta que se cierre la app.
    }
  },
}))

/** Vuelve a leer lo guardado (para los tests). */
export const recargarTutorial = () => useTutorial.setState({ progreso: leer() })
