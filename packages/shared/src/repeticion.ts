/**
 * La repetición de una partida online: lo que hace falta para volver a jugarla igual (el motor es
 * determinista): la semilla, quién repartió, la configuración, los jugadores y cada acción en orden.
 * La guarda el servidor al terminar una partida entre miembros de un grupo, y la web la reconstruye
 * para verla mano a mano.
 */

import { apply, crearPartida, type Accion, type ConfigSala, type EstadoPartida, type Evento } from '@truco/engine'

export interface RepeticionPartida {
  /** Cuándo se jugó (ISO). */
  fecha: string
  semilla: number
  reparte: number
  config: ConfigSala
  jugadores: { asiento: number; apodo: string; bot: boolean }[]
  acciones: { asiento: number; accion: Accion }[]
  resultado: { ganador: 0 | 1; puntos: [number, number] }
}

/** Un paso de la repetición: el estado después de una acción (el primero, el del reparto). */
export interface PasoRepeticion {
  estado: EstadoPartida
  /** La acción que llevó a este estado (null en el primero) y quién la hizo. */
  accion: { asiento: number; accion: Accion } | null
  eventos: Evento[]
}

/**
 * Vuelve a jugar la partida: un paso por acción. Si una acción no vale (una repetición rota o de
 * otra versión del motor), corta ahí: se ve hasta donde se pudo.
 */
export function pasosDeRepeticion(r: RepeticionPartida): PasoRepeticion[] {
  let estado = crearPartida({
    jugadores: r.jugadores.map((j) => ({ id: `j${j.asiento}`, nombre: j.apodo, bot: j.bot })),
    semilla: r.semilla,
    config: r.config,
    reparte: r.reparte,
  })
  const pasos: PasoRepeticion[] = [{ estado, accion: null, eventos: [] }]
  for (const a of r.acciones) {
    const res = apply(estado, { ...a.accion, jugador: `j${a.asiento}` } as Accion)
    if (!res.ok) break
    estado = res.estado
    pasos.push({ estado, accion: a, eventos: res.eventos })
  }
  return pasos
}
