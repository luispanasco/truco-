import type { RepeticionPartida } from '@truco/shared'

/**
 * Las salas abiertas, por roomId: un reporte de problema de una partida online se lleva la
 * repetición que registró la sala (la partida en curso o la última que se jugó), y el menú
 * muestra cuánta gente está buscando partida.
 */
export interface SalaViva {
  /** La repetición, solo si quien pide está (o estuvo) en la mesa (su invitado o su cuenta). */
  repeticionPara(quien: { invitadoId: string; cuentaId: string | null }): RepeticionPartida | null
  /** Personas conectadas: esperando en la cola pública (buscando partida) o jugando. */
  gente(): { buscando: number; jugando: number }
}

/** Cuánta gente hay ahora: buscando partida (en la cola pública) y jugando online. */
export function genteEnLinea(): { buscando: number; jugando: number } {
  let buscando = 0
  let jugando = 0
  for (const s of salasVivas.values()) {
    const g = s.gente()
    buscando += g.buscando
    jugando += g.jugando
  }
  return { buscando, jugando }
}

export const salasVivas = new Map<string, SalaViva>()
