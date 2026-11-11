import type { Carta } from '@truco/engine'
import type { ManoGuiada, Movida } from './guion'
import type { Paso } from './lecciones'

/**
 * Las lecciones que se juegan: las vueltas, el truco y el envido en juego. Cada una tiene manos
 * guiadas (con el motor y las cartas armadas) y preguntas. Los puntos y las reglas son los del
 * motor con la config de siempre (test/tutorialMano.test.tsx lo controla).
 */

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })
const carta = (numero: Carta['numero'], palo: Carta['palo']): Movida => ({ tipo: 'carta', carta: c(numero, palo) })
const TRUCO: Movida = { tipo: 'truco' }
const QUIERO: Movida = { tipo: 'quiero' }
const NO_QUIERO: Movida = { tipo: 'noQuiero' }
const ENVIDO: Movida = { tipo: 'envido', canto: 'envido' }
const REAL_ENVIDO: Movida = { tipo: 'envido', canto: 'realEnvido' }

/** La mano como paso de la lección: arranca con `intro` o, si no, con lo primero que se pide. */
function mano(m: ManoGuiada, intro?: string): Paso {
  const primero = m.guion[0]
  const consigna = intro ?? (primero && 'pide' in primero ? primero.pide : '')
  return { tipo: 'mano', consigna, mano: m }
}

/** Para los pasos donde lo único que se puede hacer es tirar: "contestá primero". */
const esCarta = (m: Movida) => m.tipo === 'carta'

// ——— Las vueltas ———

/** Una muestra que no toca a ninguna carta de las manos: así no aparecen piezas. */
const SIN_PIEZAS = c(6, 'copa')

/** Sos mano y ganás las dos primeras: con dos alcanza. */
const GANAR_DOS: ManoGuiada = {
  mano: 'vos',
  muestra: SIN_PIEZAS,
  vos: [c(3, 'espada'), c(12, 'basto'), c(7, 'oro')],
  rival: [c(2, 'basto'), c(1, 'copa'), c(3, 'oro')],
  guion: [
    {
      pide: 'Sos mano: arrancás vos. Abrí con el 3 de espadas, a ver qué tiro yo.',
      espera: carta(3, 'espada'),
      mal: 'Abrí con el 3 de espadas. El 7 de oros es una mata: guardala para después.',
    },
    { rival: carta(2, 'basto') },
    {
      pide: 'Mi 2 no le gana a tu 3: la primera es tuya. El que gana una vuelta empieza la siguiente, así que tirás vos. Si ganás esta, ganás la mano: jugá tu carta más alta.',
      espera: carta(7, 'oro'),
      mal: 'El 12 de bastos es una negra: si me queda un 3, te la mato. Para asegurar, la más alta: el 7 de oros.',
    },
    { rival: carta(3, 'oro') },
  ],
  fin: '¡Dos vueltas para vos! Ganaste la mano sin jugar la tercera: con dos alcanza. Sin cantos, la mano vale 1 punto.',
}

/** Soy mano yo, cada uno gana una y la tercera define. */
const UNA_Y_UNA: ManoGuiada = {
  mano: 'rival',
  muestra: SIN_PIEZAS,
  vos: [c(1, 'espada'), c(12, 'oro'), c(5, 'basto')],
  rival: [c(3, 'basto'), c(2, 'espada'), c(4, 'oro')],
  guion: [
    { rival: carta(3, 'basto') },
    {
      pide: 'Ahora el mano soy yo, así que juego primero. Tiré un 3. ¿Con qué lo matás? Tocá la carta que le gana.',
      espera: carta(1, 'espada'),
      mal: (m) =>
        m.tipo === 'carta' && m.carta.numero === 12
          ? 'El 12 de oros es una negra: no le gana a un 3. Buscá una mata.'
          : 'Un 5 no le gana a un 3. La espadilla sí: es la mata más alta. Solo las piezas le ganan, y acá no hay ninguna.',
    },
    {
      pide: '¡Lo mataste con la espadilla! La primera es tuya, así que empezás vos. Tirá el 12 de oros.',
      espera: carta(12, 'oro'),
      mal: 'Tirá el 12 de oros, que te quiero mostrar qué pasa cuando cada uno gana una.',
    },
    { rival: carta(2, 'espada') },
    { rival: carta(4, 'oro') },
    {
      pide: 'Mi 2 mató a tu 12: la segunda es mía. Uno y uno: la tercera define. Empecé yo, que gané la segunda, con un 4. ¿Le ganás?',
      espera: carta(5, 'basto'),
      mal: 'Tirá tu última carta.',
    },
  ],
  fin: 'Tu 5 le gana a mi 4. Primera tuya, segunda mía y tercera tuya: dos de tres, la mano es tuya.',
}

/** La primera es parda y la segunda define. */
const PRIMERA_PARDA: ManoGuiada = {
  mano: 'vos',
  muestra: SIN_PIEZAS,
  vos: [c(3, 'oro'), c(2, 'basto'), c(4, 'espada')],
  rival: [c(3, 'espada'), c(12, 'basto'), c(6, 'oro')],
  guion: [
    {
      pide: 'Ahora la parda. Sos mano: abrí con el 3 de oros.',
      espera: carta(3, 'oro'),
      mal: 'Abrí con el 3 de oros, que te quiero mostrar la parda.',
    },
    { rival: carta(3, 'espada') },
    {
      pide: '¡Parda! Dos tres valen lo mismo y nadie gana la vuelta. Con la primera parda, la segunda decide la mano. Empieza otra vez el que empezó la parda: vos. Jugá tu mejor carta.',
      espera: carta(2, 'basto'),
      mal: 'Con el 4 perdés seguro, y después de una parda la que viene decide todo. Jugá tu mejor carta: el 2.',
    },
    { rival: carta(12, 'basto') },
  ],
  fin: 'Tu 2 le gana a mi 12 y te llevás la mano: primera parda, la segunda define.',
}

function vueltas(): Paso[] {
  return [
    {
      tipo: 'dice',
      texto: 'Ahora vamos a jugar de verdad, vos y yo, mano a mano. Yo hago de rival, pero te voy diciendo qué hacer.',
      pizarra: { dibujo: '🤝', leyenda: 'Mano a mano' },
    },
    {
      tipo: 'dice',
      texto: 'Cada mano tiene hasta tres vueltas. En cada una tiramos una carta cada uno y gana la más alta. El que gana dos vueltas, gana la mano.',
      pizarra: { dibujo: '✌️', leyenda: 'Dos de tres' },
    },
    {
      tipo: 'dice',
      texto: 'El mano es el que juega primero: el que está a la derecha del que repartió. Mano a mano, una vez sos mano vos y otra vez yo. Y el que gana una vuelta empieza la siguiente.',
      pizarra: { dibujo: '👉', leyenda: 'El mano juega primero' },
    },
    mano(GANAR_DOS),
    mano(UNA_Y_UNA, 'Otra mano. Ahora reparto vos, así que el mano soy yo: juego primero…'),
    mano(PRIMERA_PARDA),
    {
      tipo: 'dice',
      texto: 'Las otras pardas: si uno gana la primera y la segunda es parda, gana el de la primera. Si van una y una y la tercera es parda, también gana el de la primera. Y si son todas pardas, gana el mano.',
      pizarra: { dibujo: '🤝', leyenda: 'La primera manda' },
    },
    {
      tipo: 'pregunta',
      pregunta: 'Ganaste la primera y la segunda fue parda. ¿De quién es la mano?',
      opciones: ['Mía', 'De Don Queiroz', 'Se juega la tercera'],
      correcta: 0,
      bien: '¡Eso! Ganaste la primera y la segunda fue parda: no hace falta la tercera.',
      mal: 'No: con la segunda parda gana el que ganó la primera. Y la primera fue tuya.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Gané yo la primera, vos la segunda y la tercera fue parda. ¿De quién es la mano?',
      opciones: ['Mía', 'De Don Queiroz, que ganó la primera', 'Del que es mano'],
      correcta: 1,
      bien: 'Así es: una y una con la tercera parda, gana el que ganó la primera.',
      mal: 'No… Una y una y la tercera parda: gana el que ganó la primera. Y la primera fue mía.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Vos sos mano y salen las tres pardas. ¿Quién gana?',
      opciones: ['Yo, que soy mano', 'Don Queiroz', 'Nadie: se reparte de nuevo'],
      correcta: 0,
      bien: '¡Bien! Todas pardas, gana el mano. Por eso ser mano es una ventaja.',
      mal: 'No: si son todas pardas, gana el mano. Y el mano sos vos.',
    },
  ]
}

// ——— Truco, retruco y vale cuatro ———

const MUESTRA_CANTOS = c(12, 'copa')

/** Te grito truco de entrada y tus cartas son las peores: no se quiere. */
const NO_SE_QUIERE: ManoGuiada = {
  mano: 'rival',
  muestra: MUESTRA_CANTOS,
  vos: [c(4, 'oro'), c(5, 'espada'), c(6, 'basto')],
  rival: [c(1, 'basto'), c(3, 'espada'), c(2, 'oro')],
  guion: [
    { rival: TRUCO },
    {
      pide: '¡Truco! Te lo grité de entrada. Mirá tus cartas: un 4, un 5 y un 6, de las más bajas. ¿Qué me contestás?',
      espera: NO_QUIERO,
      botones: [QUIERO, NO_QUIERO, TRUCO],
      mal: (m) =>
        m.tipo === 'quiero'
          ? 'Con esas cartas no ganás ni una vuelta: si querés, me llevo 2. No queriendo, me llevo 1 y listo.'
          : m.tipo === 'truco'
            ? '¿Retruco con un 4, un 5 y un 6? Si te lo quiero, perdés 3. Acá no se quiere.'
            : 'Primero contestá el truco: hasta que no digas quiero o no quiero, no se tira.',
    },
  ],
  fin: 'No quisiste: la mano se termina y me llevo 1 punto, lo que valía antes del truco. A veces perder 1 es ganar.',
}

/** Truco querido, retruco tuyo y vale cuatro mío: la mano vale 4. */
const VALE_CUATRO: ManoGuiada = {
  mano: 'rival',
  muestra: MUESTRA_CANTOS,
  vos: [c(7, 'espada'), c(5, 'oro'), c(1, 'espada')],
  rival: [c(2, 'oro'), c(12, 'espada'), c(4, 'basto')],
  guion: [
    { rival: carta(2, 'oro') },
    {
      pide: 'Ahora vamos con todo. Tiré un 2. Matalo con el 7 de espadas y guardá la espadilla.',
      espera: carta(7, 'espada'),
      mal: (m) =>
        m.tipo === 'carta' && m.carta.numero === 1
          ? 'Con la espadilla también lo matás, pero guardala: es la mata más alta y te va a servir después. Usá el 7 de espadas.'
          : 'El 5 no le gana a un 2. Usá el 7 de espadas.',
    },
    {
      pide: 'La primera es tuya y empezás vos. Tirá el 5 de oros: la espadilla, guardada.',
      espera: carta(5, 'oro'),
      mal: 'Tirá el 5 de oros: la espadilla la guardamos para el final.',
    },
    { rival: TRUCO },
    {
      pide: '¡Truco! Ganaste la primera y tenés la espadilla guardada: es la mata más alta, solo una pieza te la gana. Y la muestra es de copas: de mis cartas no hay ninguna de copas. ¿Qué me contestás?',
      espera: QUIERO,
      botones: [QUIERO, NO_QUIERO],
      mal: (m) => (esCarta(m) ? 'Primero contestá el truco.' : 'Si no querés, me llevo 1. ¡Con la espadilla en la mano hay que querer!'),
    },
    { rival: carta(12, 'espada') },
    { rival: carta(4, 'basto') },
    {
      pide: 'Mi 12 de espadas mató a tu 5: uno y uno. Y abrí la tercera con mi última carta, un 4. Vos quisiste el truco, así que podés subir: antes de tirar, ¡gritá retruco!',
      espera: TRUCO,
      botones: [TRUCO],
      mal: 'Si tirás ya, ganás 2. Antes de tirar gritá retruco: el que quiso el truco es el que puede subir.',
    },
    { rival: TRUCO },
    {
      pide: '¡Vale cuatro! Me agrandé: en el truco también se miente. ¿Lo querés? Mirá la mesa: mi última carta es un 4 y a vos te queda la espadilla.',
      espera: QUIERO,
      botones: [QUIERO, NO_QUIERO],
      mal: (m) =>
        esCarta(m) ? 'Primero contestá el vale cuatro.' : 'Si no querés, me llevo 3, lo que valía el retruco. ¡Y tu espadilla le gana seguro a mi 4!',
    },
    {
      pide: '¡Quisiste! Ahora la mano vale 4. Tirá la espadilla.',
      espera: carta(1, 'espada'),
      mal: 'Tirá la espadilla.',
    },
  ],
  fin: '¡Vale cuatro querido y ganado: 4 puntos para vos! Truco, retruco y vale cuatro en una sola mano.',
}

function cantos(): Paso[] {
  return [
    {
      tipo: 'dice',
      texto: 'Hasta ahora cada mano valía 1 punto. Pero en el truco se apuesta: el que tiene buenas cartas, o se hace el que tiene, grita truco.',
      pizarra: { dibujo: '📣', leyenda: '¡Truco!' },
    },
    {
      tipo: 'dice',
      texto: 'Si te gritan truco y lo querés, la mano vale 2. El que quiso puede subir: retruco, y vale 3. Y el que gritó el truco le contesta vale cuatro: vale 4. Más no hay.',
      pizarra: { dibujo: '📈', leyenda: 'Truco 2 · Retruco 3 · Vale cuatro 4' },
    },
    {
      tipo: 'dice',
      texto: 'Si no querés, la mano se termina ahí y el que gritó se lleva lo que valía antes: el truco no querido da 1, el retruco no querido da 2 y el vale cuatro no querido da 3.',
      pizarra: { dibujo: '🙅', leyenda: 'No quiero: lo de antes' },
    },
    {
      tipo: 'dice',
      texto: 'Se grita en tu turno, antes de tirar. Y sube solo el que quiso el último canto: si yo grito truco y vos lo querés, el retruco lo gritás vos cuando te toque. Si te gritan, en vez de "quiero" podés subir de una: eso ya es querer.',
      pizarra: { dibujo: '🔁', leyenda: 'Sube el que quiso' },
    },
    mano(NO_SE_QUIERE, 'Vamos a jugar. Esta vez soy mano yo…'),
    mano(VALE_CUATRO, 'Otra. Soy mano otra vez…'),
    {
      tipo: 'pregunta',
      pregunta: 'Gritaste truco, te lo quise y ganaste la mano. ¿Cuántos puntos te llevás?',
      opciones: ['1', '2', '3'],
      correcta: 1,
      bien: '¡Eso! Truco querido: 2 puntos.',
      mal: 'No: el truco querido hace que la mano valga 2.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Te grito retruco y no lo querés. ¿Cuántos puntos me llevo?',
      opciones: ['1', '2', '3'],
      correcta: 1,
      bien: 'Así es: me llevo lo que valía antes del retruco, el truco querido: 2.',
      mal: 'No… Sin querer, me llevo lo que valía antes del último canto. Antes del retruco estaba el truco querido: 2.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Yo grité truco y vos lo quisiste. ¿Quién puede gritar retruco?',
      opciones: ['Yo, que lo quise', 'Don Queiroz, que lo gritó', 'Cualquiera de los dos'],
      correcta: 0,
      bien: '¡Bien! Sube el que quiso el último canto: vos.',
      mal: 'No: el que gritó no puede subir lo suyo. Sube el que lo quiso: vos.',
    },
    {
      tipo: 'pregunta',
      pregunta: '¿Qué gritás acá? Me quisiste el truco, tenés la espadilla y el 7 de espadas, y te toca.',
      opciones: ['Retruco', 'Vale cuatro', 'Truco otra vez'],
      correcta: 0,
      bien: '¡Retruco! Vos quisiste, así que subís vos, y de a uno: después del truco viene el retruco.',
      mal: 'No: se sube de a uno. Después del truco querido viene el retruco.',
    },
  ]
}

// ——— El envido en juego ———

const MUESTRA_ENVIDO = c(12, 'copa')

/** Sos mano con 33: tocás envido, no te lo quiero y me voy al mazo. */
const ENVIDO_NO_QUERIDO: ManoGuiada = {
  mano: 'vos',
  muestra: MUESTRA_ENVIDO,
  vos: [c(7, 'oro'), c(6, 'oro'), c(3, 'basto')],
  rival: [c(4, 'espada'), c(6, 'basto'), c(12, 'oro')],
  guion: [
    {
      pide: 'Sos mano y tenés el 7 y el 6 de oros: 33 de tanto, ¡un tantazo! Antes de tirar, tocá envido.',
      espera: ENVIDO,
      botones: [ENVIDO, TRUCO],
      mal: (m) =>
        esCarta(m)
          ? '¡Ojo! Si tirás la carta, ya no podés tocar envido. Primero el envido.'
          : 'El truco, después. Ahora tocá envido, que con 33 lo ganás casi seguro.',
    },
    { rival: NO_QUIERO },
    {
      pide: 'No te lo quise: te llevás 1 punto, que se anota al final de la mano. Seguimos con las vueltas: tirá el 7 de oros.',
      espera: carta(7, 'oro'),
      mal: 'Tirá el 7 de oros, que es una mata.',
    },
    { rival: { tipo: 'mazo' } },
  ],
  fin: 'Me fui al mazo: te llevás la mano (1) y el envido no querido (1). Dos puntos sin pelear.',
}

/** Te grito truco, el envido va primero, real envido querido y se dicen los tantos. */
const ENVIDO_VA_PRIMERO: ManoGuiada = {
  mano: 'rival',
  muestra: MUESTRA_ENVIDO,
  vos: [c(6, 'espada'), c(5, 'espada'), c(4, 'basto')],
  rival: [c(7, 'basto'), c(12, 'basto'), c(1, 'espada')],
  guion: [
    { rival: TRUCO },
    {
      pide: '¡Truco! Pero vos tenés el 6 y el 5 de espadas: 31 de tanto. Estamos en la primera y el truco está sin contestar: ¡el envido va primero! Tocá envido.',
      espera: ENVIDO,
      botones: [QUIERO, NO_QUIERO, ENVIDO],
      mal: (m) =>
        m.tipo === 'quiero'
          ? 'Si querés el truco, el envido ya no se puede tocar. Primero el envido.'
          : m.tipo === 'noQuiero'
            ? 'Si no querés, se termina la mano y perdés el envido. ¡El envido va primero!'
            : 'Primero hay que contestar el truco… o tocar envido, que va primero.',
    },
    { rival: REAL_ENVIDO },
    {
      pide: 'Te subí: real envido. Si lo querés se juegan los dos: 2 + 3 = 5 puntos. Si no, me llevo 2, lo del envido. Con 31, ¿qué decís?',
      espera: QUIERO,
      botones: [QUIERO, NO_QUIERO],
      mal: (m) => (esCarta(m) ? 'Primero contestá el real envido.' : 'Con 31 tenés buen tanto: si no querés, me llevás 2 de regalo.'),
    },
    { rival: { tipo: 'tanto', tanto: 27 } },
    {
      pide: 'Querido. Ahora se dicen los tantos, primero el mano: yo tengo 27. Vos tenés 31, que es más: decilo.',
      espera: { tipo: 'tanto', tanto: 31 },
      botones: [
        { tipo: 'tanto', tanto: 31 },
        { tipo: 'tanto', tanto: 'sonBuenas' },
      ],
      mal: (m) =>
        esCarta(m)
          ? 'Primero se dicen los tantos.'
          : 'Tenés 31 y yo 27: tenés más, así que lo tenés que decir. "Son buenas" se dice cuando el otro tiene más.',
    },
    {
      pide: '¡El envido es tuyo: 5 puntos, que se anotan al final! Ahora sí: mi truco sigue sin contestar. Con un 6, un 5 y un 4 no ganás vueltas…',
      espera: NO_QUIERO,
      botones: [QUIERO, NO_QUIERO],
      mal: (m) =>
        esCarta(m)
          ? 'Primero contestá el truco.'
          : 'Con un 6, un 5 y un 4 contra mis cartas, si querés perdés 2. Mejor no querer: me llevo 1.',
    },
  ],
  fin: 'Quedó 5 para vos por el envido y 1 para mí por el truco no querido. El envido va aparte de las vueltas: lo ganaste igual.',
}

function envidoEnJuego(): Paso[] {
  return [
    {
      tipo: 'dice',
      texto: 'El envido es otra apuesta, aparte de las vueltas: gana el que tiene más tanto. Cómo se cuenta ya lo vimos; ahora, cómo se toca.',
      pizarra: { dibujo: '🎲', leyenda: 'Una apuesta aparte' },
    },
    {
      tipo: 'dice',
      texto: 'Se toca en la primera vuelta, en tu turno y antes de tirar tu carta. Después, ya no.',
      pizarra: { dibujo: '1️⃣', leyenda: 'Solo en la primera' },
    },
    {
      tipo: 'dice',
      texto: 'El envido vale 2 y el real envido, 3. La falta envido vale lo que le falta al que va ganando para salir de las malas (los primeros 15). Si ya salió, lo que le falta para ganar el partido.',
      pizarra: { dibujo: '💰', leyenda: 'Envido 2 · Real envido 3 · Falta' },
    },
    {
      tipo: 'dice',
      texto: 'Se pueden encadenar: envido y envido, envido y real envido… Si se quiere, se suma todo. Si no se quiere, el primer canto da 1; y si ya había cantos, se lleva lo que sumaban antes del último.',
      pizarra: { dibujo: '🔗', leyenda: 'Querido se suma todo' },
    },
    {
      tipo: 'dice',
      texto: 'Querido, se dicen los tantos: primero el mano y después el otro, que dice el suyo si es más alto o "son buenas" si no. Si empatan, gana el mano. Los puntos se anotan al final de la mano.',
      pizarra: { dibujo: '🗣️', leyenda: 'Primero el mano' },
    },
    mano(ENVIDO_NO_QUERIDO),
    {
      tipo: 'dice',
      texto: 'Y algo importante: el envido va primero. Si en la primera vuelta te gritan truco, antes de contestarlo podés tocar envido. Se arregla el envido y después contestás el truco. Pero si el truco ya se quiso, el envido no va más.',
      pizarra: { dibujo: '☝️', leyenda: 'El envido va primero' },
    },
    mano(ENVIDO_VA_PRIMERO, 'A ver si te acordás. Soy mano yo…'),
    {
      tipo: 'pregunta',
      pregunta: 'Toco envido, me contestás real envido y no te lo quiero. ¿Cuántos puntos te llevás?',
      opciones: ['1', '2', '5'],
      correcta: 1,
      bien: '¡Eso! Sin querer, te llevás lo que sumaban los cantos antes del último: el envido, 2.',
      mal: 'No: si no se quiere, se lleva lo de antes del último canto. Antes del real envido estaba el envido: 2.',
    },
    {
      tipo: 'pregunta',
      pregunta: '¿Y si te lo quiero? Envido y real envido querido, ¿cuánto vale?',
      opciones: ['3', '5', '2'],
      correcta: 1,
      bien: '¡Bien! Querido se suma todo: 2 + 3 = 5.',
      mal: 'No… Querido se suma todo: el envido 2 y el real envido 3.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Vamos 9 a 6, voy ganando yo. Tocás falta envido, te la quiero y la ganás. ¿Cuántos puntos te llevás?',
      opciones: ['6', '21', '9'],
      correcta: 0,
      bien: '¡Justo! El que va ganando soy yo, con 9: me faltan 6 para salir de las malas. Eso vale la falta.',
      mal: 'No: la falta vale lo que le falta al que va ganando (yo, con 9) para salir de las malas. 15 menos 9: 6.',
    },
    {
      tipo: 'pregunta',
      pregunta: 'Ya tiraste tu carta de la primera vuelta. ¿Podés tocar envido?',
      opciones: ['No: es antes de tirar', 'Sí, mientras dure la primera', 'Sí, en cualquier vuelta'],
      correcta: 0,
      bien: 'Así es: el envido se toca antes de tirar tu carta de la primera.',
      mal: 'No: una vez que tiraste tu carta de la primera, el envido ya no se toca.',
    },
  ]
}

export const PASOS_MANO = { vueltas, cantos, envidoEnJuego }

/** Las manos guiadas de cada lección (para los tests). */
export const MANOS_GUIADAS = { GANAR_DOS, UNA_Y_UNA, PRIMERA_PARDA, NO_SE_QUIERE, VALE_CUATRO, ENVIDO_NO_QUERIDO, ENVIDO_VA_PRIMERO }
