import type { RepeticionPartida } from '@truco/shared'

/**
 * Las salas abiertas, por roomId: un reporte de problema de una partida online se lleva la
 * repetición que registró la sala (la partida en curso o la última que se jugó).
 */
export interface SalaViva {
  /** La repetición, solo si quien pide está (o estuvo) en la mesa (su invitado o su cuenta). */
  repeticionPara(quien: { invitadoId: string; cuentaId: string | null }): RepeticionPartida | null
}

export const salasVivas = new Map<string, SalaViva>()
