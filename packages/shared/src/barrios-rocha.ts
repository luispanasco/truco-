/**
 * Rocha por barrios: seis localidades de la costa, de sur a norte, cada una con su personaje y sus
 * niveles en lugares puntuales (el relevamiento, con las fuentes de cada dato, está en
 * `apps/web/public/departamentos/rocha/relevamiento.md`).
 *
 * Los barrios se abren de a uno. La dificultad va en serrucho: cada barrio sube de nivel en nivel y
 * el siguiente arranca un poco más abajo de donde terminó el anterior (La Paloma de fácil a
 * difícil, La Pedrera de medio a muy difícil, Cabo Polonio de difícil a master y los demás de muy
 * difícil a master). En los niveles del medio se ganan monedas y piezas del avatar; cada barrio
 * se juega en su mesa y la da al completarlo; el último da además la baraja y la mesa de Rocha (la
 * de toda la costa).
 */

import type { Formato, LARGOS_PARTIDA } from '@truco/engine'
import type { Nivel } from '@truco/bots'
import type { CapaAvatar } from './avatar'
import type { Barrio, HistoriaDepartamento, NivelHistoria } from './historia'
import { dificultadesDelBarrio, idMonedas } from './historias'
import { piezaPorNombre } from './personajes'
import { idBaraja, idMesa, idPieza } from './tienda'

const pieza = (capa: CapaAvatar, nombre: string) => idPieza(capa, piezaPorNombre(capa, nombre))

/** Un nivel de un barrio: lo que no sale de la cuenta (la dificultad la pone el barrio). */
interface Paso {
  lugar: string
  donde: readonly [number, number]
  resumen: string
  formato: Formato
  puntos: (typeof LARGOS_PARTIDA)[number]
  /** Los que juegan con el personaje del barrio (en 2v2 y 3v3). */
  con?: readonly string[]
  /** Tus compañeros (en 2v2 y 3v3). */
  companieros?: readonly string[]
  recompensas: readonly string[]
  frases: readonly [string, string, string]
  datos: readonly { texto: string; fuente: string }[]
  alFinal?: { ganaste: string; perdiste: string }
}

function barrio(
  id: string,
  nombre: string,
  jefe: string,
  presentacion: string,
  donde: readonly [number, number],
  [desde, hasta]: readonly [Nivel, Nivel],
  despedida: readonly string[],
  pasos: readonly Paso[],
): Barrio {
  const dificultades = dificultadesDelBarrio(desde, hasta, pasos.length)
  const niveles: NivelHistoria[] = pasos.map((p, i) => ({
    lugar: p.lugar,
    donde: p.donde,
    resumen: p.resumen,
    formato: p.formato,
    nivelBots: dificultades[i]!,
    puntos: p.puntos,
    rivales: [jefe, ...(p.con ?? [])],
    companieros: p.companieros ?? [],
    recompensas: p.recompensas,
    frases: p.frases,
    datos: p.datos,
    ...(p.alFinal ? { alFinal: p.alFinal } : {}),
  }))
  return { id, nombre, jefe, presentacion, donde, niveles, despedida }
}

const TR = 'https://turismorocha.gub.uy'

const LA_PALOMA = barrio(
  'la-paloma',
  'La Paloma',
  'surfista',
  'Olas, faro y atardeceres con aplauso. Nico te espera en la Playa del Faro, con la tabla apoyada en la silla y el mazo en el bolsillo de la malla.',
  [-34.66, -54.16],
  ['facil', 'dificil'],
  [
    'Bueno, loco, te ganaste La Paloma. Ni la Balconada te aplaudió tanto.',
    'Llevate el paño, que ya sabés leer las olas… y las cartas.',
    'Seguí por la costa: en La Pedrera te espera Nilda, y esa ve todo.',
  ],
  [
    {
      lugar: 'La Playa del Faro',
      donde: [-34.6667, -54.1606],
      resumen: 'Rocas y piletas naturales al pie del faro, a pocas cuadras del centro.',
      formato: '1v1',
      puntos: 20,
      recompensas: [idMonedas(100)],
      datos: [
        { texto: 'Mirá las piletas entre las rocas: cuando baja la marea, los gurises se meten ahí a buscar cangrejos.', fuente: `${TR}/en/attractions/beaches/del-faro-beach-in-la-paloma-uruguay-among-rocks-natural-pools-and-the-majesty-of-cabo-santa-maria-ligthhouse` },
        { texto: 'Y como es una punta, desde acá ves salir el sol sobre el mar y también lo ves ponerse. Las dos cosas, el mismo día.', fuente: `${TR}/en/attractions/beaches/del-faro-beach-in-la-paloma-uruguay-among-rocks-natural-pools-and-the-majesty-of-cabo-santa-maria-ligthhouse` },
      ],
      frases: ['¡Buenas, loco! Hoy no entra ni una ola, así que sentate que repartimos.', 'Mano a mano y a veinte, para calentar.', 'Eso sí: si te canto flor, no me pongas cara de marejada.'],
    },
    {
      lugar: 'La Playa Los Botes',
      donde: [-34.6624, -54.176],
      resumen: 'La playa de los pescadores artesanales, con el Cristo de Lucho mirando al mar.',
      formato: '2v2',
      puntos: 20,
      con: ['delpuerto'],
      companieros: ['guardavidas'],
      recompensas: [pieza('ropa', 'Traje de neoprene')],
      datos: [
        { texto: '¿Ves el Cristo? Lo hizo Alfredo Maurente, un pescador de acá: se acostó en la arena mojada y usó su propio cuerpo de molde.', fuente: `${TR}/en/attractions/beaches/los-botes-beach-in-la-paloma-uruguay-with-its-cristo-del-lucho-and-artisan-fishing-boats` },
        { texto: 'La punta de piedra hace de puerto natural. Por eso los botes duermen acá, en la arena.', fuente: `${TR}/en/attractions/beaches/los-botes-beach-in-la-paloma-uruguay-with-its-cristo-del-lucho-and-artisan-fishing-boats` },
      ],
      frases: ['Te presento a Toto, que ata nudos con una mano y reparte con la otra.', 'De a dos se juega distinto: mirá las señas, que acá no se habla.', 'Vale te cuida la espalda. Nosotros, el mazo.'],
    },
    {
      lugar: 'El puerto de La Paloma',
      donde: [-34.6545, -54.1439],
      resumen: 'Puerto pesquero y deportivo en la bahía, donde desembarcan los pescadores al caer la tarde.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMonedas(150)],
      datos: [
        { texto: 'Acá el puerto estaba antes que los turistas. Primero el pescado, después la sombrilla.', fuente: 'https://www.gub.uy/presidencia/comunicacion/noticias/paloma-sera-puerto-multiproposito-comercial-turistico-pesquero-deportivo-mili' },
        { texto: 'A la tardecita bajan la corvina negra, el lenguado y el sargo. Si te quedás, capaz te toca uno.', fuente: `${TR}/en/places/la-paloma` },
      ],
      frases: ['Ahora a treinta, que el puerto es serio.', 'Acá se huele el pescado y se huele el miedo.', 'Repartí vos, que yo miro cómo entran las lanchas.'],
    },
    {
      lugar: 'La Laguna de Rocha',
      donde: [-34.6527, -54.2518],
      resumen: 'Laguna costera protegida, con flamencos, cisnes de cuello negro y pescadores en la barra.',
      formato: '3v3',
      puntos: 30,
      con: ['delpuerto', 'bizcochos'],
      companieros: ['guardavidas', 'dona'],
      recompensas: [pieza('bufanda', 'Pañuelo celeste')],
      datos: [
        { texto: 'En la laguna viven más de doscientas veinte clases de pájaros. Hasta flamencos, mirá vos.', fuente: 'https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/paisaje-protegido-laguna-rocha-rocha' },
        { texto: 'Y la barra de arena se abre y se cierra sola, según el agua, el viento y las olas. Como el truco: nunca sabés.', fuente: 'https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/paisaje-protegido-laguna-rocha-rocha' },
      ],
      frases: ['Tres contra tres, con los flamencos de público.', 'Doña Marta trajo bizcochos. No te distraigas, que es su estrategia.', 'Cuidado con los cisnes: muerden. Yo, también.'],
    },
    {
      lugar: 'El faro del Cabo Santa María',
      donde: [-34.6682, -54.1529],
      resumen: 'El faro donde nació La Paloma: lo prendieron el 1 de setiembre de 1874.',
      formato: '2v2',
      puntos: 30,
      con: ['bizcochos'],
      companieros: ['guardavidas'],
      recompensas: [pieza('accesorio', 'Tabla de surf')],
      datos: [
        { texto: 'Este faro se vino abajo una vez, antes de que lo inauguraran. Lo volvieron a levantar y lo prendieron en 1874: ese día se cuenta como el nacimiento de La Paloma.', fuente: `${TR}/en/attractions/lighthouses/cabo-santa-maria-lighthouse-in-la-paloma-rocha-uruguay-visiting-hours-and-cost` },
        { texto: 'Arriba se sube por una escalera caracol de ciento cuarenta y tres escalones. Yo los subo corriendo. Bueno… caminando.', fuente: `${TR}/en/attractions/lighthouses/cabo-santa-maria-lighthouse-in-la-paloma-rocha-uruguay-visiting-hours-and-cost` },
      ],
      frases: ['Doña Marta conoce este faro desde antes que yo naciera.', 'Ella toca el envido bajito. No le creas nada.', 'Que el faro decida quién se va a casa.'],
    },
    {
      lugar: 'La Balconada',
      donde: [-34.6647, -54.1653],
      resumen: 'La playa del atardecer, donde se aplaude cuando el sol se esconde en el mar.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMesa('la-paloma')],
      datos: [
        { texto: 'Acá es costumbre quedarse hasta que el sol se esconde del todo… y aplaudirlo. Como al que gana.', fuente: `${TR}/en/attractions/beaches/la-balconada-beach-in-la-paloma-one-of-the-most-famous-and-popular-in-uruguay` },
        { texto: 'Y entre las dos puntas de roca se arma una izquierda de las buenas. Mi ola favorita.', fuente: `${TR}/en/attractions/sports/ideal-beaches-for-surfing-in-la-paloma-rocha-uruguay` },
      ],
      frases: ['Llegamos a la Balconada. Acá se termina el día… y la partida.', 'Si me ganás, te llevás el paño de La Paloma.', 'Y si no, aplaudís igual, como todos.'],
      alFinal: {
        ganaste: '¡Aplauso para vos, loco! El paño es tuyo.',
        perdiste: 'El sol se fue y vos también. Mañana hay otra ola.',
      },
    },
  ],
)

const LA_PEDRERA = barrio(
  'la-pedrera',
  'La Pedrera',
  'ballenera',
  'Un pueblo sobre las rocas, con ballenas en el horizonte y carnaval con espuma. Nilda te espera en su banco de la rambla, con los binoculares y el mazo.',
  [-34.59, -54.125],
  ['medio', 'muyDificil'],
  [
    'Te vi ganar desde mi banco, m\'hijo. Lo anoté en el cuaderno, al lado de las ballenas.',
    'Llevate el paño, y abrigate, que en la rambla sopla.',
    'Seguí para el norte: en el Polonio te espera Celeste, la del faro.',
  ],
  [
    {
      lugar: 'La rambla',
      donde: [-34.5915, -54.1215],
      resumen: 'El paseo sobre el acantilado, con postes blancos, bancos y el mar abierto.',
      formato: '1v1',
      puntos: 20,
      recompensas: [idMonedas(150)],
      datos: [
        { texto: 'De julio a octubre, desde este banco se ven pasar las ballenas francas allá en el horizonte. Las anoto todas.', fuente: `${TR}/destinos/la-pedrera` },
        { texto: 'La Pedrera nació en 1898. Este año cumple ciento veintiocho, y está mejor que yo.', fuente: `${TR}/destinos/la-pedrera` },
      ],
      frases: ['¡Vení, m\'hijo, sentate en el banco!', 'Desde acá veo ballenas a tres kilómetros.', 'Así que imaginate si no te voy a ver a vos cuando gritás truco sin nada.'],
    },
    {
      lugar: 'El Desplayado',
      donde: [-34.5863, -54.1195],
      resumen: 'La bahía chica entre rocas, al norte del pueblo, mirando hacia el Cabo Polonio.',
      formato: '2v2',
      puntos: 30,
      con: ['desplayado'],
      companieros: ['espuma'],
      recompensas: [pieza('sombrero', 'Gorro de lana')],
      datos: [
        { texto: 'En las noches claras, desde acá se ve el faro del Polonio. Destella cada doce segundos.', fuente: `${TR}/en/attractions/beaches/el-desplayado-beach-in-la-pedrera-uruguay-between-rocks-and-fine-sand-to-enjoy-the-summer` },
        { texto: 'Es la playa más al norte del pueblo. Más allá ya empieza Punta Rubia.', fuente: `${TR}/en/attractions/beaches/el-desplayado-beach-in-la-pedrera-uruguay-between-rocks-and-fine-sand-to-enjoy-the-summer` },
      ],
      frases: ['Héctor pesca acá desde que tengo memoria.', 'Habla poco, pero cuenta los destellos del faro para saber la hora.', 'Cada doce segundos te toca envido, gurí.'],
    },
    {
      lugar: 'La Playa del Barco',
      donde: [-34.5958, -54.1245],
      resumen: 'La playa de las olas grandes, con la proa oxidada del Cathay VIII encallada en la arena.',
      formato: '2v2',
      puntos: 30,
      con: ['surfista'],
      companieros: ['desplayado'],
      recompensas: [pieza('ropa', 'Saco de lana tejido')],
      datos: [
        { texto: 'Ese barco es el Cathay VIII, un pesquero que encalló el 15 de setiembre de 1977. Se salvaron los veintiún tripulantes.', fuente: `${TR}/en/attractions/historical/shipwreck-cathay-viii-in-del-barco-beach-in-la-pedrera-rocha-uruguay` },
        { texto: 'Al verano siguiente lo quisieron sacar con un remolcador y no hubo caso. El mar se fue comiendo el resto: hoy queda la proa.', fuente: `${TR}/en/attractions/historical/shipwreck-cathay-viii-in-del-barco-beach-in-la-pedrera-rocha-uruguay` },
      ],
      frases: ['Mirá quién vino desde La Paloma: Nico, a surfear la playa del Barco.', 'Dice que se acuerda de vos.', 'Yo también me acuerdo de todo, m\'hijo. Repartí.'],
    },
    {
      lugar: 'La avenida, en Carnaval',
      donde: [-34.5919, -54.1241],
      resumen: 'La calle que baja al mar, donde se hace el carnaval más famoso de la costa.',
      formato: '3v3',
      puntos: 30,
      con: ['espuma', 'desplayado'],
      companieros: ['surfista', 'hincha'],
      recompensas: [idMesa('la-pedrera')],
      datos: [
        { texto: 'El carnaval se hace acá, sobre la avenida. Llega tanta gente que la Intendencia tiene que poner vallas y cámaras.', fuente: 'https://www.elobservador.com.uy/nota/carnaval-de-la-pedrera-controlado-habra-300-funcionarios-y-13-camaras-de-vigilancia-20182811140' },
        { texto: 'Y en invierno, el club hace los Fuegos de San Juan: tambores por la avenida y una escultura que arman los vecinos y se quema.', fuente: 'https://www.montevideo.com.uy/Tiempo-libre/Los-vecinos-de-La-Pedrera-celebran-un-ano-mas-los-Fuegos-de-San-Juan-uc891844' },
      ],
      frases: ['¡Carnaval en La Pedrera! Rosana trajo la espuma.', 'Tres contra tres, en medio del desfile.', 'Y la flor la canto bien fuerte, para que la oiga toda la avenida.'],
      alFinal: {
        ganaste: 'Te ganaste el carnaval, m\'hijo. Y el paño de La Pedrera.',
        perdiste: 'En carnaval nadie se salva de la espuma. Ni de perder.',
      },
    },
  ],
)

const CABO_POLONIO = barrio(
  'cabo-polonio',
  'Cabo Polonio',
  'farera',
  'Dunas, lobos marinos y un faro que alumbra todo. Celeste te espera en la puerta, para cruzar las dunas en camión.',
  [-34.4, -53.79],
  ['dificil', 'master'],
  [
    'Subiste los ciento treinta y dos escalones y ganaste arriba. Eso no lo hace cualquiera.',
    'Llevate el paño, que acá todo se hace con las manos.',
    'Seguí por las dunas: en Aguas Dulces te espera Celestino, en su palafito.',
  ],
  [
    {
      lugar: 'La Puerta del Polonio',
      donde: [-34.3826, -53.8418],
      resumen: 'La terminal de la Ruta 10 donde se suben los camiones que cruzan las dunas.',
      formato: '1v1',
      puntos: 20,
      recompensas: [idMonedas(150)],
      datos: [
        { texto: 'Acá se deja el auto: al Polonio no se entra manejando. Se cruza en camión por las dunas, media hora de saltos.', fuente: `${TR}/en/schedules-cabo-polonio-uruguay` },
        { texto: 'También se puede llegar caminando o a caballo. Pero con el mazo bajo el brazo, mejor en camión.', fuente: `${TR}/en/schedules-cabo-polonio-uruguay` },
      ],
      frases: ['¡Bienvenido al Polonio! Bueno, a la puerta.', 'Una partida mientras esperamos el camión.', 'Acá la luz la prendemos nosotros. Y las cartas también.'],
    },
    {
      lugar: 'La playa La Calavera',
      donde: [-34.3963, -53.7823],
      resumen: 'La playa del norte del cabo, con las barcas de pesca sobre la arena.',
      formato: '2v2',
      puntos: 30,
      con: ['calavera'],
      companieros: ['camionero'],
      recompensas: [pieza('accesorio', 'Linterna')],
      datos: [
        { texto: 'El Polonio tiene dos playas, separadas por la punta del faro. Siempre hay una de las dos resguardada del viento.', fuente: `${TR}/en/attractions/beaches/la-calavera-beach-in-cabo-polonio-uruguay-that-of-the-artisanal-fishing-boats` },
        { texto: 'Esta costa es famosa por los naufragios. Por eso el faro, gurí: para que no haya más.', fuente: `${TR}/en/attractions/beaches/la-calavera-beach-in-cabo-polonio-uruguay-that-of-the-artisanal-fishing-boats` },
      ],
      frases: ['Rubén pesca en La Ñata, esa barca de ahí.', 'Washington maneja el camión, pero hoy juega con vos.', 'Que el mar decida.'],
    },
    {
      lugar: 'La Playa Sur',
      donde: [-34.4038, -53.7983],
      resumen: 'La playa de los atardeceres y el surf, por donde entran los camiones.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMonedas(200)],
      datos: [
        { texto: 'En el parador de acá venden buñuelos de algas. Probalos, que no te vas a arrepentir.', fuente: `${TR}/en/attractions/beaches/south-beach-playa-sur-in-cabo-polonio-uruguay` },
        { texto: 'Y es la playa para ver ponerse el sol. Acá los atardeceres no tienen apuro.', fuente: `${TR}/en/attractions/beaches/south-beach-playa-sur-in-cabo-polonio-uruguay` },
      ],
      frases: ['Atardecer en la Playa Sur. Mano a mano.', 'A treinta, que el sol tarda en bajar.', 'Repartí, que se nos va la luz.'],
    },
    {
      lugar: 'Las dunas',
      donde: [-34.3846, -53.7888],
      resumen: 'Dunas móviles de más de veinte metros entre el pueblo y Valizas.',
      formato: '3v3',
      puntos: 30,
      con: ['camionero', 'bunuelos'],
      companieros: ['hippie', 'calavera'],
      recompensas: [pieza('sombrero', 'Vincha hippie')],
      datos: [
        { texto: 'Estas dunas se mueven: son de las pocas que quedan así en toda la región, y hay algunas de más de veinte metros.', fuente: 'https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/parque-nacional-cabo-polonio-rocha' },
        { texto: 'Aquel cerro de arena es el de la Buena Vista. Hace más de doscientos años marcaba el límite entre España y Portugal.', fuente: 'https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/parque-nacional-cabo-polonio-rocha' },
      ],
      frases: ['Tres contra tres en medio de las dunas.', 'Luna y Rubén van con vos. Rosina y Washington, conmigo.', 'Ojo con la arena en las cartas.'],
    },
    {
      lugar: 'La lobería',
      donde: [-34.4044, -53.7769],
      resumen: 'Las rocas al pie del faro donde descansan los lobos y los leones marinos.',
      formato: '2v2',
      puntos: 30,
      con: ['hippie'],
      companieros: ['bunuelos'],
      recompensas: [pieza('bufanda', 'Collar de cuentas')],
      datos: [
        { texto: 'Estas rocas tienen la única colonia de lobo fino en tierra firme de todo el país.', fuente: 'https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/parque-nacional-cabo-polonio-rocha' },
        { texto: 'Al león marino macho le dicen "peluca", por la melena. Llega a pesar trescientos cuarenta kilos.', fuente: `${TR}/en/attractions/nature/natural-reserve-of-sea-lions-in-cabo-polonio-rocha-uruguay` },
      ],
      frases: ['Escuchá a los lobos: están gritando truco.', 'Luna juega conmigo. Paz, amor y retruco.', 'El que pierde, le canta a los lobos.'],
    },
    {
      lugar: 'El faro de Cabo Polonio',
      donde: [-34.4053, -53.7778],
      resumen: 'El faro sobre la punta rocosa, Monumento Histórico Nacional.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMesa('cabo-polonio')],
      datos: [
        { texto: 'Para llegar arriba hay que subir ciento treinta y dos escalones. Desde ahí se ve todo: el pueblo, las islas, la lobería y las dunas.', fuente: `${TR}/atractivos/faros/faro-de-cabo-polonio` },
        { texto: 'Al principio las lámparas quemaban grasa, y el farero subía cada tres horas a darle cuerda. Mi abuelo me lo contaba.', fuente: `${TR}/atractivos/faros/faro-de-cabo-polonio` },
      ],
      frases: ['Arriba del faro, de noche. Esta es la última.', 'Si me ganás, te llevás el paño del Polonio.', 'Y si no, bajás los escalones de a uno, pensando.'],
      alFinal: {
        ganaste: 'Ganaste arriba del faro. Eso se cuenta en todo el Polonio.',
        perdiste: 'El faro alumbra a todos, pero hoy me alumbró a mí.',
      },
    },
  ],
)

const AGUAS_DULCES = barrio(
  'aguas-dulces-valizas-castillos',
  'Aguas Dulces, Valizas y Castillos',
  'palafito',
  'Ranchos sobre pilotes, un naufragio con oro y dunas enormes. Celestino te espera en el banco de su palafito, a veinte pasos del agua.',
  [-34.28, -53.78],
  ['muyDificil', 'master'],
  [
    'Desde el cerro se ve todo, y vos lo ganaste todo. Mi abuelo estaría orgulloso.',
    'Llevate el paño, que acá todo se hace sin apuro.',
    'Seguí para el norte: en Punta del Diablo te espera Julio, con las barcas.',
  ],
  [
    {
      lugar: 'La Terraza',
      donde: [-34.2766, -53.7815],
      resumen: 'La bajada central del balneario, con bancos frente al mar.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMonedas(200)],
      datos: [
        { texto: 'Aguas Dulces nació para que la gente de Castillos tuviera dónde veranear. Y acá seguimos.', fuente: `${TR}/en/places/aguas-dulces` },
        { texto: 'Queda en el kilómetro 277 y medio de la Ruta 10. Para que no te pierdas a la vuelta.', fuente: `${TR}/en/places/aguas-dulces` },
      ],
      frases: ['¡Pasá, botija, que el viento está del este!', 'Las cartas vienen saladas hoy.', 'Sentate en el banco, que acá el mar es testigo.'],
    },
    {
      lugar: 'Los ranchos y palafitos',
      donde: [-34.2815, -53.781],
      resumen: 'Ranchos de paja sobre pilotes, a pocos metros del mar.',
      formato: '2v2',
      puntos: 30,
      con: ['araza'],
      companieros: ['lanchero'],
      recompensas: [pieza('sombrero', 'Sombrero de paja')],
      datos: [
        { texto: 'Los primeros ranchos se hicieron con paja, junco y pilotes, ahí nomás sobre la arena.', fuente: `${TR}/en/places/aguas-dulces` },
        { texto: 'El mar se viene comiendo la costa. En el ciclón de 2016 se perdieron veinticuatro casas, pero los palafitos aguantaron.', fuente: 'https://www.gub.uy/ministerio-ambiente/sites/ministerio-ambiente/files/documentos/noticias/Nota%20Ganadora%20-%20El%20cambio%20clim%C3%A1tico%20y%20el%20problema%20del%20balc%C3%B3n%20al%20mar.pdf' },
      ],
      frases: ['Doña Nelly trajo dulce de arazá.', 'Si canta flor es porque la tiene, como el arazá en marzo.', 'Agarrate, que viene temporal.'],
    },
    {
      lugar: 'Frente al Arinos',
      donde: [-34.28, -53.78],
      resumen: 'Los restos del vapor que encalló en 1875, con la leyenda del oro robado.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMonedas(200)],
      datos: [
        { texto: 'El 9 de octubre de 1875, con tormenta y niebla, un vapor de ruedas encalló acá. Iba de Río de Janeiro a Montevideo.', fuente: 'https://www.montevideo.com.uy/Tiempo-libre/La-leyenda-del-oro-del-Arinos-naufragio-y-misterio-en-Aguas-Dulces-uc947899' },
        { texto: 'El capitán dijo que llevaba dos cajones de libras esterlinas y que esa noche se los robaron. Hay quien dice que el oro está enterrado bajo los palmares de Castillos.', fuente: 'https://www.montevideo.com.uy/Tiempo-libre/La-leyenda-del-oro-del-Arinos-naufragio-y-misterio-en-Aguas-Dulces-uc947899' },
      ],
      frases: ['Mirá esos fierros: ahí está el Arinos.', 'Mi abuelo vio los cajones. Bueno, eso dice.', 'Jugamos por el oro del vapor.'],
    },
    {
      lugar: 'La Barra de Valizas',
      donde: [-34.337, -53.7928],
      resumen: 'Pueblo de ranchos en la desembocadura del arroyo, con dunas de hasta cuarenta metros.',
      formato: '2v2',
      puntos: 30,
      con: ['duna'],
      companieros: ['araza'],
      recompensas: [pieza('ropa', 'Camisa a cuadros')],
      datos: [
        { texto: 'Las dunas de Valizas llegan a los cuarenta metros. Por la más grande, el Gran Vali, los gurises se tiran en tabla.', fuente: `${TR}/en/attractions/beaches/barra-de-valizas-beach-a-landscape-of-huge-dunes-stream-and-ocean-in-uruguay` },
        { texto: 'Este arroyo une la Laguna de Castillos con el mar. Según cómo esté, se cruza a pie o en bote.', fuente: `${TR}/en/attractions/lagoons/castillos-lagoon-wetlands-ocean-stream-bush-forest-and-palm-groves-in-rocha-uruguay` },
      ],
      frases: ['Nacho bajó de la duna para jugar.', 'Atrevido como pocos: toca envido con cualquier cosa.', 'Que el Gran Vali nos ampare.'],
    },
    {
      lugar: 'El monte de ombúes',
      donde: [-34.3551, -53.8651],
      resumen: 'El bosque de ombúes más grande de la región, a orillas de la Laguna de Castillos.',
      formato: '3v3',
      puntos: 30,
      con: ['lanchero', 'baqueana'],
      companieros: ['duna', 'araza'],
      recompensas: [pieza('enBoca', 'Pajita de pasto')],
      datos: [
        { texto: 'Los ombúes ocupan una franja de veinte kilómetros. Se llega en bote por el arroyo, como vinimos nosotros.', fuente: `${TR}/en/attractions/nature/monte-de-ombues-the-largest-grouping-of-ombu-trees-of-the-region-over-laguna-de-castillos-in-uruguay` },
        { texto: 'En esta laguna anotaron doscientas cincuenta y seis clases de pájaros. Más que cartas tiene el mazo.', fuente: `${TR}/en/attractions/lagoons/castillos-lagoon-wetlands-ocean-stream-bush-forest-and-palm-groves-in-rocha-uruguay` },
      ],
      frases: ['Don Lalo nos trajo en bote. Coca conoce cada ombú.', 'Tres contra tres a la sombra.', 'Este ombú tiene más años que el truco. Respetalo.'],
    },
    {
      lugar: 'El Cerro de la Buena Vista',
      donde: [-34.3532, -53.7726],
      resumen: 'El punto más alto de las dunas, entre Valizas y el Polonio.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMesa('aguas-dulces-valizas-castillos')],
      datos: [
        { texto: 'Desde acá arriba se ven las islas, el Cabo Polonio, la Laguna de Castillos y el arroyo. Todo el pago.', fuente: `${TR}/en/attractions/nature/cerro-de-la-buena-vista-the-highest-point-of-the-dunes-of-cabo-polonio-and-barra-de-valizas-in-uruguay` },
        { texto: 'Al pie había un mojón de 1750, de cuando España y Portugal se repartían esto. Hoy lo guardan en la Fortaleza de Santa Teresa.', fuente: `${TR}/en/attractions/nature/cerro-de-la-buena-vista-the-highest-point-of-the-dunes-of-cabo-polonio-and-barra-de-valizas-in-uruguay` },
      ],
      frases: ['Llegamos arriba del cerro. Mirá lo que es esto.', 'La última, al atardecer.', 'El que gana se queda con la vista.'],
      alFinal: {
        ganaste: 'Te ganaste la Buena Vista, botija. Y el paño, para el camino.',
        perdiste: 'Bajá despacito, que la arena resbala. Y volvé.',
      },
    },
  ],
)

const PUNTA_DEL_DIABLO = barrio(
  'punta-del-diablo',
  'Punta del Diablo',
  'pescador',
  'Barcas en la arena, olas bravas y Artigas mirando el mar. Julio te espera en la Playa de los Pescadores, con la red remendada y el mazo bajo el brazo.',
  [-34.045, -53.545],
  ['muyDificil', 'master'],
  [
    'Bueno, gurí… ganaste en la punta. Artigas te vio.',
    'Llevate el paño, que ya tenés paciencia de pescador.',
    'Te falta lo último: Santa Teresa y el Chuy. Cleusa te espera en la frontera.',
  ],
  [
    {
      lugar: 'La Playa de los Pescadores',
      donde: [-34.0445, -53.5378],
      resumen: 'La playa del centro del pueblo, con las barcas de pesca artesanal sobre la arena.',
      formato: '1v1',
      puntos: 30,
      recompensas: [pieza('sombrero', 'Gorro de pescador')],
      datos: [
        { texto: 'Mirá las barcas sobre la arena: en la Playa de los Pescadores descansan cuando vuelven del mar.', fuente: `${TR}/atractivos/playas/playa-de-los-pescadores` },
        { texto: 'Y para sacarlas del agua no hay máquina: las arrastramos entre todos hasta la playa. A pulmón, gurí.', fuente: `${TR}/atractivos/playas/playa-de-los-pescadores` },
      ],
      frases: ['¡Epa! ¿Vos sos el gurí que viene recorriendo la costa?', 'Acá el truco se juega con olor a pescado y viento del este.', 'Sentate, que la red no se remienda sola… ni el truco se gana solo.'],
    },
    {
      lugar: 'La Playa del Rivero',
      donde: [-34.0398, -53.5396],
      resumen: 'La bahía chica del norte del pueblo, con rocas grandes y el mirador con forma de pez.',
      formato: '2v2',
      puntos: 30,
      con: ['caracolera'],
      companieros: ['tubo'],
      recompensas: [pieza('accesorio', 'Caña de pescar')],
      datos: [
        { texto: 'Ese mirador de madera tiene forma de pez. De julio a octubre se suben a ver las ballenas.', fuente: `${TR}/atractivos/aire-libre/mirador-pez` },
        { texto: 'Cruzando esas rocas se llega al Parque Nacional Santa Teresa. Caminando, despacito.', fuente: `${TR}/atractivos/playas/playa-del-rivero` },
      ],
      frases: ['Marisol vino de la feria del Bajo.', 'Ojo, que se da cuenta enseguida cuando tenés flor.', 'Bruno juega con vos. Que la ola los acompañe.'],
    },
    {
      lugar: 'La playa de la Viuda',
      donde: [-34.0576, -53.55],
      resumen: 'La playa de las olas más bravas, con el faro de Punta Palmar al fondo.',
      formato: '3v3',
      puntos: 30,
      con: ['tubo', 'caracolera'],
      companieros: ['surfista', 'hincha'],
      recompensas: [pieza('ropa', 'Impermeable amarillo')],
      datos: [
        { texto: 'Esta playa mira al sur y tiene la ola más fuerte del pueblo. Acá se arman los campeonatos de surf.', fuente: `${TR}/atractivos/deportes/surf-en-punta-del-diablo` },
        { texto: 'Aquel faro a rayas es el de Punta Palmar. Mide doce metros y larga un destello cada seis segundos.', fuente: 'https://ibiblio.org/lighthouse/uru.htm' },
      ],
      frases: ['Tres contra tres en la Viuda, con olas de las grandes.', 'Bruno se cambió de bando. Nico vino a darte una mano.', 'Agarrate el impermeable, que acá salpica.'],
    },
    {
      lugar: 'El monumento a Artigas',
      donde: [-34.0448, -53.5344],
      resumen: 'La estatua de Artigas sobre las rocas de la punta, que de noche hace de faro.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMesa('punta-del-diablo')],
      datos: [
        { texto: 'Al lado de Artigas hay un pilar blanco que de noche hace de faro: un destello cada cinco segundos, para las barcas.', fuente: 'https://ibiblio.org/lighthouse/uru.htm' },
        { texto: 'El pueblo empezó hacia 1942, con pescadores de tiburón. Mi abuelo era uno.', fuente: `${TR}/destinos/punta-del-diablo` },
      ],
      frases: ['Llegaste a la punta, gurí. Artigas nos mira.', 'Esta es la última, mano a mano.', 'Si me ganás, te llevás el paño de la punta. Si no, a remar.'],
      alFinal: {
        ganaste: 'Mirá vos, el gurí sabe jugar. El paño es tuyo.',
        perdiste: 'Volvé mañana temprano, que el mar y el truco se aprenden de a poco.',
      },
    },
  ],
)

const SANTA_TERESA = barrio(
  'santa-teresa-y-chuy',
  'Santa Teresa y Chuy',
  'cambista',
  'La frontera, el monte y dos fortalezas. Cleusa te espera en la avenida del Chuy, contando pesos y reales.',
  [-33.85, -53.5],
  ['muyDificil', 'master'],
  [
    'Ganaste en la Fortaleza, ¡parabéns! Recorriste toda la costa de Rocha.',
    'El mazo de la costa y el paño son tuyos. En los dos idiomas.',
    '¡Boa viagem! Digo… ¡buen viaje! Y que te toquen buenas cartas.',
  ],
  [
    {
      lugar: 'La avenida Brasil',
      donde: [-33.6927, -53.4556],
      resumen: 'La avenida que separa Chuy de Chuí, llena de free shops.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMonedas(250)],
      datos: [
        { texto: 'Esta avenida es la frontera: de este lado es la avenida Brasil y del otro, la avenida Uruguai.', fuente: `${TR}/en/places/chuy` },
        { texto: 'Y el carnaval lo hacemos juntos, las dos ciudades. Le decimos el Carnaval sin fronteras.', fuente: `${TR}/en/places/chuy` },
      ],
      frases: ['¡Oi, bem-vindo! Pasá, pasá.', 'Acá el mate es uruguayo y la sonrisa, brasilera.', 'Eso sí: si cantás flor, te la contesto en los dos idiomas.'],
    },
    {
      lugar: 'La Barra del Chuy',
      donde: [-33.7551, -53.389],
      resumen: 'La desembocadura del arroyo Chuy, el punto más al este de la costa uruguaya.',
      formato: '2v2',
      puntos: 30,
      con: ['muelle'],
      companieros: ['pajarera'],
      recompensas: [pieza('accesorio', 'Termo')],
      datos: [
        { texto: 'El pueblo nació hacia 1914, alrededor de una estación del telégrafo inglés: el cable iba por el mar de Montevideo a Porto Alegre.', fuente: `${TR}/en/places/barra-de-chuy` },
        { texto: 'Desde los puentes del arroyo se pesca con un pie en cada país.', fuente: `${TR}/en/places/barra-de-chuy` },
      ],
      frases: ['Gerardo pesca en el muelle desde siempre.', 'Toca envido con cara de nada. No le creas.', 'Jandira juega con vos. Ella anota todo.'],
    },
    {
      lugar: 'La Laguna Negra',
      donde: [-34.0109, -53.5946],
      resumen: 'La Laguna de los Difuntos: la más grande de las lagunas de la costa, de agua oscura.',
      formato: '2v2',
      puntos: 30,
      con: ['pajarera'],
      companieros: ['muelle'],
      recompensas: [idMonedas(300)],
      datos: [
        { texto: 'Es la más grande de las lagunas de la costa. No tiene salida al mar, y el agua es oscura por la turba del fondo.', fuente: `${TR}/en/attractions/lagoons/laguna-negra-or-laguna-de-los-difuntos-in-rocha-to-the-east-of-uruguay` },
        { texto: 'Le dicen de los Difuntos porque los pueblos originarios enterraban a sus muertos en las cuevas de los cerros.', fuente: `${TR}/en/attractions/lagoons/laguna-negra-or-laguna-de-los-difuntos-in-rocha-to-the-east-of-uruguay` },
      ],
      frases: ['Ahora Jandira juega conmigo.', 'Ella se acuerda de qué carta tiraste hace tres manos.', 'Shh, que se espanta la garza.'],
    },
    {
      lugar: 'El Parque Santa Teresa',
      donde: [-33.9559, -53.5226],
      resumen: 'El monte, el invernáculo y la playa La Moza, en el parque nacional.',
      formato: '3v3',
      puntos: 30,
      con: ['rosedal', 'pajarera'],
      companieros: ['muelle', 'tubo'],
      recompensas: [pieza('bufanda', 'Pañuelo blanco')],
      datos: [
        { texto: 'El parque tiene tres mil hectáreas, casi la mitad de monte, y un rosedal con más de trescientas variedades.', fuente: `${TR}/atractivos/aire-libre/parque-nacional-santa-teresa` },
        { texto: 'En 2024 lo declararon Monumento Histórico Nacional, con el invernáculo de 1939 y la torre de agua.', fuente: 'https://www.gub.uy/ministerio-educacion-cultura/comunicacion/noticias/parque-nacional-santa-teresa-escuela-rural-n70-son-monumento-historico' },
      ],
      frases: ['La sargento Graciela cuida las rosas.', 'Tres contra tres entre el monte y el mar.', 'Ninguna rosa pincha como un retruco mal gritado.'],
    },
    {
      lugar: 'El Fuerte San Miguel',
      donde: [-33.6894, -53.5389],
      resumen: 'Fuerte colonial de piedra sobre un cerrito, con el museo criollo al lado.',
      formato: '2v2',
      puntos: 30,
      con: ['fortin'],
      companieros: ['rosedal'],
      recompensas: [idMonedas(300)],
      datos: [
        { texto: 'Lo empezaron los españoles en 1734, lo tomaron los portugueses en 1737 y volvió a los españoles en 1763. Pobre fuerte.', fuente: `${TR}/en/attractions/historical/san-miguel-fort-historical-monument-of-rocha-uruguay` },
        { texto: 'Al lado está el museo criollo, con una diligencia de 1816 y una pulpería como las de antes.', fuente: `${TR}/en/attractions/historical/san-miguel-fort-historical-monument-of-rocha-uruguay` },
      ],
      frases: ['Arnaldo cuenta la historia del fuerte.', 'En esa pulpería se jugaba truco hace doscientos años.', 'El bastillo se guarda, como se guardaba la yerba.'],
    },
    {
      lugar: 'La Fortaleza de Santa Teresa',
      donde: [-33.9727, -53.5488],
      resumen: 'La fortaleza de cinco baluartes, empezada en 1762, en medio del parque.',
      formato: '1v1',
      puntos: 30,
      recompensas: [idMesa('santa-teresa-y-chuy'), idBaraja('costa'), idMesa('rocha')],
      datos: [
        { texto: 'La empezaron los portugueses en 1762 y al año siguiente la siguieron los españoles. Tiene cinco baluartes y seiscientos cuarenta y dos metros de muralla.', fuente: `${TR}/atractivos/historicos/fortaleza-de-santa-teresa` },
        { texto: 'El 31 de diciembre de 1825 la tomaron los patriotas de Leonardo Olivera. Y hoy, a ver quién la toma.', fuente: `${TR}/atractivos/historicos/fortaleza-de-santa-teresa` },
      ],
      frases: ['Llegaste a la Fortaleza. La última de toda la costa.', 'Si me ganás, te llevás el mazo de la costa y el paño de Rocha.', 'En pesos o en reales: esta se paga cara.'],
      alFinal: {
        ganaste: '¡Ganaste en la Fortaleza! El mazo de la costa es tuyo.',
        perdiste: 'Estos muros aguantaron siglos. Uno más no les hace nada.',
      },
    },
  ],
)

/** Rocha por barrios, en el orden en que se abren (de sur a norte, por la costa). */
export const ROCHA_POR_BARRIOS: HistoriaDepartamento = {
  departamento: 'rocha',
  jefe: 'pescador',
  presentacion: 'Seis barrios por la costa, de La Paloma a la frontera: faros, dunas, lobos marinos y dos fortalezas. En cada uno te espera alguien con el mazo.',
  niveles: [],
  despedida: [
    'Bueno, gurí… llegó la hora. Ganaste en toda la costa.',
    'Te llevás el mazo, el paño y un pedacito del mar de Rocha.',
    'Que el viento del este te empuje. ¡Buen viaje, y que te toquen buenas cartas!',
  ],
  barrios: [LA_PALOMA, LA_PEDRERA, CABO_POLONIO, AGUAS_DULCES, PUNTA_DEL_DIABLO, SANTA_TERESA],
}
