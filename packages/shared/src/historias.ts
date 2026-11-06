/**
 * Modo historia: los departamentos además de Rocha (que está en historia.ts, fue el primero).
 *
 * Cada uno tiene 3, 4 o 5 niveles según su tamaño, y el formato, la dificultad y los puntos de cada
 * nivel salen de la plantilla de esa cantidad (`PLANTILLAS`): siempre suben. En los niveles del medio
 * se ganan monedas y las dos piezas del personaje (su ropa y lo que tiene en la mano); en el último,
 * la baraja y la mesa del departamento.
 */

import type { Formato } from '@truco/engine'
import type { Nivel } from '@truco/bots'
import { piezaPorNombre } from './personajes'
import { idBaraja, idMesa, idPieza } from './tienda'
import type { CapaAvatar } from './avatar'
import type { IdBaraja } from './barajas'
import type { IdMesa } from './mesas'
import type { HistoriaDepartamento, IdDepartamento, NivelHistoria } from './historia'

/** Una recompensa en monedas: `monedas:<cantidad>`. */
export const idMonedas = (n: number) => `monedas:${n}`

/** Cuántas monedas da una recompensa (0 si no es de monedas). */
export function monedasDeRecompensa(id: string): number {
  const [tipo, n] = id.split(':')
  return tipo === 'monedas' && /^\d+$/.test(n ?? '') ? Number(n) : 0
}

const pieza = (capa: CapaAvatar, nombre: string) => idPieza(capa, piezaPorNombre(capa, nombre))
const ropa = (nombre: string) => pieza('ropa', nombre)
const enLaMano = (nombre: string) => pieza('accesorio', nombre)
/** El premio del último nivel: la baraja y la mesa del departamento. */
const final = (baraja: IdBaraja, mesa: IdMesa) => [idBaraja(baraja), idMesa(mesa)]

type Plantilla = Pick<NivelHistoria, 'formato' | 'nivelBots' | 'puntos'>
const nivel = (formato: Formato, nivelBots: Nivel, puntos: 15 | 30): Plantilla => ({ formato, nivelBots, puntos })

/** Formato, dificultad y puntos de cada nivel, según cuántos tiene el departamento. */
export const PLANTILLAS: Record<3 | 4 | 5, readonly Plantilla[]> = {
  3: [nivel('1v1', 'facil', 15), nivel('2v2', 'medio', 30), nivel('1v1', 'dificil', 30)],
  4: [nivel('1v1', 'facil', 15), nivel('2v2', 'medio', 15), nivel('3v3', 'dificil', 30), nivel('1v1', 'muyDificil', 30)],
  5: [nivel('1v1', 'facil', 15), nivel('2v2', 'medio', 15), nivel('1v1', 'dificil', 30), nivel('3v3', 'muyDificil', 30), nivel('1v1', 'master', 30)],
}

interface Etapa {
  lugar: string
  donde: readonly [number, number]
  resumen: string
  /** Los que juegan con el personaje del departamento (en 2v2 y 3v3). */
  con?: readonly string[]
  /** Tus compañeros (en 2v2 y 3v3). */
  companieros?: readonly string[]
  recompensas: readonly string[]
  frases: readonly [string, string, string]
}

function historia(departamento: IdDepartamento, jefe: string, presentacion: string, etapas: readonly Etapa[]): HistoriaDepartamento {
  const plantilla = PLANTILLAS[etapas.length as 3 | 4 | 5]
  return {
    departamento,
    jefe,
    presentacion,
    niveles: etapas.map((e, i) => ({
      ...plantilla[i]!,
      lugar: e.lugar,
      donde: e.donde,
      resumen: e.resumen,
      rivales: [jefe, ...(e.con ?? [])],
      companieros: e.companieros ?? [],
      recompensas: e.recompensas,
      frases: e.frases,
    })),
  }
}

const ARTIGAS = historia(
  'artigas',
  'buscadora',
  'Amatistas, ágatas y carnaval de frontera. Marisa te espera en las canteras de Catalán, con una geoda en la mano y el mazo en la otra.',
  [
    {
      lugar: 'Las canteras de Catalán',
      donde: [-30.62, -56.3],
      resumen: 'Zona de canteras donde se sacan amatistas y ágatas.',
      recompensas: [idMonedas(100)],
      frases: ['¡Cuidado dónde pisás, que acá cada piedra vale oro!', 'Yo encuentro una amatista con los ojos cerrados.', 'A ver si encontrás algo en tus cartas, que yo ya vi las mías.'],
    },
    {
      lugar: 'El carnaval de Artigas',
      donde: [-30.4, -56.47],
      resumen: 'El carnaval de la ciudad de Artigas, con escolas de samba como del otro lado de la frontera.',
      con: ['candombero'],
      companieros: ['hincha'],
      recompensas: [ropa('Camisa de carnaval')],
      frases: ['¡Llegaste justo para el carnaval!', 'Beto vino a tocar con la escola. Y a jugar, de paso.', 'Acá se canta truco con plumas y lentejuelas.'],
    },
    {
      lugar: 'Piedra Pintada',
      donde: [-30.44, -56.56],
      resumen: 'Gran roca en las afueras de la ciudad de Artigas, símbolo del departamento.',
      recompensas: [idMonedas(150)],
      frases: ['Estas pinturas tienen miles de años. Mis mañas, menos, pero andan igual.', 'Ahora a treinta, y sin ayuda.', 'Las piedras me dicen que tenés poco envido.'],
    },
    {
      lugar: 'El puente de la Concordia',
      donde: [-30.38, -56.44],
      resumen: 'Puente sobre el río Cuareim que une Artigas con Quaraí, en Brasil.',
      con: ['candombero', 'gaucho'],
      companieros: ['hincha', 'dona'],
      recompensas: [enLaMano('Geoda de amatista')],
      frases: ['Del otro lado está Brasil, pero la mesa es nuestra.', 'Me traje a Beto y a Ramón: tres contra tres, como en la frontera.', 'El que pierde cruza el puente a pie.'],
    },
    {
      lugar: 'La mina de amatistas',
      donde: [-30.56, -56.68],
      resumen: 'Las minas de amatista del norte del departamento, bajo tierra.',
      recompensas: final('artigas', 'artigas'),
      frases: ['Acá adentro guardo la piedra más linda del departamento.', 'Si me ganás, te llevás el mazo de Artigas.', 'Pero te aviso: en la oscuridad, yo veo mejor.'],
    },
  ],
)

const CANELONES = historia(
  'canelones',
  'bodeguero',
  'Viñedos, vendimia y Tannat. Don Aurelio te recibe en su bodega de Las Violetas, entre barricas y racimos.',
  [
    {
      lugar: 'Las bodegas de Las Violetas',
      donde: [-34.62, -56.25],
      resumen: 'Zona de viñedos y bodegas familiares del sur de Canelones.',
      recompensas: [ropa('Chaleco bordó')],
      frases: ['Pasá, pasá, que el Tannat no se toma solo.', 'Mi abuelo plantó estas vides. Y me enseñó a jugar.', 'Una partidita corta, para abrir el apetito.'],
    },
    {
      lugar: 'La Fiesta de la Vendimia',
      donde: [-34.52, -56.28],
      resumen: 'La fiesta de la cosecha de la uva.',
      con: ['dona'],
      companieros: ['veterano'],
      recompensas: [enLaMano('Copa de Tannat')],
      frases: ['¡Es la Fiesta de la Vendimia!', 'Doña Rosa vino a pisar uvas y se quedó a jugar.', 'Ojo, que entre los dos sabemos más mañas que años.'],
    },
    {
      lugar: 'Atlántida, frente al Águila',
      donde: [-34.77, -55.76],
      resumen: 'Balneario de la Costa de Oro, con El Águila, una casona con forma de cabeza de águila sobre la playa.',
      recompensas: final('canelones', 'canelones'),
      frases: ['Vine a la costa a descansar, pero el truco no descansa.', 'El que gana se lleva el mazo de Canelones.', 'Brindemos antes: después, uno de los dos va a estar triste.'],
    },
  ],
)

const CERRO_LARGO = historia(
  'cerro-largo',
  'fronterizo',
  'Arrozales, frontera y mate. Joaquim te espera en Río Branco, con un pie en cada país.',
  [
    {
      lugar: 'Río Branco',
      donde: [-32.6, -53.39],
      resumen: 'Ciudad de frontera frente a Yaguarón, en Brasil.',
      recompensas: [idMonedas(100)],
      frases: ['¡Bom dia! Digo… ¡buen día!', 'Acá hablamos los dos idiomas, y el truco también.', 'Sentate, que el mate ya está cebado.'],
    },
    {
      lugar: 'El puente Mauá',
      donde: [-32.57, -53.36],
      resumen: 'Puente internacional de 1930 sobre el río Yaguarón.',
      con: ['freeshop'],
      companieros: ['hincha'],
      recompensas: [ropa('Poncho verde')],
      frases: ['Este puente tiene más de cien años, y nunca vio un truco como este.', 'Jéssica vino de Rivera, a cruzar cartas.', 'Si perdés, pagás en reales.'],
    },
    {
      lugar: 'Los arrozales de Melo',
      donde: [-32.37, -54.18],
      resumen: 'Campos de arroz cerca de Melo, la capital del departamento.',
      recompensas: [idMonedas(150)],
      frases: ['El arroz necesita agua y paciencia. El truco, también.', 'Ahora a treinta, mano a mano.', 'No te me empantanes en la primera.'],
    },
    {
      lugar: 'Paso Centurión',
      donde: [-32.13, -53.75],
      resumen: 'Monte y sierras en la frontera: un área protegida.',
      con: ['freeshop', 'gaucho'],
      companieros: ['veterano', 'dona'],
      recompensas: [enLaMano('Bolsa de arroz')],
      frases: ['Acá el monte es tan cerrado que no entra ni la señal.', 'Tres contra tres, con Jéssica y Ramón.', 'Las señas, que se vean bien: acá no hay luz.'],
    },
    {
      lugar: 'La Laguna Merín',
      donde: [-32.8, -53.5],
      resumen: 'Gran laguna compartida con Brasil, con playas de agua dulce.',
      recompensas: final('cerro-largo', 'cerro-largo'),
      frases: ['Esta laguna la compartimos con Brasil. El mazo, no.', 'Si me ganás, el de Cerro Largo es tuyo.', 'Pero acá el viento sopla a mi favor.'],
    },
  ],
)

const COLONIA = historia(
  'colonia',
  'quesero',
  'Calles de piedra, faro y quesos de colonos. Giuseppe te espera en Nueva Helvecia, entre hormas que maduran.',
  [
    {
      lugar: 'Nueva Helvecia',
      donde: [-34.3, -57.23],
      resumen: 'Colonia fundada por inmigrantes suizos en 1862, famosa por sus quesos.',
      recompensas: [idMonedas(100)],
      frases: ['Benvenuto! Bueno, también se dice "willkommen".', 'Este queso tiene seis meses. Mi paciencia, más.', 'Juguemos tranquilo: lo bueno se hace despacio.'],
    },
    {
      lugar: 'La Calle de los Suspiros',
      donde: [-34.474, -57.848],
      resumen: 'Calle empedrada del Barrio Histórico de Colonia del Sacramento.',
      con: ['pituco'],
      companieros: ['hincha'],
      recompensas: [ropa('Delantal de quesero')],
      frases: ['Santi vino a pasar el finde a Colonia.', 'Él trae el buzo al hombro; yo, el queso.', 'Los suspiros van a ser tuyos, cuando te cante el retruco.'],
    },
    {
      lugar: 'El faro de Colonia',
      donde: [-34.471, -57.856],
      resumen: 'El faro del Barrio Histórico, levantado sobre las ruinas de un convento.',
      con: ['pituco', 'hippie'],
      companieros: ['dona', 'veterano'],
      recompensas: [enLaMano('Horma de queso')],
      frases: ['Desde el faro se ve Buenos Aires.', 'Luna vino a sacarle fotos al atardecer.', 'Tres contra tres: que se vea desde la otra orilla.'],
    },
    {
      lugar: 'El Real de San Carlos',
      donde: [-34.44, -57.84],
      resumen: 'Plaza de toros de principios del siglo XX, hoy cerrada.',
      recompensas: final('colonial', 'colonia'),
      frases: ['En esta plaza de toros hace un siglo que no torean.', 'Hoy el toro sos vos.', 'Si me ganás, te llevás el mazo Colonial.'],
    },
  ],
)

const DURAZNO = historia(
  'durazno',
  'candombero',
  'El río Yí, el festival y el candombe de tierra adentro. Beto vino desde Barrio Sur a tocar, y se quedó a jugar.',
  [
    {
      lugar: 'La rambla del Yí',
      donde: [-33.38, -56.52],
      resumen: 'La rambla de la ciudad de Durazno, a orillas del río Yí.',
      recompensas: [idMonedas(100)],
      frases: ['¡Bienvenido al corazón del Uruguay!', 'Me vine a tocar al Festival y me quedé.', 'Escuchá el tambor: el truco va a ese ritmo.'],
    },
    {
      lugar: 'El Festival del Durazno',
      donde: [-33.395, -56.495],
      resumen: 'Un festival de música a orillas del Yí.',
      con: ['murguista'],
      companieros: ['hincha'],
      recompensas: [ropa('Camisa floreada')],
      frases: ['Tito vino con la murga a cerrar el escenario.', 'Nosotros tocamos y ustedes bailan.', 'Y si pierden, les cantamos la retirada.'],
    },
    {
      lugar: 'El Parque de la Hispanidad',
      donde: [-33.37, -56.545],
      resumen: 'Gran parque a orillas del río Yí, en la ciudad de Durazno.',
      recompensas: [idMonedas(150)],
      frases: ['Este parque es enorme. Mi juego, también.', 'Ahora a treinta, sin murga que te salve.', 'Tres golpes de tambor y te canto el truco.'],
    },
    {
      lugar: 'Sarandí del Yí',
      donde: [-33.35, -55.63],
      resumen: 'Pueblo a orillas del río Yí, en el este del departamento.',
      con: ['murguista', 'gaucho'],
      companieros: ['dona', 'veterano'],
      recompensas: [enLaMano('Tambor de candombe')],
      frases: ['Ramón bajó del campo a sumarse.', 'Candombe, murga y gaucho: tres contra tres.', 'Acá se juega hasta que salga el sol.'],
    },
    {
      lugar: 'El puente del Yí, de noche',
      donde: [-33.365, -56.51],
      resumen: 'El puente sobre el río Yí, en la ciudad de Durazno.',
      recompensas: final('durazno', 'durazno'),
      frases: ['De noche, el río suena como un tambor.', 'Si me ganás, el mazo de Durazno es tuyo.', 'Pero ojo, que esta es mi llamada.'],
    },
  ],
)

const FLORES = historia(
  'flores',
  'guia',
  'Las Grutas del Palacio, campos y piedra. Ernesto te espera en Trinidad, con la linterna lista para bajar.',
  [
    {
      lugar: 'Trinidad',
      donde: [-33.52, -56.9],
      resumen: 'Trinidad, la capital de Flores: ciudad de campo.',
      recompensas: [ropa('Campera de explorador')],
      frases: ['¡Hola! ¿Venís para la excursión?', 'Primero una partida, después te muestro las Grutas.', 'Y no te preocupes: siempre traigo linterna.'],
    },
    {
      lugar: 'Las Grutas del Palacio',
      donde: [-33.27, -57.13],
      resumen: 'Cavidades de arenisca con columnas, en un geoparque de la UNESCO.',
      con: ['maragato'],
      companieros: ['hincha'],
      recompensas: [enLaMano('Linterna')],
      frases: ['Estas columnas tienen millones de años.', 'Cholo vino de San José a verlas, y a jugar.', 'Acá adentro el eco repite cada truco tres veces.'],
    },
    {
      lugar: 'Andresito',
      donde: [-33.1, -57.1],
      resumen: 'Pueblo a orillas del río Negro, en el norte del departamento.',
      recompensas: final('flores', 'flores'),
      frases: ['El último tramo de la excursión.', 'Si me ganás, te llevás el mazo de Flores.', 'Pero conozco este terreno como la palma de mi mano.'],
    },
  ],
)

const FLORIDA = historia(
  'florida',
  'tambera',
  'Tambos, la Piedra Alta y la memoria de la independencia. Marta te espera en Sarandí Grande, después del ordeñe.',
  [
    {
      lugar: 'El tambo de Sarandí Grande',
      donde: [-33.73, -56.33],
      resumen: 'Pueblo de tambos y lechería en el centro del país.',
      recompensas: [idMonedas(100)],
      frases: ['¡Llegaste tarde! Yo ya ordeñé a las cinco.', 'Una partida y vuelvo a las vacas.', 'Acá se madruga, y se gana temprano.'],
    },
    {
      lugar: 'La Piedra Alta',
      donde: [-34.1, -56.21],
      resumen: 'Donde en 1825 se declaró la independencia, en la ciudad de Florida.',
      con: ['maragato'],
      companieros: ['veterano'],
      recompensas: [ropa('Camisa a cuadros')],
      frases: ['En esta piedra se juró la independencia.', 'Cholo dice que hoy se jura otra cosa: que te ganamos.', 'Dos contra dos, como manda la historia.'],
    },
    {
      lugar: 'Cerro Colorado',
      donde: [-33.87, -55.55],
      resumen: 'Pueblo del este de Florida, entre cerros y campo.',
      recompensas: [idMonedas(150)],
      frases: ['Desde acá arriba se ven todos los tambos.', 'Ahora a treinta, sin compañero.', 'La leche se corta; mi racha, no.'],
    },
    {
      lugar: 'El paso del Santa Lucía',
      donde: [-34.18, -55.95],
      resumen: 'El río Santa Lucía, en el sur del departamento.',
      con: ['maragato', 'payador'],
      companieros: ['hincha', 'dona'],
      recompensas: [enLaMano('Tarro de leche')],
      frases: ['Vino Pedro desde Minas, con la guitarra.', 'Tres contra tres a orillas del río.', 'El que pierde cruza a nado.'],
    },
    {
      lugar: 'La Plaza Asamblea',
      donde: [-34.097, -56.215],
      resumen: 'La plaza principal de Florida, que recuerda a la Asamblea de 1825.',
      recompensas: final('florida', 'florida'),
      frases: ['La última, en el lugar más importante de Florida.', 'Si me ganás, el mazo de Florida es tuyo.', 'Pero acá se viene a ganar, no a participar.'],
    },
  ],
)

const LAVALLEJA = historia(
  'lavalleja',
  'payador',
  'Sierras, cascadas y alfajores de Minas. Pedro te espera en la plaza, con la guitarra y una décima para cada mano.',
  [
    {
      lugar: 'La plaza de Minas',
      donde: [-34.375, -55.237],
      resumen: 'La plaza principal de Minas, la capital, rodeada de sierras.',
      recompensas: [idMonedas(100)],
      frases: ['Buenas tardes, forastero, bienvenido a la sierra…', '…acá se juega al truco y se paga con alfajores.', 'Bueno, la rima no me salió. La partida sí me va a salir.'],
    },
    {
      lugar: 'El Salto del Penitente',
      donde: [-34.37, -55.03],
      resumen: 'Cascada de unos 60 metros entre las sierras.',
      con: ['gaucho'],
      companieros: ['hincha'],
      recompensas: [ropa('Poncho azul')],
      frases: ['Escuchá la cascada: sesenta metros de agua cayendo.', 'Ramón y yo payamos juntos desde hace años.', 'Si nos ganan, les dedico una décima.'],
    },
    {
      lugar: 'El Cerro Arequita',
      donde: [-34.28, -55.26],
      resumen: 'Cerro con grutas y vista a las sierras, al norte de Minas.',
      recompensas: [idMonedas(150)],
      frases: ['Estas cuevas guardan secretos. Mis cartas, también.', 'A treinta, mano a mano, como en una payada.', 'Vos cantás, yo te contesto.'],
    },
    {
      lugar: 'Villa Serrana',
      donde: [-34.31, -54.98],
      resumen: 'Pueblo entre sierras, con casas de piedra y techos de paja.',
      con: ['gaucho', 'hippie'],
      companieros: ['dona', 'veterano'],
      recompensas: [enLaMano('Alfajor')],
      frases: ['Luna se vino a vivir a la sierra.', 'Ramón, Luna y yo: tres contra tres.', 'Acá arriba el aire es puro, y el truco también.'],
    },
    {
      lugar: 'El Cerro del Verdún',
      donde: [-34.39, -55.31],
      resumen: 'Cerro con un santuario a la Virgen, a la entrada de Minas.',
      recompensas: final('lavalleja', 'lavalleja'),
      frases: ['En la cima del Verdún te espera la última payada.', 'Si me ganás, te llevás el mazo de Lavalleja.', 'Y si no, te la canto en décimas.'],
    },
  ],
)

const MALDONADO = historia(
  'maldonado',
  'pituco',
  'Playas, faros y temporada. Santi cambió Carrasco por la península: te espera en La Barra, con el buzo al hombro.',
  [
    {
      lugar: 'La Barra',
      donde: [-34.91, -54.87],
      resumen: 'Balneario sobre el arroyo Maldonado, con su puente ondulado.',
      recompensas: [pieza('ropa', 'Camisa con buzo al hombro')],
      frases: ['¡Obvio que viniste! Todo el mundo viene en temporada.', 'Una partida antes del atardecer.', 'Obvio que te gano, pero no te lo tomes a mal.'],
    },
    {
      lugar: 'Los dedos de la Brava',
      donde: [-34.955, -54.94],
      resumen: 'La escultura de una mano que sale de la arena, en Punta del Este.',
      con: ['surfista'],
      companieros: ['hincha'],
      recompensas: [enLaMano('Celular')],
      frases: ['Sacate una foto con los dedos, obvio.', 'Nico vino surfeando desde La Paloma.', 'Dos contra dos, y después a la playa.'],
    },
    {
      lugar: 'El faro de José Ignacio',
      donde: [-34.84, -54.63],
      resumen: 'El faro en la punta de José Ignacio, sobre el mar.',
      recompensas: final('maldonado', 'maldonado'),
      frases: ['José Ignacio es lo más, obvio.', 'Si me ganás, el mazo de Maldonado es tuyo.', 'Pero ni en sueños me ganás. Obvio.'],
    },
  ],
)

const MONTEVIDEO = historia(
  'montevideo',
  'murguista',
  'Candombe, tango y murga. Tito te espera en el tablado del barrio, maquillado y con la galera puesta.',
  [
    {
      lugar: 'El tablado del barrio',
      donde: [-34.89, -56.17],
      resumen: 'Escenario de barrio donde actúan las murgas en Carnaval.',
      recompensas: [pieza('sombrero', 'Galera de murga')],
      frases: ['¡Atención, atención, que llegó el visitante!', 'Este año la murga canta sobre el truco.', 'Y vos sos el protagonista del cuplé.'],
    },
    {
      lugar: 'Las Llamadas en Barrio Sur',
      donde: [-34.912, -56.19],
      resumen: 'El desfile de comparsas de candombe por Barrio Sur y Palermo.',
      con: ['candombero'],
      companieros: ['hincha'],
      recompensas: [ropa('Levita de murga')],
      frases: ['Beto viene tocando desde Isla de Flores.', 'Murga y candombe contra ustedes.', 'Al ritmo del chico, el repique y el piano.'],
    },
    {
      lugar: 'El Palacio Salvo',
      donde: [-34.906, -56.199],
      resumen: 'Edificio de 1928 en la Plaza Independencia; fue el más alto de Sudamérica.',
      recompensas: final('grabado', 'montevideo'),
      frases: ['Desde acá arriba se ve todo Montevideo.', 'La última: si me ganás, te llevás el mazo Grabado Nocturno.', 'Y si no, te canto la retirada.'],
    },
  ],
)

const PAYSANDU = historia(
  'paysandu',
  'cervecero',
  'El río Uruguay, la Meseta de Artigas y cerveza artesanal. Facundo te espera en la costanera, con un chopp recién tirado.',
  [
    {
      lugar: 'La costanera de Paysandú',
      donde: [-32.32, -58.09],
      resumen: 'La costanera de Paysandú, sobre el río Uruguay.',
      recompensas: [idMonedas(100)],
      frases: ['¡Bienvenido a la heroica Paysandú!', 'Esta cerveza la hice yo. El truco me lo enseñó mi viejo.', 'Una partida, y el que pierde lava los vasos.'],
    },
    {
      lugar: 'La Semana de la Cerveza',
      donde: [-32.305, -58.075],
      resumen: 'Fiesta que se hace en Paysandú cada Semana de Turismo.',
      con: ['hincha'],
      companieros: ['veterano'],
      recompensas: [ropa('Delantal cervecero')],
      frases: ['¡Es la Semana de la Cerveza!', 'Cacho vino a ver los recitales, y se quedó a jugar.', 'Dos contra dos entre tanque y tanque.'],
    },
    {
      lugar: 'La Meseta de Artigas',
      donde: [-32.06, -58.01],
      resumen: 'Donde Artigas tuvo su campamento en 1815, sobre el río Uruguay.',
      recompensas: [idMonedas(150)],
      frases: ['Acá acampó Artigas. Acá acampo yo con el mazo.', 'Ahora a treinta, solos vos y yo.', 'Desde la meseta se ve todo el río, y todas tus mañas.'],
    },
    {
      lugar: 'Las termas de Guaviyú',
      donde: [-31.84, -57.88],
      resumen: 'Termas de agua caliente en el norte del departamento.',
      con: ['termas', 'hincha'],
      companieros: ['veterano', 'dona'],
      recompensas: [enLaMano('Chopp de cerveza')],
      frases: ['Mirta vino desde el Daymán a probar estas aguas.', 'Tres contra tres, con los pies en el agua caliente.', 'Si se acalora la cosa, nos metemos en la pileta.'],
    },
    {
      lugar: 'El puente General Artigas',
      donde: [-32.29, -58.13],
      resumen: 'Puente internacional entre Paysandú y Colón, en Argentina.',
      recompensas: final('paysandu', 'paysandu'),
      frases: ['La última partida, con el puente de testigo.', 'Si me ganás, te llevás el mazo de Paysandú.', 'Y la ronda la pago yo. Si perdés vos, también.'],
    },
  ],
)

const RIO_NEGRO = historia(
  'rio-negro',
  'sanjavier',
  'El Anglo de Fray Bentos, ríos y la colonia rusa de San Javier. Iván te espera entre girasoles.',
  [
    {
      lugar: 'San Javier',
      donde: [-32.66, -58.13],
      resumen: 'Pueblo fundado por inmigrantes rusos en 1913.',
      recompensas: [idMonedas(100)],
      frases: ['Dobro pozhalovat. Quiere decir bienvenido.', 'Mis abuelos llegaron acá hace más de cien años.', 'Trajeron semillas de girasol. Y un mazo de cartas.'],
    },
    {
      lugar: 'Las Cañas',
      donde: [-33.17, -58.37],
      resumen: 'Balneario sobre el río Uruguay, cerca de Fray Bentos.',
      con: ['surfista'],
      companieros: ['hincha'],
      recompensas: [ropa('Camisa rusa')],
      frases: ['Nico vino a ver si hay olas en el río.', 'No hay. Pero hay truco.', 'Dos contra dos, en la arena.'],
    },
    {
      lugar: 'El Anglo de Fray Bentos',
      donde: [-33.12, -58.3],
      resumen: 'Antiguo frigorífico, Patrimonio de la Humanidad de la UNESCO.',
      con: ['cervecero', 'veterano'],
      companieros: ['hincha', 'dona'],
      recompensas: [enLaMano('Girasol')],
      frases: ['Esta fábrica le daba de comer al mundo.', 'Facundo y Don Pocho vinieron a la recorrida.', 'Tres contra tres entre las máquinas viejas.'],
    },
    {
      lugar: 'Los Esteros de Farrapos',
      donde: [-32.8, -58.1],
      resumen: 'Humedales e islas del río Uruguay: un parque nacional.',
      recompensas: final('rio-negro', 'rio-negro'),
      frases: ['Los esteros son tranquilos. Yo no.', 'Si me ganás, el mazo de Río Negro es tuyo.', 'Pero acá no se ríe nadie hasta el final.'],
    },
  ],
)

const RIVERA = historia(
  'rivera',
  'freeshop',
  'Frontera, free shops y quebradas. Jéssica te espera en la Sarandí, entre perfumes y bolsas.',
  [
    {
      lugar: 'Los free shops de la Sarandí',
      donde: [-30.905, -55.545],
      resumen: 'La avenida de los free shops, en el centro de Rivera.',
      recompensas: [idMonedas(100)],
      frases: ['¡Oi! ¿Vino a comprar o a jugar?', 'Hoy tengo los perfumes en oferta y las cartas también.', 'Dale, que te hago precio.'],
    },
    {
      lugar: 'El Parque Internacional',
      donde: [-30.895, -55.53],
      resumen: 'Parque compartido por Rivera y Santana do Livramento, en Brasil.',
      con: ['fronterizo'],
      companieros: ['hincha'],
      recompensas: [ropa('Amarela de cuello verde')],
      frases: ['De este lado Rivera, del otro Santana.', 'Joaquim vino de Río Branco, otra ciudad de frontera.', 'Acá jugamos con un pie en cada país.'],
    },
    {
      lugar: 'El Cerro del Marco',
      donde: [-30.88, -55.515],
      resumen: 'Cerro sobre el límite con Brasil, con vista a las dos ciudades.',
      con: ['fronterizo', 'pituco'],
      companieros: ['dona', 'veterano'],
      recompensas: [enLaMano('Bolsa del free shop')],
      frases: ['Santi vino a comprar perfumes, obvio.', 'Tres contra tres arriba del cerro.', 'Desde acá se ven los dos países.'],
    },
    {
      lugar: 'El Valle del Lunarejo',
      donde: [-31.13, -55.9],
      resumen: 'Valle de quebradas y monte nativo: un área protegida.',
      recompensas: final('rivera', 'rivera'),
      frases: ['Este valle es lo más lindo de Rivera.', 'Si me ganás, te llevás el mazo de Rivera. Sin descuento.', 'Pero acá no te hago precio.'],
    },
  ],
)

const SALTO = historia(
  'salto',
  'termas',
  'Naranjas, termas y el río Uruguay. Mirta te espera en el Daymán, recién salida del agua caliente.',
  [
    {
      lugar: 'Las Termas del Daymán',
      donde: [-31.45, -57.92],
      resumen: 'Termas de agua caliente a pocos kilómetros de la ciudad de Salto.',
      recompensas: [idMonedas(100)],
      frases: ['¡Ay, qué agüita! Sentate que te hago lugar.', 'Acá se juega en bata y con los pies arrugados.', 'Tranquilo, que el agua caliente relaja. A vos, no a mí.'],
    },
    {
      lugar: 'Los naranjales',
      donde: [-31.35, -57.85],
      resumen: 'Plantaciones de cítricos alrededor de Salto.',
      con: ['chacarero'],
      companieros: ['hincha'],
      recompensas: [ropa('Bata de las termas')],
      frases: ['Es época de cosecha de naranjas.', 'Hugo vino de Soriano a dar una mano.', 'Dos contra dos entre los árboles.'],
    },
    {
      lugar: 'El puerto de Salto',
      donde: [-31.385, -57.975],
      resumen: 'Puerto sobre el río Uruguay, frente a Concordia, en Argentina.',
      recompensas: [idMonedas(150)],
      frases: ['De acá salen las lanchas a Concordia.', 'Ahora a treinta, sin ayuda de nadie.', 'Si perdés, te vas a nado a Argentina.'],
    },
    {
      lugar: 'La represa de Salto Grande',
      donde: [-31.27, -57.94],
      resumen: 'Represa sobre el río Uruguay, compartida con Argentina.',
      con: ['chacarero', 'cervecero'],
      companieros: ['hincha', 'veterano'],
      recompensas: [enLaMano('Naranja')],
      frases: ['Esta represa le da luz a medio país.', 'Hugo y Facundo, conmigo: tres contra tres.', 'A ver si te queda energía.'],
    },
    {
      lugar: 'El Teatro Larrañaga',
      donde: [-31.39, -57.96],
      resumen: 'Teatro de 1882 en el centro de Salto.',
      recompensas: final('salto', 'salto'),
      frases: ['La última, en el teatro más lindo del litoral.', 'Si me ganás, el mazo de Salto es tuyo.', 'Que se abra el telón.'],
    },
  ],
)

const SAN_JOSE = historia(
  'san-jose',
  'maragato',
  'Tierra maragata, tambos y sierras. Cholo te espera en la plaza de San José de Mayo, rebenque en mano.',
  [
    {
      lugar: 'La plaza de San José de Mayo',
      donde: [-34.34, -56.71],
      resumen: 'La plaza principal de San José de Mayo, con su catedral.',
      recompensas: [ropa('Chaleco maragato')],
      frases: ['¿Vos sos el de la capital? Acá somos maragatos.', 'Y los maragatos no se achican.', 'Sentate, que te enseño cómo se juega acá.'],
    },
    {
      lugar: 'Las Sierras de Mahoma',
      donde: [-34.08, -56.95],
      resumen: 'Sierras de piedra con formas curiosas, en el centro del departamento.',
      con: ['tambera'],
      companieros: ['veterano'],
      recompensas: [enLaMano('Rebenque')],
      frases: ['Marta vino de Florida, que es al lado.', 'Entre las piedras de Mahoma, dos contra dos.', 'Acá arriba no te escucha nadie gritar falta envido.'],
    },
    {
      lugar: 'Kiyú',
      donde: [-34.68, -56.73],
      resumen: 'Balneario de barrancas sobre el Río de la Plata.',
      recompensas: final('san-jose', 'san-jose'),
      frases: ['Las barrancas de Kiyú, la última parada.', 'Si me ganás, te llevás el mazo de San José.', 'Pero un maragato nunca pierde dos veces.'],
    },
  ],
)

const SORIANO = historia(
  'soriano',
  'chacarero',
  'Chacras, ríos y la historia de Villa Soriano. Hugo te espera en Dolores, entre el trigo.',
  [
    {
      lugar: 'La chacra de Dolores',
      donde: [-33.53, -58.21],
      resumen: 'Dolores, ciudad de la zona agrícola del litoral.',
      recompensas: [idMonedas(100)],
      frases: ['Buen día. ¿Lloverá hoy? Mejor juguemos bajo techo.', 'Acá todo depende del clima. El truco, de la suerte.', 'Y yo de suerte ando bien.'],
    },
    {
      lugar: 'La rambla de Mercedes',
      donde: [-33.25, -58.03],
      resumen: 'La rambla de Mercedes, la capital, sobre el río Negro.',
      con: ['sanjavier'],
      companieros: ['hincha'],
      recompensas: [ropa('Camisa a cuadros verde')],
      frases: ['Iván vino de San Javier, río abajo.', 'Dos contra dos frente al río Negro.', 'Él no se ríe nunca, yo tampoco cuando juego.'],
    },
    {
      lugar: 'Villa Soriano',
      donde: [-33.4, -58.32],
      resumen: 'Uno de los pueblos más antiguos del país, sobre el río Negro.',
      con: ['sanjavier', 'veterano'],
      companieros: ['hincha', 'dona'],
      recompensas: [enLaMano('Espigas de trigo')],
      frases: ['Este es el pueblo más viejo del Uruguay.', 'Don Pocho dice que juega acá desde la fundación.', 'Tres contra tres, con historia.'],
    },
    {
      lugar: 'La isla del Vizcaíno',
      donde: [-33.42, -58.39],
      resumen: 'Isla en la desembocadura del río Negro.',
      recompensas: final('soriano', 'soriano'),
      frases: ['Cruzamos a la isla para la última.', 'Si me ganás, el mazo de Soriano es tuyo.', 'Y si no, te quedás cosechando conmigo.'],
    },
  ],
)

const TACUAREMBO = historia(
  'tacuarembo',
  'gaucho',
  'Tradición gaucha, caballos y guitarra. Ramón te espera en el Valle Edén, con el mate y la pajita en la boca.',
  [
    {
      lugar: 'El Valle Edén',
      donde: [-31.83, -56.15],
      resumen: 'Valle de sierras y monte, a pocos kilómetros de Tacuarembó.',
      recompensas: [idMonedas(100)],
      frases: ['Buenas. Desensille, que hay mate.', 'Acá se juega callado, como en el campo.', 'El que habla mucho, pierde.'],
    },
    {
      lugar: 'La Patria Gaucha',
      donde: [-31.72, -55.98],
      resumen: 'Fiesta de la tradición gaucha que se hace en Tacuarembó cada marzo.',
      con: ['payador'],
      companieros: ['hincha'],
      recompensas: [ropa('Poncho')],
      frases: ['Es la fiesta de la Patria Gaucha.', 'Pedro vino de Minas a payar.', 'Dos contra dos, entre jineteadas.'],
    },
    {
      lugar: 'La Gruta de los Cuervos',
      donde: [-31.65, -56.03],
      resumen: 'Gruta en las afueras de la ciudad de Tacuarembó.',
      recompensas: [idMonedas(150)],
      frases: ['En esta gruta no entra el sol.', 'A treinta, sin compañero.', 'Que los cuervos sean testigos.'],
    },
    {
      lugar: 'San Gregorio de Polanco',
      donde: [-32.61, -55.83],
      resumen: 'Pueblo con murales en sus paredes, a orillas del lago de Rincón del Bonete.',
      con: ['payador', 'fronterizo'],
      companieros: ['veterano', 'dona'],
      recompensas: [pieza('sombrero', 'Sombrero de gaucho')],
      frases: ['El pueblo de los murales, a orillas del lago.', 'Pedro y Joaquim, conmigo: tres contra tres.', 'Afilen las señas.'],
    },
    {
      lugar: 'La estancia, al caer el sol',
      donde: [-32.0, -56.25],
      resumen: 'Una estancia en el campo de Tacuarembó.',
      recompensas: final('oriental', 'tacuarembo'),
      frases: ['Ya se pone el sol. Es la hora del truco.', 'Si me ganás, te llevás el mazo Oriental.', 'Pero en mi rancho, mando yo.'],
    },
  ],
)

const TREINTA_Y_TRES = historia(
  'treinta-y-tres',
  'olimar',
  'El río Olimar, arrozales y la Quebrada de los Cuervos. Aníbal te espera en la orilla, con el bombo.',
  [
    {
      lugar: 'La orilla del Olimar',
      donde: [-33.24, -54.38],
      resumen: 'El río Olimar, que pasa por la ciudad de Treinta y Tres.',
      recompensas: [idMonedas(100)],
      frases: ['¿Escuchás el río? Suena a canción.', 'Acá todos cantamos "Orientales, el Olimar…".', 'Una partida y te toco una.'],
    },
    {
      lugar: 'Los arrozales de Vergara',
      donde: [-32.94, -53.94],
      resumen: 'Vergara, pueblo arrocero del noreste del departamento.',
      con: ['fronterizo'],
      companieros: ['hincha'],
      recompensas: [ropa('Chaleco negro')],
      frases: ['Joaquim vino a ver cómo se planta arroz de este lado.', 'Dos contra dos entre las chacras.', 'El barro se te va a pegar en las cartas.'],
    },
    {
      lugar: 'El Festival del Olimar',
      donde: [-33.225, -54.395],
      resumen: 'Festival de música folclórica en Treinta y Tres.',
      con: ['payador', 'gaucho'],
      companieros: ['hincha', 'dona'],
      recompensas: [enLaMano('Bombo legüero')],
      frases: ['¡Es el Festival del Olimar!', 'Pedro y Ramón suben al escenario conmigo.', 'Tres contra tres al ritmo del bombo.'],
    },
    {
      lugar: 'La Quebrada de los Cuervos',
      donde: [-32.92, -54.46],
      resumen: 'Cañada profunda entre sierras: la primera área protegida del país.',
      recompensas: final('treinta-y-tres', 'treinta-y-tres'),
      frases: ['La quebrada es profunda. Tu derrota, también.', 'Si me ganás, el mazo de Treinta y Tres es tuyo.', 'Que los cuervos decidan.'],
    },
  ],
)

/** Los departamentos que siguieron a Rocha. */
export const HISTORIAS_DEPARTAMENTOS: Partial<Record<IdDepartamento, HistoriaDepartamento>> = {
  artigas: ARTIGAS,
  canelones: CANELONES,
  'cerro-largo': CERRO_LARGO,
  colonia: COLONIA,
  durazno: DURAZNO,
  flores: FLORES,
  florida: FLORIDA,
  lavalleja: LAVALLEJA,
  maldonado: MALDONADO,
  montevideo: MONTEVIDEO,
  paysandu: PAYSANDU,
  'rio-negro': RIO_NEGRO,
  rivera: RIVERA,
  salto: SALTO,
  'san-jose': SAN_JOSE,
  soriano: SORIANO,
  tacuarembo: TACUAREMBO,
  'treinta-y-tres': TREINTA_Y_TRES,
}
