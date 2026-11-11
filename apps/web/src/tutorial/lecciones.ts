import { esPieza, type Carta } from '@truco/engine'
import type { IdLeccion } from '@truco/shared'
import { envido, flor } from './lecciones-tanto'
import { cartasConPalo, cartasConPiezas, ESCALERA, muestraAlAzar, muestraPieza, type Azar } from './cartas'

/**
 * Lo que dice Don Queiroz en cada lección y los ejercicios, paso a paso. Las cartas de los
 * ejercicios se arman al azar al empezar la lección.
 */

/** Lo que se ve en la pizarra mientras habla: cartas (con o sin muestra) o un dibujo con su leyenda. */
export interface Pizarra {
  cartas?: Carta[]
  muestra?: Carta
  dibujo?: string
  leyenda?: string
}

export type Paso =
  | { tipo: 'dice'; texto: string; pizarra?: Pizarra }
  /** Tocar todas las cartas que cumplen algo (las espadas, las piezas…). */
  | { tipo: 'buscar'; consigna: string; cartas: Carta[]; muestra?: Carta; es: (c: Carta) => boolean; porQueNo: (c: Carta) => string }
  | { tipo: 'pregunta'; pregunta: string; opciones: string[]; correcta: number; bien: string; mal: string; pizarra?: Pizarra }
  /** Rondas de "¿cuál gana?" entre dos cartas (o "son iguales"). */
  | { tipo: 'comparar'; consigna: string; rondas: number; conMuestra: boolean }
  /** Rondas de ordenar tres cartas de la mejor a la peor, con muestra. */
  | { tipo: 'ordenar'; consigna: string; rondas: number }
  /** Rondas de cargar el envido o la flor de una mano (con o sin muestra). */
  | { tipo: 'cargar'; consigna: string; que: 'envido' | 'flor'; rondas: number; conMuestra: boolean }
  /** Rondas de "¿tiene flor o no?", con muestra. */
  | { tipo: 'tieneFlor'; consigna: string; rondas: number }

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

const HISTORIA: Paso[] = [
  { tipo: 'dice', texto: '¡Buenas! Soy Queiroz, pero acá todos me dicen Don Queiroz. Vengo a enseñarte a jugar al truco, como me enseñaron a mí.', pizarra: { dibujo: '🧉', leyenda: 'Arrimate a la mesa' } },
  { tipo: 'dice', texto: 'El truco es viejo, eh. Nació en España, en Valencia y Cataluña, donde le decían "truc". Ya en 1384 en Valencia se prohibían los juegos de naipes… y se jugaba igual.', pizarra: { dibujo: '🏰', leyenda: 'Valencia, siglo XIV' } },
  { tipo: 'dice', texto: 'Cruzó el mar con los que vinieron a estas tierras y se quedó en el Río de la Plata: en las pulperías, en las estancias, en los fogones de los gauchos.', pizarra: { dibujo: '⛵', leyenda: 'Del otro lado del mar' } },
  { tipo: 'dice', texto: 'Acá le agregamos lo nuestro: la muestra y las piezas. Por eso el truco uruguayo no es igual a ningún otro. Y las señas, que se hacen calladito, para que el rival no vea.', pizarra: { dibujo: '🇺🇾', leyenda: 'Con muestra, piezas y flor' } },
  { tipo: 'dice', texto: 'Se juega en el boliche, en el club, en la playa y en la sobremesa del asado. Ahora te toca a vos, gurí. Vamos de a poco.', pizarra: { dibujo: '🃏', leyenda: 'Ahora, vos' } },
  {
    tipo: 'pregunta',
    pregunta: '¿Y qué es lo que tiene el truco uruguayo que no tienen los otros?',
    opciones: ['La muestra y las piezas', 'Se juega con 50 cartas', 'No tiene envido'],
    correcta: 0,
    bien: '¡Eso mismo! La muestra y las piezas. Ya vas a ver qué son.',
    mal: 'No, no… Pensá en lo que te conté: lo que le agregamos acá.',
  },
]

function baraja(azar: Azar): Paso[] {
  return [
    { tipo: 'dice', texto: 'Se juega con la baraja española: cuatro palos. Espadas, bastos, oros y copas.', pizarra: { cartas: [c(1, 'espada'), c(1, 'basto'), c(1, 'oro'), c(1, 'copa')] } },
    { tipo: 'dice', texto: 'Cada palo tiene del 1 al 7, y después el 10, el 11 y el 12. Fijate bien: no hay ni 8 ni 9. Son 40 cartas en total.', pizarra: { cartas: [c(1, 'oro'), c(2, 'oro'), c(3, 'oro'), c(4, 'oro'), c(5, 'oro'), c(6, 'oro'), c(7, 'oro'), c(10, 'oro'), c(11, 'oro'), c(12, 'oro')] } },
    { tipo: 'dice', texto: 'El 10, el 11 y el 12 son las figuras: la sota, el caballo y el rey. En la mesa les decimos las negras.', pizarra: { cartas: [c(10, 'copa'), c(11, 'copa'), c(12, 'copa')] } },
    {
      tipo: 'buscar',
      consigna: 'A ver… tocá todas las espadas.',
      cartas: cartasConPalo(azar, 'espada', 12, 4),
      es: (x) => x.palo === 'espada',
      porQueNo: (x) => `Esa es de ${x.palo === 'basto' ? 'bastos' : x.palo === 'oro' ? 'oros' : 'copas'}. Las espadas son las finitas, filosas.`,
    },
    {
      tipo: 'pregunta',
      pregunta: '¿Qué números no están en la baraja?',
      opciones: ['El 8 y el 9', 'El 1 y el 2', 'El 10 y el 12'],
      correcta: 0,
      bien: '¡Bien! Ni 8 ni 9: del 7 se salta al 10.',
      mal: 'Esos sí están. Acordate: del 7 se salta derecho al 10.',
    },
  ]
}

const ESCALONES: Paso[] = ESCALERA.map((e, i) => ({
  tipo: 'dice' as const,
  texto: [
    'Arriba de todo, las matas: el 1 de espadas (el macho), el 1 de bastos, el 7 de espadas y el 7 de oros. En ese orden.',
    'Después vienen los tres. Todos los tres valen lo mismo, sean del palo que sean.',
    'Después, los dos.',
    'Después, los anchos falsos: el 1 de oros y el 1 de copas. Parecen grandes, pero no son matas.',
    'Después, las negras: el 12, el 11 y el 10, en ese orden.',
    'Después, los sietes falsos: el 7 de bastos y el 7 de copas.',
    'Y abajo de todo, el 6, el 5 y el 4. El 4 es la más baja de todas.',
  ][i]!,
  pizarra: { cartas: e.cartas, leyenda: e.nombre },
}))

const JERARQUIA: Paso[] = [
  { tipo: 'dice', texto: 'En cada vuelta, cada uno tira una carta y gana la más alta. Pero ojo, que no va por el número: tenés que aprenderte quién mata a quién.' },
  ...ESCALONES,
  { tipo: 'dice', texto: 'Si las dos valen lo mismo, como dos tres, es parda: nadie gana la vuelta. Por ahora jugamos sin muestra; la muestra viene en la próxima lección.' },
  { tipo: 'comparar', consigna: '¿Cuál gana? Tocá la carta más alta, o "Son iguales" si es parda.', rondas: 10, conMuestra: false },
]

function piezas(azar: Azar): Paso[] {
  const muestra = muestraAlAzar(azar)
  const conPieza = muestraPieza(azar)
  return [
    { tipo: 'dice', texto: 'Ahora lo nuestro. Después de repartir, se da vuelta una carta arriba del mazo: esa es la muestra.', pizarra: { muestra: c(6, 'oro'), leyenda: 'La muestra' } },
    {
      tipo: 'dice',
      texto: 'El 2, el 4, el 5, el 11 y el 10 del palo de la muestra son las piezas, y le ganan a todo. Hasta a las matas. El 2 es la más alta.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(4, 'oro'), c(5, 'oro'), c(11, 'oro'), c(10, 'oro')], leyenda: 'Las piezas, de mayor a menor' },
    },
    { tipo: 'dice', texto: 'Las del mismo número pero de otro palo no son piezas: si la muestra es de oros, el 2 de copas es un dos y nada más.', pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(2, 'copa')] } },
    {
      tipo: 'buscar',
      consigna: 'Mirá la muestra y tocá todas las piezas.',
      cartas: cartasConPiezas(azar, muestra, 9, 3),
      muestra,
      es: (x) => esPieza(x, muestra),
      porQueNo: (x) => (x.palo === muestra.palo ? `El ${x.numero} no es número de pieza: son el 2, 4, 5, 11 y 10.` : 'Esa no es del palo de la muestra.'),
    },
    {
      tipo: 'dice',
      texto: '¿Y si la muestra es una pieza? Por ejemplo, el 4 de copas. Ese 4 ya no está en juego, así que el 12 de copas toma su lugar y pasa a ser pieza.',
      pizarra: { muestra: c(4, 'copa'), cartas: [c(12, 'copa')], leyenda: 'El 12 hace de 4' },
    },
    {
      tipo: 'buscar',
      consigna: 'Ahora la muestra es pieza. Tocá todas las piezas, sin olvidarte del 12.',
      cartas: cartasConPiezas(azar, conPieza, 9, 5),
      muestra: conPieza,
      es: (x) => esPieza(x, conPieza),
      porQueNo: (x) => (x.palo === conPieza.palo ? 'Esa no es pieza. Acordate: el 12 hace de la pieza que salió de muestra.' : 'Esa no es del palo de la muestra.'),
    },
    { tipo: 'comparar', consigna: 'Con muestra: ¿cuál gana?', rondas: 6, conMuestra: true },
    { tipo: 'ordenar', consigna: 'Última: ordená tu mano. Tocá las cartas de la más alta a la más baja.', rondas: 3 },
  ]
}

/** Los pasos de la lección (con las cartas de los ejercicios ya elegidas), o null si todavía no está. */
export function pasosDe(id: IdLeccion, azar: Azar = Math.random): Paso[] | null {
  switch (id) {
    case 'historia':
      return HISTORIA
    case 'baraja':
      return baraja(azar)
    case 'jerarquia':
      return JERARQUIA
    case 'piezas':
      return piezas(azar)
    case 'envido':
      return envido()
    case 'flor':
      return flor()
    default:
      return null
  }
}

/** Lo que dice Don Queiroz al terminar, según las estrellas. */
export const AL_TERMINAR: Record<1 | 2 | 3, string> = {
  3: '¡Impecable, gurí! Ni un error. Así se aprende.',
  2: '¡Muy bien! Algún tropezón, pero se nota que le agarraste la mano.',
  1: 'Terminaste, que es lo que importa. Si querés, la repetimos y sale mejor.',
}
