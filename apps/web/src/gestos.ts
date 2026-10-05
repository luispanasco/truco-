import { useEffect, useRef, useState } from 'react'
import type { Senia } from '@truco/bots'
import type { GestoAvatar } from './avatares/gestos'

/** Un gesto en curso; el id sirve de clave para que la animación arranque de nuevo. */
export interface GestoActivo {
  gesto: GestoAvatar
  id: number
}

/**
 * Lo que dura un gesto sobre el avatar: el avatar se agranda, hace el gesto (1,7 s, en el
 * CSS), se queda un momento quieto para leer el globito y vuelve a su tamaño.
 */
export const DURACION_GESTO = 2300

/**
 * Gestos que se ven sobre los avatares de la mesa. Llegan señas (de compañeros) y señas
 * pescadas (de rivales); cada asiento las hace de a una, en el orden en que llegaron.
 * A cada gesto se le fija la hora de inicio al llegar, así el estado no depende de
 * timers sueltos (y no se traba si React monta los efectos dos veces).
 */
export function useGestos(llegadas: readonly { de: number; senia: Senia | null; id: number }[]): Record<number, GestoActivo> {
  const [gestos, setGestos] = useState<(GestoActivo & { de: number; inicio: number })[]>([])
  const [ahora, setAhora] = useState(() => Date.now())
  const ultimo = useRef(0)
  const libreDesde = useRef(new Map<number, number>())

  useEffect(() => {
    const t = Date.now()
    const nuevos: (GestoActivo & { de: number; inicio: number })[] = []
    for (const l of llegadas) {
      if (l.id <= ultimo.current) continue
      ultimo.current = l.id
      const inicio = Math.max(t, libreDesde.current.get(l.de) ?? 0)
      libreDesde.current.set(l.de, inicio + DURACION_GESTO)
      nuevos.push({ de: l.de, gesto: l.senia ?? 'disimulo', id: l.id, inicio })
    }
    if (nuevos.length === 0) return
    setGestos((s) => [...s.filter((g) => g.inicio + DURACION_GESTO > t), ...nuevos])
    setAhora(t)
  }, [llegadas])

  // Vuelve a mirar la hora cuando empieza o termina el próximo gesto.
  useEffect(() => {
    const proximos = gestos.flatMap((g) => [g.inicio, g.inicio + DURACION_GESTO]).filter((m) => m > ahora)
    if (proximos.length === 0) return
    const t = setTimeout(() => setAhora(Math.max(Date.now(), Math.min(...proximos))), Math.min(...proximos) - Date.now())
    return () => clearTimeout(t)
  }, [gestos, ahora])

  const activos: Record<number, GestoActivo> = {}
  for (const g of gestos) if (g.inicio <= ahora && ahora < g.inicio + DURACION_GESTO) activos[g.de] = { gesto: g.gesto, id: g.id }
  return activos
}
