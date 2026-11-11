import type { Senia } from '@truco/bots'
import type { Paso } from './lecciones'

/**
 * "En equipo" (las señas y el pie) y "El examen". Los pasos nuevos que usan: la mesa dibujada, un
 * gesto de Don Queiroz, rondas de "¿qué seña te hizo?" y el botón para ir a jugar el examen.
 */
export type PasoEquipo =
  /** La mesa vista de arriba: los equipos intercalados, o el orden de juego con los dos pies. */
  | { tipo: 'mesa'; consigna: string; jugadores: 4 | 6; marcar: 'equipos' | 'pie' }
  /** Don Queiroz hace una seña (una y otra vez) mientras la explica. */
  | { tipo: 'gesto'; consigna: string; senia: Senia }
  /** Rondas de "¿qué seña te hizo tu compañero?": ves el gesto y elegís qué carta anuncia. */
  | { tipo: 'senias'; consigna: string; rondas: number }
  /** El examen: la partida contra la compu (el botón para ir a la mesa). */
  | { tipo: 'examen'; consigna: string }

/** Las señas que se enseñan (y entran en el ejercicio), con lo que anuncian dicho para el que aprende. */
export const SENIAS_TUTORIAL: readonly Senia[] = ['pieza2', 'pieza4', 'perico', 'perica', 'unoBravo', 'sieteBravo', 'tres', 'flor']
export const QUE_ANUNCIA: Record<Senia, string> = {
  pieza2: 'El 2 de la muestra',
  pieza4: 'El 4 de la muestra',
  pieza5: 'El 5 de la muestra',
  perico: 'El perico (11 de la muestra)',
  perica: 'La perica (10 de la muestra)',
  unoBravo: 'La espadilla o el bastillo',
  sieteBravo: 'El 7 de espadas o el 7 de oros',
  tres: 'Un 3',
  dosComun: 'Un 2',
  unoFalso: 'El 1 de copas o de oros',
  flor: 'Flor',
  envido: 'Mucho envido',
}

export const EQUIPOS: Paso[] = [
  { tipo: 'mesa', consigna: 'Hasta ahora jugamos mano a mano. Pero el truco de ley se juega en equipo: dos contra dos, o tres contra tres.', jugadores: 4, marcar: 'equipos' },
  { tipo: 'mesa', consigna: 'Se sientan intercalados: uno de cada equipo. En el tres contra tres es igual, de a seis en la mesa.', jugadores: 6, marcar: 'equipos' },
  { tipo: 'dice', texto: 'Las vueltas, los puntos y los cantos son del equipo: si tu compañero gana la vuelta, la ganaste vos también.', pizarra: { dibujo: '🤝', leyenda: 'Se gana y se pierde juntos' } },
  {
    tipo: 'dice',
    texto: 'Y lo más lindo: de las cartas no se habla. Para eso están las señas. Se hacen calladito, con la cara, para que tu compañero sepa lo que tenés y el rival no se dé cuenta.',
    pizarra: { dibujo: '🤫', leyenda: 'Calladito' },
  },
  { tipo: 'gesto', consigna: 'Levantar las cejas es el 2 de la muestra: la pieza más alta de todas.', senia: 'pieza2' },
  { tipo: 'gesto', consigna: 'Un beso es el 4 de la muestra.', senia: 'pieza4' },
  { tipo: 'gesto', consigna: 'Guiñar el ojo derecho es el perico: el 11 de la muestra.', senia: 'perico' },
  { tipo: 'gesto', consigna: 'Y el ojo izquierdo, la perica: el 10 de la muestra.', senia: 'perica' },
  { tipo: 'gesto', consigna: 'La pera para la derecha es la espadilla o el bastillo: una mata grande.', senia: 'unoBravo' },
  { tipo: 'gesto', consigna: 'Y la pera para el otro lado, a la izquierda, es el 7 de espadas o el 7 de oros: las otras dos matas.', senia: 'sieteBravo' },
  { tipo: 'gesto', consigna: 'Morderse el labio de abajo es un 3.', senia: 'tres' },
  { tipo: 'gesto', consigna: 'Y si inflás los cachetes como un sapo, tenés flor.', senia: 'flor' },
  { tipo: 'senias', consigna: 'A ver si me entendés. ¿Qué seña te hizo tu compañero?', rondas: 6 },
  {
    tipo: 'dice',
    texto: 'Ojo, que el rival también mira: si te pesca la seña, sabe lo que tenés. Hacela rápido, cuando no te miren. Y a veces se miente, para engañarlo.',
    pizarra: { dibujo: '👀', leyenda: 'El rival también mira' },
  },
  {
    tipo: 'mesa',
    consigna: 'Ahora, el pie. El pie es el último de cada equipo en jugar. Acá el que reparte es pie de los rivales, y vos, que jugás tercero, sos el pie de tu equipo.',
    jugadores: 4,
    marcar: 'pie',
  },
  {
    tipo: 'dice',
    texto: 'El pie tira las reglas: ya vio las señas de todos, así que manda. A su compañero le dice "matala", "dejala" o "vení a mí", y decide si se toca o se grita.',
    pizarra: { dibujo: '🫡', leyenda: 'El pie manda' },
  },
  {
    tipo: 'dice',
    texto: 'La flor se canta, el envido se toca y el truco se grita. El toque casi siempre es del pie: es el que sabe cuánto tiene el equipo.',
    pizarra: { dibujo: '📣', leyenda: 'Tocar: envido · Gritar: truco' },
  },
  {
    tipo: 'pregunta',
    pregunta: '¿Quién es el pie?',
    opciones: ['El último de cada equipo en jugar', 'El que reparte, siempre', 'El que es mano'],
    correcta: 0,
    bien: '¡Eso! El último de cada equipo. El que reparte es pie, sí, pero de su equipo nomás.',
    mal: 'Casi… Pensá en quién ve las señas de todos antes de jugar.',
  },
  {
    tipo: 'pregunta',
    pregunta: 'En equipo, ¿quién suele tocar (el envido)?',
    opciones: ['El pie', 'El que es mano', 'Cualquiera, a los gritos'],
    correcta: 0,
    bien: 'Así es: el toque es del pie, que ya sabe cuánto tiene el equipo.',
    mal: 'No… Acordate: el pie es el que tira las reglas.',
  },
]

export const EXAMEN: Paso[] = [
  { tipo: 'dice', texto: 'Llegó el día, gurí: el examen. Vas a jugar una partida de verdad y yo me siento al lado a mirar.', pizarra: { dibujo: '🎓', leyenda: 'El examen' } },
  {
    tipo: 'dice',
    texto: 'Mano a mano contra la compu, en fácil y a 20 puntos: 10 malas y 10 buenas. Te dejo las ayudas prendidas: te marcan las piezas y las matas.',
    pizarra: { dibujo: '🃏', leyenda: '1 contra 1 · a 20' },
  },
  { tipo: 'dice', texto: 'Mirá la muestra, contá tus piezas y no le tengas miedo al truco. Si ganás, te recibís de truquero.', pizarra: { dibujo: '🧉', leyenda: 'Tranquilo, que te miro' } },
  { tipo: 'examen', consigna: '¿Listo? Cuando quieras, arrancamos.' },
]
