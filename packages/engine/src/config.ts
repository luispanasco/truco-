export type Formato = '1v1' | '2v2' | '3v3'

export type ReglaFlorConPiezas =
  /** Pieza más alta completa + último dígito de las otras piezas + cartas comunes. */
  | 'piezaMayorMasDigitos'
  /** Pieza más alta completa + las demás cartas por su número, como comunes. */
  | 'piezaMayorMasNumero'

/** Largos de partido: 10 y 10, 15 y 15 o 20 y 20. */
export const LARGOS_PARTIDA = [20, 30, 40] as const

export interface ConfigSala {
  formato: Formato
  /** A cuánto se juega (ver `LARGOS_PARTIDA`). */
  puntosPartida: number
  /** Último puntaje que cuenta como "malas": la mitad del partido. */
  puntosMalas: number
  florConPiezas: ReglaFlorConPiezas
  valorContraflor: number
  /**
   * Cuánto vale la falta envido:
   * - 'completarMalas': si el que va ganando está en malas (menos de 15), lo que le falta para
   *   llegar a 15; si no, lo que le falta para ganar;
   * - 'loQueFalta': siempre lo que le falta al que va ganando para ganar;
   * - 'ganaPartido': con los dos en malas, la falta gana el partido.
   */
  faltaEnvidoEnMalas: 'completarMalas' | 'loQueFalta' | 'ganaPartido'
  /** Solo en 3v3. */
  picaPica: boolean
  /** Se juega pica-pica mientras los dos equipos tienen entre `desde` y `hasta` puntos (las malas). */
  tramoPicaPica: { desde: number; hasta: number }
  /** Dentro del tramo, una mano redonda y una de pica-pica, empezando por la redonda. */
  picaPicaAlternado: boolean
  /** La flor se canta en la primera vuelta antes de jugar; si no, se pierde. */
  florObligatoria: boolean
  /** Permitido: envido y real envido se encadenan sin límite. No permitido: un solo envido. */
  envidoEnvido: boolean
  /** Quién empieza la vuelta siguiente a una parda. */
  empiezaTrasParda: 'quienEmpezo' | 'mano'
  /**
   * Irse al mazo con un envido del rival sin responder: el rival lo cobra como no querido.
   * También si te vas en la primera vuelta cuando todavía se podía tocar: el rival cobra 1 de envido.
   */
  mazoCobraEnvidoPendiente: boolean
  /**
   * En 2v2 y 3v3 (fuera del pica-pica), quién toca y grita: 'pie' = solo el pie (o el compañero que
   * él manda) y las respuestas al truco y al envido las da el pie; 'cualquiera' = cada uno en su turno.
   */
  toquesYGritos: 'pie' | 'cualquiera'
  /** Antes de cada mano corta el de la izquierda del que reparte, eligiendo el corte. */
  corte: boolean
  /** Modo sucio (fase 3): permite mentir en envido y flor, con verificación al final. */
  modoSucio: boolean
  /** Si piden ver y hubo mentira, los puntos de tanto del mentiroso pasan al rival. */
  penalidadMentira: 'puntosAlRival'
}

export const CONFIG_DEFAULT: ConfigSala = {
  formato: '1v1',
  puntosPartida: 30,
  puntosMalas: 15,
  florConPiezas: 'piezaMayorMasDigitos',
  valorContraflor: 6,
  faltaEnvidoEnMalas: 'completarMalas',
  picaPica: true,
  tramoPicaPica: { desde: 0, hasta: 15 },
  picaPicaAlternado: true,
  florObligatoria: true,
  envidoEnvido: true,
  empiezaTrasParda: 'quienEmpezo',
  mazoCobraEnvidoPendiente: true,
  toquesYGritos: 'cualquiera',
  corte: false,
  modoSucio: false,
  penalidadMentira: 'puntosAlRival',
}

/**
 * Config completa a partir de una parcial. Si cambia el largo del partido y no se dicen las malas
 * ni el tramo del pica-pica, salen de la mitad del partido.
 */
export function crearConfig(parcial: Partial<ConfigSala> = {}): ConfigSala {
  const puntosPartida = parcial.puntosPartida ?? CONFIG_DEFAULT.puntosPartida
  const puntosMalas = parcial.puntosMalas ?? puntosPartida / 2
  return {
    ...CONFIG_DEFAULT,
    puntosMalas,
    tramoPicaPica: { desde: 0, hasta: puntosMalas },
    ...parcial,
  }
}

export function cantidadJugadores(formato: Formato): 2 | 4 | 6 {
  return formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
}
