/**
 * Personajes típicos de Uruguay, para el modo historia (los rivales de cada lugar). Mientras el
 * modo historia no existe, los ve el admin: en la galería de la pantalla Avatar y como bots en
 * sus partidas.
 *
 * Cada pieza se busca por su nombre en el catálogo: si un nombre cambia, el test lo avisa.
 */

import { AVATAR_BASE, azarDeTexto, CATALOGO_AVATAR, type Avatar, type CapaAvatar } from './avatar'

export interface Personaje {
  id: string
  /** Como se sienta a la mesa: corto, para que entre debajo del avatar. */
  nombre: string
  /** Lo que es ("el Gaucho"): va con el nombre en la galería. */
  titulo: string
  /** De dónde es: el lugar del modo historia. */
  lugar: string
  descripcion: string
  /** Lo que dice en la previa de un nivel cuando no es el rival principal (o cuando es tu compañero). */
  saludo: string
  /** Lo que dice al final de un nivel del modo historia si te ganó (cuando el nivel no trae lo suyo). */
  siGana: string
  /** Lo que dice al final de un nivel si le ganaste. */
  siPierde: string
  avatar: Avatar
}

/** Las piezas de cada capa por su nombre; las capas sin nombrar quedan como en `AVATAR_BASE`. */
type Piezas = Partial<Record<CapaAvatar, string>>

/** La posición de una pieza en su capa, por el nombre. */
export function piezaPorNombre(capa: CapaAvatar, nombre: string): number {
  const i = CATALOGO_AVATAR[capa].findIndex((p) => p.nombre === nombre)
  if (i < 0) throw new Error(`No hay "${nombre}" en ${capa}`)
  return i
}

function armar(piezas: Piezas, cara: Partial<Pick<Avatar, 'ojos' | 'cejas' | 'nariz' | 'boca'>> = {}): Avatar {
  const a: Avatar = { ...AVATAR_BASE, ...cara }
  for (const [capa, nombre] of Object.entries(piezas) as [CapaAvatar, string][]) a[capa] = piezaPorNombre(capa, nombre)
  return a
}

export const PERSONAJES: readonly Personaje[] = [
  {
    id: 'gaucho',
    nombre: 'Ramón',
    titulo: 'el Gaucho',
    lugar: 'Tacuarembó',
    descripcion: 'Domador y payador. Juega callado y canta la flor con la pajita en la boca.',
    saludo: '¿Un amargo antes de empezar?',
    siGana: 'Despacio se llega lejos, y vos venías muy ligero.',
    siPierde: 'Me ganaste, nomás. Tomá un amargo, que te lo ganaste.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara cuadrada',
        pelo: 'Peinado para atrás',
        colorPelo: 'Negro',
        barba: 'Bigote gaucho',
        ropa: 'Poncho',
        sombrero: 'Sombrero de gaucho',
        bufanda: 'Pañuelo rojo',
        enBoca: 'Pajita de pasto',
        accesorio: 'Mate',
      },
      { cejas: 2, ojos: 3, boca: 1 },
    ),
  },
  {
    id: 'surfista',
    nombre: 'Nico',
    titulo: 'el Surfista',
    lugar: 'La Paloma',
    descripcion: 'Sale del agua directo a la mesa. Si hay buenas olas, se va al mazo.',
    saludo: 'Si hay buenas olas, me voy al mazo, eh.',
    siGana: 'Esa la leí desde lejos, como una ola de las buenas.',
    siPierde: 'Me revolcó la ola, hermano. Bien jugado.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara alargada',
        pelo: 'Rulos al viento',
        colorPelo: 'Rubio',
        lentes: 'Lentes de sol',
        ropa: 'Traje de neoprene',
        accesorio: 'Tabla de surf',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'hippie',
    nombre: 'Luna',
    titulo: 'la Hippie',
    lugar: 'Cabo Polonio',
    descripcion: 'Vive sin luz eléctrica y juega a la luz del faro. Paz, amor y retruco.',
    saludo: 'Paz, amor… y retruco.',
    siGana: 'El universo estaba de mi lado. Volvé cuando te alinees.',
    siPierde: 'Lo acepto con paz y amor… y un poquito de bronca.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara redonda',
        pelo: 'Lacio largo',
        colorPelo: 'Castaño claro',
        lentes: 'Lentes redondos',
        pecas: 'Pecas',
        sombrero: 'Vincha hippie',
        ropa: 'Remera teñida',
        bufanda: 'Collar de cuentas',
        accesorio: 'Guitarra criolla',
      },
      { ojos: 5, boca: 2 },
    ),
  },
  {
    id: 'murguista',
    nombre: 'Tito',
    titulo: 'el Murguista',
    lugar: 'Montevideo, en Carnaval',
    descripcion: 'Le canta la retirada al que pierde. Ensaya todo el año en el tablado del barrio.',
    saludo: '¡Atención, atención, que llega la murga!',
    siGana: '¡Y la murga se lleva el primer premio, señores!',
    siPierde: '¡Se nos cayó el telón! Esta retirada te la dedico.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara angulosa',
        pelo: 'Despeinado',
        colorPelo: 'Castaño oscuro',
        sombrero: 'Galera de murga',
        ropa: 'Levita de murga',
      },
      { cejas: 0, boca: 4 },
    ),
  },
  {
    id: 'candombero',
    nombre: 'Beto',
    titulo: 'el Candombero',
    lugar: 'Barrio Sur',
    descripcion: 'Toca el chico en las Llamadas. Golpea la mesa a ritmo de candombe cuando canta truco.',
    saludo: 'Escuchá el tambor: el truco va a ese ritmo.',
    siGana: 'Te faltó tambor. El ritmo lo marco yo.',
    siPierde: 'Me perdiste el ritmo y me ganaste igual. Respeto.',
    avatar: armar(
      {
        piel: 'Piel muy oscura',
        cabeza: 'Cara redonda',
        pelo: 'Motas',
        colorPelo: 'Negro',
        barba: 'Barba corta',
        ropa: 'Camisa floreada',
        accesorio: 'Tambor de candombe',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'pescador',
    nombre: 'Julio',
    titulo: 'el Pescador',
    lugar: 'Punta del Diablo',
    descripcion: 'Sale al mar antes del alba. Tiene paciencia de pescador: espera la mano buena.',
    saludo: 'Paciencia de pescador: espero la mano buena.',
    siGana: 'Picaste, gurí. Como la corvina.',
    siPierde: 'Se me escapó el pique. Hoy pescaste vos.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara cuadrada',
        pelo: 'Corte prolijo',
        colorPelo: 'Canoso',
        barba: 'Barba',
        sombrero: 'Gorro de pescador',
        ropa: 'Impermeable amarillo',
        accesorio: 'Caña de pescar',
        enBoca: 'Pipa',
      },
      { ojos: 2 },
    ),
  },
  {
    id: 'dona',
    nombre: 'Doña Rosa',
    titulo: 'la del almacén',
    lugar: 'El almacén del pueblo',
    descripcion: 'Anota las fiadas en la libreta y los tantos en la cabeza. Nunca se equivoca.',
    saludo: 'Tranquilo, mijo, que yo llevo la cuenta.',
    siGana: 'Ya te anoté en la libreta: me debés una partida.',
    siPierde: 'Anotalo vos, mijo, que a mí me da vergüenza.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara redonda',
        pelo: 'Rodete alto',
        colorPelo: 'Gris',
        lentes: 'Lentes de lectura',
        aros: 'Aro colgante',
        ropa: 'Saco de lana tejido',
        accesorio: 'Mate y termo',
      },
      { cejas: 1, ojos: 5, boca: 2 },
    ),
  },
  {
    id: 'pituco',
    nombre: 'Santi',
    titulo: 'el Pituco',
    lugar: 'Carrasco',
    descripcion: 'Juega en la rambla con el buzo al hombro. Dice "obvio" a todo, hasta al vale cuatro.',
    saludo: 'Obvio que ganamos. Obvio.',
    siGana: 'Obvio que ganamos. Te lo dije.',
    siPierde: 'No, obvio que te dejé ganar. Obvio.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara alargada',
        pelo: 'Raya al costado',
        colorPelo: 'Rubio',
        lentes: 'Lentes de sol',
        ropa: 'Camisa con buzo al hombro',
        accesorio: 'Celular',
      },
      { cejas: 0, boca: 0 },
    ),
  },
  {
    id: 'hincha',
    nombre: 'Cacho',
    titulo: 'el Hincha',
    lugar: 'El Centenario',
    descripcion: 'No se pierde un partido de la Celeste. Entre tiempo y tiempo, un truco y un choripán.',
    saludo: '¡Vamo arriba, que estos no saben nada!',
    siGana: '¡Dale campeón, dale campeón! Perdón, me entusiasmé.',
    siPierde: '¡Nos robaron! Bah… jugaste bien, te la reconozco.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara cuadrada',
        pelo: 'Corte milico',
        colorPelo: 'Castaño',
        barba: 'Barba corta',
        sombrero: 'Gorra',
        ropa: 'Camiseta celeste',
        bufanda: 'Celeste y blanca',
        accesorio: 'Choripán',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'veterano',
    nombre: 'Don Pocho',
    titulo: 'el veterano del boliche',
    lugar: 'El boliche de la esquina',
    descripcion: 'Juega en el mismo boliche desde el 62. Se sabe todas las señas, y algunas que inventó.',
    saludo: 'Juego en el boliche desde el 62. Seguime las señas.',
    siGana: 'Las señas no se aprenden en un día, m\'hijo.',
    siPierde: 'Desde el 62 que nadie me jugaba así. Te felicito.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara angulosa',
        pelo: 'Pelado con estilo',
        colorPelo: 'Canoso',
        barba: 'Bigote',
        sombrero: 'Boina',
        ropa: 'Chaleco de campo',
        accesorio: 'Diario',
        enBoca: 'Escarbadientes',
      },
      { cejas: 3, ojos: 2 },
    ),
  },
  // Los rivales de cada departamento (los demás son de los que ya había: Julio en Rocha, Beto en
  // Durazno, Santi en Maldonado, Tito en Montevideo y Ramón en Tacuarembó).
  {
    id: 'buscadora',
    nombre: 'Marisa',
    titulo: 'la de las piedras',
    lugar: 'Catalán, Artigas',
    descripcion: 'Busca amatistas en las canteras desde chica. Dice que las piedras le avisan cuando el rival miente.',
    saludo: 'Las piedras nunca mienten. Las cartas, a veces.',
    siGana: 'Las piedras no mienten: hoy no era tu día.',
    siPierde: 'Sos una piedra en bruto, pero de las que brillan.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara redonda',
        pelo: 'Melena ondulada',
        colorPelo: 'Negro',
        aros: 'Argollas y arito',
        ropa: 'Camisa de carnaval',
        accesorio: 'Geoda de amatista',
      },
      { ojos: 5, boca: 1 },
    ),
  },
  {
    id: 'bodeguero',
    nombre: 'Aurelio',
    titulo: 'el Bodeguero',
    lugar: 'Las Violetas, Canelones',
    descripcion: 'Hace Tannat como lo hacía su abuelo. Juega despacio, como se toma un buen vino.',
    saludo: '¡Salud! Que gane el mejor… o sea, yo.',
    siGana: 'Este triunfo lo descorcho con un Tannat.',
    siPierde: 'Brindo por vos, que me ganaste limpito.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara cuadrada',
        pelo: 'Pelado con estilo',
        colorPelo: 'Gris',
        barba: 'Bigote',
        sombrero: 'Boina',
        ropa: 'Chaleco bordó',
        accesorio: 'Copa de Tannat',
      },
      { ojos: 3, boca: 2 },
    ),
  },
  {
    id: 'fronterizo',
    nombre: 'Joaquim',
    titulo: 'el Fronterizo',
    lugar: 'Río Branco',
    descripcion: 'Planta arroz de este lado y compra del otro. Canta los tantos en portuñol.',
    saludo: '¡Bora jugar! Digo… ¡vamos!',
    siGana: 'De este lado de la frontera, mando yo.',
    siPierde: '¡Bah, tchê! Me ganaste bien ganado.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara alargada',
        pelo: 'Corte prolijo',
        colorPelo: 'Castaño oscuro',
        barba: 'Barba corta',
        sombrero: 'Sombrero de paja',
        ropa: 'Poncho verde',
        accesorio: 'Bolsa de arroz',
      },
      { boca: 5 },
    ),
  },
  {
    id: 'quesero',
    nombre: 'Giuseppe',
    titulo: 'el Quesero',
    lugar: 'Nueva Helvecia',
    descripcion: 'Nieto de suizos e italianos. Sus quesos maduran meses; sus jugadas, también.',
    saludo: 'Despacito, que lo bueno madura lento.',
    siGana: 'Te faltó estacionar un poco más, como al queso.',
    siPierde: 'Maduraste rápido. Me ganaste.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara redonda',
        pelo: 'Raya al costado',
        colorPelo: 'Colorado',
        barba: 'Bigote',
        ropa: 'Delantal de quesero',
        accesorio: 'Horma de queso',
      },
      { ojos: 6, boca: 4 },
    ),
  },
  {
    id: 'guia',
    nombre: 'Ernesto',
    titulo: 'el Guía',
    lugar: 'Las Grutas del Palacio',
    descripcion: 'Conoce cada piedra de las Grutas. Te explica la geología mientras te gana el envido.',
    saludo: 'Les cuento un dato mientras barajo.',
    siGana: 'Dato del día: el guía conoce el camino.',
    siPierde: 'Dato: me ganaste. Y eso no pasa seguido.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara angulosa',
        pelo: 'Rulos arriba',
        colorPelo: 'Castaño',
        lentes: 'Lentes finos',
        sombrero: 'Gorra',
        ropa: 'Campera de explorador',
        accesorio: 'Linterna',
      },
      { ojos: 6 },
    ),
  },
  {
    id: 'tambera',
    nombre: 'Marta',
    titulo: 'la Tambera',
    lugar: 'Sarandí Grande, Florida',
    descripcion: 'Ordeña a las cinco y a las seis ya está en la mesa. Nadie madruga más que ella.',
    saludo: 'Yo a esta hora ya ordeñé y todo.',
    siGana: 'Madrugá más, que así no se le gana a una tambera.',
    siPierde: 'Me ganaste antes del segundo ordeñe. ¡Qué bárbaro!',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara redonda',
        pelo: 'Cola larga',
        colorPelo: 'Castaño',
        pecas: 'Pecas',
        sombrero: 'Sombrero de paja',
        ropa: 'Camisa a cuadros',
        accesorio: 'Tarro de leche',
      },
      { ojos: 5, boca: 5 },
    ),
  },
  {
    id: 'payador',
    nombre: 'Pedro',
    titulo: 'el Payador',
    lugar: 'Minas',
    descripcion: 'Contesta cada truco con una décima. Entre mano y mano, un alfajor de Minas.',
    saludo: 'Si me cantan truco, contesto con una décima.',
    siGana: 'Y con esta décima te digo: otra vez será, amigo.',
    siPierde: 'Me quedé sin rima, y eso que tengo décimas para todo.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara cuadrada',
        pelo: 'Peinado para atrás',
        colorPelo: 'Canoso',
        barba: 'Bigote gaucho',
        sombrero: 'Sombrero de gaucho',
        bufanda: 'Pañuelo blanco',
        ropa: 'Poncho azul',
        accesorio: 'Alfajor',
      },
      { cejas: 3, boca: 2 },
    ),
  },
  {
    id: 'cervecero',
    nombre: 'Facundo',
    titulo: 'el Cervecero',
    lugar: 'Paysandú',
    descripcion: 'Hace cerveza artesanal frente al río. Si pierde, invita la ronda; casi nunca invita.',
    saludo: 'El que pierde paga la ronda.',
    siGana: 'La ronda la pagás vos, como quedamos.',
    siPierde: 'Perdí, así que pago la ronda. Salud.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara cuadrada',
        pelo: 'Jopo',
        colorPelo: 'Rubio',
        barba: 'Barba',
        ropa: 'Delantal cervecero',
        accesorio: 'Chopp de cerveza',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'sanjavier',
    nombre: 'Iván',
    titulo: 'de San Javier',
    lugar: 'San Javier, Río Negro',
    descripcion: 'Nieto de los colonos rusos. Baila en la Fiesta del Girasol y juega serio, sin sonreír.',
    saludo: 'Juego serio. No me hagan reír.',
    siGana: 'Te dije: juego serio.',
    siPierde: 'Me hiciste reír. Y me ganaste. Las dos cosas.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara alargada',
        pelo: 'Corte taza',
        colorPelo: 'Rubio',
        barba: 'Barba',
        ropa: 'Camisa rusa',
        accesorio: 'Girasol',
      },
      { ojos: 3, boca: 3 },
    ),
  },
  {
    id: 'freeshop',
    nombre: 'Jéssica',
    titulo: 'la del free shop',
    lugar: 'Rivera, en la frontera',
    descripcion: 'Atiende un free shop en la Sarandí. Regatea los puntos como regatea los perfumes.',
    saludo: 'Hoy está todo en oferta, menos los puntos.',
    siGana: 'Hoy los puntos no estaban en oferta.',
    siPierde: 'Te llevaste la partida sin pagar impuestos.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara alargada',
        pelo: 'Ondas sueltas',
        colorPelo: 'Castaño oscuro',
        lentes: 'Lentes de sol',
        aros: 'Aro colgante',
        ropa: 'Amarela de cuello verde',
        accesorio: 'Bolsa del free shop',
      },
      { boca: 5 },
    ),
  },
  {
    id: 'termas',
    nombre: 'Mirta',
    titulo: 'la de las termas',
    lugar: 'Termas del Daymán',
    descripcion: 'Juega en bata, recién salida del agua caliente. Tranquila, hasta que le cantan retruco.',
    saludo: 'Tranquilos, que el agua caliente relaja.',
    siGana: 'Andá a las termas, que te va a hacer bien.',
    siPierde: 'Me ganaste y ni me alteré. Las termas hacen milagros.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara redonda',
        pelo: 'Rodete desarmado',
        colorPelo: 'Colorado',
        lentes: 'Lentes redondos',
        ropa: 'Bata de las termas',
        accesorio: 'Naranja',
      },
      { ojos: 5, boca: 0 },
    ),
  },
  {
    id: 'maragato',
    nombre: 'Cholo',
    titulo: 'el Maragato',
    lugar: 'San José de Mayo',
    descripcion: 'Maragato de ley, de los que no se achican. Golpea la mesa con el rebenque cuando gana.',
    saludo: 'Los maragatos no se achican.',
    siGana: 'Te dije que los maragatos no se achican.',
    siPierde: 'Un maragato no se achica, pero sabe perder.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara angulosa',
        pelo: 'Corte milico',
        colorPelo: 'Negro',
        barba: 'Bigote',
        sombrero: 'Boina',
        bufanda: 'Pañuelo celeste',
        ropa: 'Chaleco maragato',
        accesorio: 'Rebenque',
      },
      { cejas: 2 },
    ),
  },
  {
    id: 'chacarero',
    nombre: 'Hugo',
    titulo: 'el Chacarero',
    lugar: 'Dolores, Soriano',
    descripcion: 'Siembra trigo en las chacras de Dolores. Mira el cielo antes de cantar.',
    saludo: '¿Lloverá? Igual, juguemos.',
    siGana: 'Hoy la cosecha es mía.',
    siPierde: 'Llovió para tu lado. Bien jugado.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara cuadrada',
        pelo: 'Despeinado',
        colorPelo: 'Castaño',
        barba: 'Barba corta',
        sombrero: 'Gorra',
        ropa: 'Camisa a cuadros verde',
        accesorio: 'Espigas de trigo',
        enBoca: 'Pajita de pasto',
      },
      { boca: 1 },
    ),
  },
  {
    id: 'olimar',
    nombre: 'Aníbal',
    titulo: 'el del Olimar',
    lugar: 'Treinta y Tres',
    descripcion: 'Toca el bombo en el Festival del Olimar. Lleva el ritmo del truco con los dedos.',
    saludo: 'Al ritmo del bombo, señores.',
    siGana: 'El Olimar corre para mi lado.',
    siPierde: 'Me ganaste al ritmo del bombo. ¡Chapeau!',
    avatar: armar(
      {
        piel: 'Piel oscura',
        cabeza: 'Cara alargada',
        pelo: 'Peinado para atrás',
        colorPelo: 'Negro',
        barba: 'Bigote gaucho',
        bufanda: 'Pañuelo rojo',
        ropa: 'Chaleco negro',
        accesorio: 'Bombo legüero',
      },
      { ojos: 3 },
    ),
  },
]

/** `n` personajes distintos para sentar de bots: el mismo texto (la sala, la partida) da siempre los mismos. */
export function personajesParaBots(texto: string, n: number): Personaje[] {
  const azar = azarDeTexto(texto)
  const lista = [...PERSONAJES]
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j]!, lista[i]!]
  }
  return lista.slice(0, n)
}
