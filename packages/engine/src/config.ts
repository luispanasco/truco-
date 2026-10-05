export type Formato = '1v1' | '2v2' | '3v3'

export type ReglaFlorConPiezas =
  /** Pieza más alta completa + último dígito de las otras piezas + cartas comunes. */
  | 'piezaMayorMasDigitos'
  /** Pieza más alta completa + las demás cartas por su número, como comunes. */
  | 'piezaMayorMasNumero'

export interface ConfigSala {
  formato: Formato
  puntosPartida: number
  /** Último puntaje que cuenta como "malas". */
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
  /** Se juega pica-pica mientras los dos equipos tienen entre `desde` y `hasta` puntos. */
  tramoPicaPica: { desde: number; hasta: number }
  /** Dentro del tramo, una mano redonda y una de pica-pica, empezando por la redonda. */
  picaPicaAlternado: boolean
  /** La flor se canta en la primera vuelta antes de jugar; si no, se pierde. */
  florObligatoria: boolean
  envidoEnvido: boolean
  /** Quién empieza la vuelta siguiente a una parda. */
  empiezaTrasParda: 'quienEmpezo' | 'mano'
  /** Irse al mazo con un envido del rival sin responder: el rival lo cobra como no querido. */
  mazoCobraEnvidoPendiente: boolean
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
  modoSucio: false,
  penalidadMentira: 'puntosAlRival',
}

export function crearConfig(parcial: Partial<ConfigSala> = {}): ConfigSala {
  return { ...CONFIG_DEFAULT, ...parcial }
}

export function cantidadJugadores(formato: Formato): 2 | 4 | 6 {
  return formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
}
