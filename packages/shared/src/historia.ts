/**
 * Modo historia: se recorre Uruguay por departamento. Cada departamento es independiente (no hay
 * pasaje entre ellos), tiene un personaje que es el rival en todos sus niveles y entre 3 y 5
 * niveles según su tamaño, cada uno más difícil. Cada nivel tiene su formato (1v1, 2v2 o 3v3), su
 * dificultad, sus recompensas fijas y lo que dice el rival antes de empezar.
 *
 * Un departamento puede dividirse en barrios (ver `Barrio`): cada uno con su personaje y sus
 * niveles, que se juegan en orden. Los que no tienen barrios se manejan como uno solo, sin nombre
 * (`barriosDe`). El progreso se guarda por barrio: así se le pueden sumar niveles a uno sin correr
 * la numeración de los otros.
 *
 * Se publica de a poco: cualquiera juega los de `DEPARTAMENTOS_PUBLICADOS` y el admin, todos. Rocha
 * está acá (fue el primero); los demás, en historias.ts.
 */

import type { Formato, LARGOS_PARTIDA } from '@truco/engine'
import type { Nivel } from '@truco/bots'
import { buscarItem, idBaraja, idMesa, idPieza } from './tienda'
import { PERSONAJES, piezaPorNombre, type Personaje } from './personajes'
import { BARAJAS, type IdBaraja } from './barajas'
import { MESAS, type IdMesa } from './mesas'
import type { CapaAvatar } from './avatar'
import { HISTORIAS_DEPARTAMENTOS, monedasDeRecompensa } from './historias'
import { VECINOS } from './vecinos'

export interface Departamento {
  id: string
  nombre: string
  /** Superficie en km²: de ahí sale cuántos niveles tiene. */
  km2: number
}

export const DEPARTAMENTOS = [
  { id: 'artigas', nombre: 'Artigas', km2: 11_928 },
  { id: 'canelones', nombre: 'Canelones', km2: 4_536 },
  { id: 'cerro-largo', nombre: 'Cerro Largo', km2: 13_648 },
  { id: 'colonia', nombre: 'Colonia', km2: 6_106 },
  { id: 'durazno', nombre: 'Durazno', km2: 11_643 },
  { id: 'flores', nombre: 'Flores', km2: 5_144 },
  { id: 'florida', nombre: 'Florida', km2: 10_417 },
  { id: 'lavalleja', nombre: 'Lavalleja', km2: 10_016 },
  { id: 'maldonado', nombre: 'Maldonado', km2: 4_793 },
  { id: 'montevideo', nombre: 'Montevideo', km2: 530 },
  { id: 'paysandu', nombre: 'Paysandú', km2: 13_922 },
  { id: 'rio-negro', nombre: 'Río Negro', km2: 9_282 },
  { id: 'rivera', nombre: 'Rivera', km2: 9_370 },
  { id: 'rocha', nombre: 'Rocha', km2: 10_551 },
  { id: 'salto', nombre: 'Salto', km2: 14_163 },
  { id: 'san-jose', nombre: 'San José', km2: 4_992 },
  { id: 'soriano', nombre: 'Soriano', km2: 9_008 },
  { id: 'tacuarembo', nombre: 'Tacuarembó', km2: 15_438 },
  { id: 'treinta-y-tres', nombre: 'Treinta y Tres', km2: 9_529 },
] as const satisfies readonly Departamento[]

export type IdDepartamento = (typeof DEPARTAMENTOS)[number]['id']

/** Cuántos niveles le tocan por su tamaño: 3 a los chicos, 4 a los medianos y 5 a los grandes. */
export function nivelesPorTamanio(km2: number): number {
  if (km2 < 6_000) return 3
  if (km2 <= 10_000) return 4
  return 5
}

export interface NivelHistoria {
  /** Dónde se juega (la cinemática lo dice abajo del nombre del rival). */
  lugar: string
  /** Dónde queda (latitud, longitud): para ubicarlo en el mapa del departamento. */
  donde: readonly [number, number]
  /** Qué es el lugar, en una línea (la presentación del departamento). */
  resumen: string
  formato: Formato
  nivelBots: Nivel
  /** A cuánto se juega: uno de los largos del motor (a 20, 30 o 40; "a 15" no existe). */
  puntos: (typeof LARGOS_PARTIDA)[number]
  /** Los personajes rivales: el primero es el del departamento. */
  rivales: readonly string[]
  /** Tus compañeros (bots), en 2v2 y 3v3. */
  companieros: readonly string[]
  /** Lo que se gana la primera vez: ids de la tienda (`avatar:…`, `mesa:…`, `baraja:…`) o `monedas:<n>`. */
  recompensas: readonly string[]
  /** Lo que dice el rival antes de empezar, una frase por globo. */
  frases: readonly string[]
  /** Lo que el rival cuenta del lugar: datos verificados, en su voz, con la fuente de cada uno. */
  datos?: readonly { texto: string; fuente: string }[]
  /** Lo que dice el rival al terminar, si ganaste o si perdiste (si no está, lo de siempre de su personaje). */
  alFinal?: { ganaste: string; perdiste: string }
}

export interface HistoriaDepartamento {
  departamento: IdDepartamento
  /** El personaje del departamento: el rival de todos sus niveles. */
  jefe: string
  presentacion: string
  /** Los niveles, si el departamento no tiene barrios (si tiene, van en cada barrio y esto queda vacío). */
  niveles: readonly NivelHistoria[]
  /** Lo que dice el rival cuando completás el departamento y te vas: una frase por globo. */
  despedida: readonly string[]
  /** Los barrios, en el orden en que se abren. */
  barrios?: readonly Barrio[]
}

/**
 * Un barrio de un departamento: una localidad con su personaje y sus niveles, cada uno en un lugar
 * puntual. Se abre cuando completás el anterior (el primero, desde que se abre el departamento).
 */
export interface Barrio {
  /** Para el progreso y las rutas: no cambia nunca (es parte de lo que se guarda). */
  id: string
  nombre: string
  /** El personaje del barrio: el rival principal de sus niveles. */
  jefe: string
  /** Lo que se cuenta al entrar al barrio. */
  presentacion: string
  /** Dónde queda (latitud, longitud): para ubicarlo en el mapa del departamento. */
  donde: readonly [number, number]
  niveles: readonly NivelHistoria[]
  /** Lo que dice el personaje cuando completás el barrio: una frase por globo. */
  despedida: readonly string[]
}

const pieza = (capa: CapaAvatar, nombre: string) => idPieza(capa, piezaPorNombre(capa, nombre))

const ROCHA: HistoriaDepartamento = {
  departamento: 'rocha',
  jefe: 'pescador',
  presentacion: 'Costa, faros y lobos marinos. Julio te espera en Punta del Diablo, con la red remendada y el mazo bajo el brazo.',
  despedida: [
    'Bueno, gurí… llegó la hora. Ganaste en toda la costa.',
    'Te llevás el mazo, el paño y un pedacito del mar de Rocha.',
    'Que el viento del este te empuje. ¡Buen viaje, y que te toquen buenas cartas!',
  ],
  niveles: [
    {
      lugar: 'Punta del Diablo',
      donde: [-34.045, -53.545],
      resumen: 'Pueblo de pescadores artesanales sobre el Atlántico, cerca de la frontera con Brasil.',
      formato: '1v1',
      nivelBots: 'facil',
      puntos: 20,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [pieza('sombrero', 'Gorro de pescador')],
      datos: [
        { texto: 'Mirá las barcas sobre la arena: en la Playa de los Pescadores descansan cuando vuelven del mar.', fuente: 'https://turismorocha.gub.uy/atractivos/playas/playa-de-los-pescadores' },
        { texto: 'Y para sacarlas del agua no hay máquina: las arrastramos entre todos hasta la playa. A pulmón, gurí.', fuente: 'https://turismorocha.gub.uy/atractivos/playas/playa-de-los-pescadores' },
      ],
      frases: [
        '¡Epa! ¿Vos sos el gurí que vino de la capital?',
        'Acá el truco se juega con olor a pescado y viento del este.',
        'Sentate, que la red no se remienda sola… ni el truco se gana solo.',
      ],
      alFinal: {
        ganaste: 'Mirá vos, el gurí de la capital sabe jugar. Te ganaste el gorro.',
        perdiste: 'Volvé mañana temprano, que el mar y el truco se aprenden de a poco.',
      },
    },
    {
      lugar: 'La Paloma',
      donde: [-34.66, -54.16],
      resumen: 'Balneario de olas y surf, con el faro del cabo Santa María.',
      formato: '2v2',
      nivelBots: 'medio',
      puntos: 20,
      rivales: ['pescador', 'surfista'],
      companieros: ['hincha'],
      recompensas: [pieza('ropa', 'Impermeable amarillo')],
      datos: [
        { texto: 'El faro de Cabo Santa María se prendió el 1 de septiembre de 1874, y ese día se cuenta como la fundación de La Paloma.', fuente: 'https://turismorocha.gub.uy/atractivos/faros/faro-cabo-santa-maria' },
        { texto: 'Los materiales para hacerlo los trajeron en barco desde Montevideo. ¡Imaginate el viaje!', fuente: 'https://turismorocha.gub.uy/atractivos/faros/faro-cabo-santa-maria' },
      ],
      frases: [
        'Te traje a Nico, que vino surfeando desde La Paloma.',
        'Dice que lee las cartas como lee las olas. Yo no le creo nada.',
        '¿Trajiste compañero? Mejor: así pierden de a dos.',
      ],
      alFinal: {
        ganaste: 'Nico, nos revolcó la ola. Llevate el impermeable, por si llueve.',
        perdiste: '¡Les dije! De a dos se pierde más rápido.',
      },
    },
    {
      lugar: 'La Pedrera',
      donde: [-34.59, -54.125],
      resumen: 'Balneario sobre las rocas, frente al mar abierto.',
      formato: '1v1',
      nivelBots: 'dificil',
      puntos: 30,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [pieza('accesorio', 'Caña de pescar')],
      datos: [
        { texto: 'La Pedrera está arriba de un acantilado de piedra, mirando de frente al Atlántico.', fuente: 'https://turismorocha.gub.uy/destinos/la-pedrera' },
        { texto: 'Abajo está el Desplayado, una bahía chiquita entre las rocas. Y la playa del Barco es la de los surfistas, como Nico.', fuente: 'https://turismorocha.gub.uy/destinos/la-pedrera' },
      ],
      frases: [
        'Ayer saqué una corvina de cuarenta kilos. Bueno… de cuatro.',
        'Ahora va en serio: a treinta, mano a mano.',
        'Si me cantás flor, te contesto con la red.',
      ],
      alFinal: {
        ganaste: 'A treinta y mano a mano… y me ganaste. Llevate la caña, que es tuya.',
        perdiste: 'Desde estas rocas vi perder a muchos. No sos el primero.',
      },
    },
    {
      lugar: 'Cabo Polonio',
      donde: [-34.4, -53.78],
      resumen: 'Pueblo sin luz eléctrica entre dunas, con su faro y los lobos marinos.',
      formato: '3v3',
      nivelBots: 'muyDificil',
      puntos: 30,
      rivales: ['pescador', 'surfista', 'hippie'],
      companieros: ['hincha', 'dona'],
      recompensas: [pieza('accesorio', 'Tabla de surf')],
      datos: [
        { texto: '¿Sabés cuántos escalones tiene la escalera del faro? Ciento treinta y dos.', fuente: 'https://turismorocha.gub.uy/atractivos/faros/faro-de-cabo-polonio' },
        { texto: 'Desde arriba se ve todo: el pueblo, las islas y las dunas alrededor del cabo.', fuente: 'https://turismorocha.gub.uy/atractivos/faros/faro-de-cabo-polonio' },
      ],
      frases: [
        'Se vino Luna desde Cabo Polonio, a la luz del faro.',
        'Tres contra tres, como en la barra del boliche.',
        'Acá no hay luz eléctrica, pero señas hay de sobra.',
      ],
      alFinal: {
        ganaste: 'Ni con Luna y Nico pudimos. Los lobos marinos te aplauden.',
        perdiste: 'El faro alumbra a todos, pero hoy nos alumbró a nosotros.',
      },
    },
    {
      lugar: 'La Fortaleza de Santa Teresa',
      donde: [-33.97, -53.55],
      resumen: 'Fortaleza del siglo XVIII en medio del Parque Nacional Santa Teresa.',
      formato: '1v1',
      nivelBots: 'master',
      puntos: 30,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [idBaraja('costa'), idMesa('rocha')],
      datos: [
        { texto: 'Esta fortaleza la empezaron los portugueses en 1762, y al año siguiente la siguieron los españoles.', fuente: 'https://turismorocha.gub.uy/atractivos/historicos/fortaleza-de-santa-teresa' },
        { texto: 'Tiene forma de pentágono, con cinco baluartes y 642 metros de muralla alrededor.', fuente: 'https://turismorocha.gub.uy/atractivos/historicos/fortaleza-de-santa-teresa' },
      ],
      frases: [
        'Llegaste lejos, gurí. Pero el mar siempre gana.',
        'Esta es la última: el que pierde paga las brótolas.',
        'Si me ganás, te llevás el mazo de la costa. Si no, a remar.',
      ],
      alFinal: {
        ganaste: 'Ganaste en la fortaleza. El mazo de la costa es tuyo, gurí.',
        perdiste: 'Estos muros aguantaron siglos. Uno más no les hace nada.',
      },
    },
  ],
}

/** Los departamentos que ya se pueden jugar. */
export const HISTORIAS: Partial<Record<IdDepartamento, HistoriaDepartamento>> = { rocha: ROCHA, ...HISTORIAS_DEPARTAMENTOS }

export function buscarDepartamento(id: unknown): (typeof DEPARTAMENTOS)[number] | undefined {
  return DEPARTAMENTOS.find((d) => d.id === id)
}

/**
 * Los barrios de un departamento, en orden. Si no tiene, uno solo sin id (`''`) con todos sus
 * niveles, su personaje y su despedida.
 */
export function barriosDe(historia: HistoriaDepartamento): readonly Barrio[] {
  if (historia.barrios) return historia.barrios
  const nombre = buscarDepartamento(historia.departamento)?.nombre ?? historia.departamento
  const donde = historia.niveles[0]?.donde ?? [0, 0]
  return [{ id: '', nombre, jefe: historia.jefe, presentacion: historia.presentacion, donde, niveles: historia.niveles, despedida: historia.despedida }]
}

/** Un barrio de un departamento jugable (`''`, el único de los que no tienen barrios), o undefined. */
export function buscarBarrio(departamento: unknown, barrio: unknown = ''): Barrio | undefined {
  const historia = HISTORIAS[departamento as IdDepartamento]
  return historia && typeof barrio === 'string' ? barriosDe(historia).find((b) => b.id === barrio) : undefined
}

/** El nivel `n` (desde 1) de un barrio de un departamento jugable (sin barrio: el único), o undefined. */
export function nivelDeHistoria(departamento: unknown, n: unknown, barrio: unknown = ''): NivelHistoria | undefined {
  return typeof n === 'number' && Number.isInteger(n) ? buscarBarrio(departamento, barrio)?.niveles[n - 1] : undefined
}

/**
 * Progreso: los niveles ganados (los números, desde 1) por clave (`claveProgreso`): el departamento,
 * o `departamento/barrio` en los que tienen barrios.
 */
export type ProgresoHistoria = Partial<Record<string, number[]>>

/** Dónde se anota un barrio en el progreso: el departamento solo, o `departamento/barrio`. */
export function claveProgreso(departamento: IdDepartamento, barrio = ''): string {
  return barrio ? `${departamento}/${barrio}` : departamento
}

/** Los niveles ganados de un barrio (sin barrio: los del departamento). */
export function ganadosDelBarrio(progreso: ProgresoHistoria, departamento: IdDepartamento, barrio = ''): number[] {
  return progreso[claveProgreso(departamento, barrio)] ?? []
}

/** Si ganaste todos los niveles de un barrio. */
export function barrioCompleto(progreso: ProgresoHistoria, departamento: IdDepartamento, barrio: Barrio): boolean {
  const ganados = ganadosDelBarrio(progreso, departamento, barrio.id)
  return barrio.niveles.length > 0 && barrio.niveles.every((_, i) => ganados.includes(i + 1))
}

/** Un barrio se juega si es el primero del departamento o si completaste el anterior. */
export function barrioAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, barrio = ''): boolean {
  const historia = HISTORIAS[departamento]
  if (!historia) return false
  const barrios = barriosDe(historia)
  const i = barrios.findIndex((b) => b.id === barrio)
  return i === 0 || (i > 0 && barrioCompleto(progreso, departamento, barrios[i - 1]!))
}

/**
 * Dentro de un barrio abierto, un nivel se juega si es el primero o si ya ganaste el anterior (los
 * ganados se repiten).
 */
export function nivelAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, n: number, barrio = ''): boolean {
  return barrioAbierto(progreso, departamento, barrio) && (n === 1 || ganadosDelBarrio(progreso, departamento, barrio).includes(n - 1))
}

/** Cuántos niveles tiene un departamento, sumando sus barrios. */
export function nivelesDelDepartamento(historia: HistoriaDepartamento): number {
  return barriosDe(historia).reduce((s, b) => s + b.niveles.length, 0)
}

/** Cuántos niveles distintos ganaste en un departamento, sumando sus barrios. */
export function nivelesGanados(progreso: ProgresoHistoria, departamento: IdDepartamento): number {
  const historia = HISTORIAS[departamento]
  if (!historia) return 0
  return barriosDe(historia).reduce((s, b) => s + b.niveles.filter((_, i) => ganadosDelBarrio(progreso, departamento, b.id).includes(i + 1)).length, 0)
}

/**
 * Los departamentos que antes de tener barrios se jugaban como una lista de niveles, con cuántos
 * tenían: el que los había ganado todos (lo que queda anotado sin barrio) sigue con los vecinos
 * abiertos.
 */
const RECORRIDOS_ANTERIORES: Partial<Record<IdDepartamento, number>> = { rocha: 5 }

/**
 * Si un departamento ya abre a sus vecinos: con la mitad de sus niveles ganados (o el recorrido de
 * antes de los barrios completo).
 */
export function abreVecinos(progreso: ProgresoHistoria, departamento: IdDepartamento): boolean {
  const historia = HISTORIAS[departamento]
  if (!historia) return false
  const anterior = RECORRIDOS_ANTERIORES[departamento]
  if (historia.barrios && anterior && (progreso[departamento]?.length ?? 0) >= anterior) return true
  const total = nivelesDelDepartamento(historia)
  return total > 0 && nivelesGanados(progreso, departamento) * 2 >= total
}

/**
 * Los departamentos que ya puede jugar cualquiera (los que tienen sus fondos y sus datos); los
 * demás, mientras se arman, solo el admin. Se agregan a medida que quedan prontos.
 */
export const DEPARTAMENTOS_PUBLICADOS: readonly IdDepartamento[] = ['rocha']

/** Donde se arranca el modo historia (cuando esté todo publicado, va a ser Montevideo). */
export const DEPARTAMENTO_INICIAL: IdDepartamento = 'rocha'

export function departamentoPublicado(departamento: IdDepartamento): boolean {
  return DEPARTAMENTOS_PUBLICADOS.includes(departamento)
}

/**
 * Un departamento se abre cuando ganaste la mitad de uno de sus vecinos (el inicial, desde el
 * principio), si ya está publicado. Con `todoAbierto` (el admin), están todos abiertos.
 */
export function departamentoAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, todoAbierto = false): boolean {
  if (todoAbierto) return true
  if (!departamentoPublicado(departamento)) return false
  return departamento === DEPARTAMENTO_INICIAL || VECINOS[departamento].some((v) => abreVecinos(progreso, v))
}

/**
 * Quién se sienta en cada lugar de un nivel, del 1 en adelante (en el 0 estás vos): los impares son
 * del equipo rival (el personaje del departamento en el 1) y los pares, tus compañeros.
 */
export function elencoDelNivel(nivel: NivelHistoria): Personaje[] {
  const n = nivel.formato === '1v1' ? 2 : nivel.formato === '2v2' ? 4 : 6
  const personaje = (id: string | undefined) => PERSONAJES.find((p) => p.id === id)!
  return Array.from({ length: n - 1 }, (_, i) => {
    const a = i + 1
    return personaje(a % 2 === 1 ? nivel.rivales[(a - 1) / 2] : nivel.companieros[a / 2 - 1])
  })
}

/** La mesa del departamento (su paño, que también es la recompensa del último nivel), si ya existe. */
export function mesaDeDepartamento(departamento: IdDepartamento): IdMesa | undefined {
  return MESAS.find((m) => m.id === departamento)?.id
}

/**
 * La baraja del departamento: la que se gana en su último nivel. Todos sus niveles se juegan con
 * ella (como en la mesa del lugar): la vas conociendo y al final te la llevás.
 */
export function barajaDeDepartamento(departamento: IdDepartamento): IdBaraja | undefined {
  const historia = HISTORIAS[departamento]
  const premio = historia && barriosDe(historia).at(-1)?.niveles.at(-1)?.recompensas.find((r) => r.startsWith('baraja:'))
  return BARAJAS.find((b) => `baraja:${b.id}` === premio)?.id
}

/** Cómo se llama una recompensa: la pieza del avatar, "Baraja …", "Mesa …" o "150 monedas". */
export function nombreRecompensa(id: string): string {
  const [tipo, ref] = id.split(':')
  if (tipo === 'monedas') return `${monedasDeRecompensa(id)} monedas`
  if (tipo === 'baraja') return `Baraja ${BARAJAS.find((b) => b.id === ref)?.nombre ?? ref}`
  if (tipo === 'mesa') return `Mesa ${MESAS.find((m) => m.id === ref)?.nombre ?? ref}`
  return buscarItem(id)?.nombre ?? id
}

/**
 * Un turno de la previa: habla un personaje (por su id; `dato` si cuenta algo del lugar) o vos
 * (`quien: null`), que elegís qué decir.
 */
export type TurnoPrevia = { quien: string; texto: string; dato?: true } | { quien: null; opciones: readonly [string, string] }

/** Lo que podés contestar en la previa (uno por nivel, en orden). */
const RESPUESTAS: readonly (readonly [string, string])[] = [
  ['¡Dale nomás, que vengo con hambre!', 'Mmm… ¿y si arrancamos despacito?'],
  ['A mí no me asustás.', 'Uy, me tiembla la mano.'],
  ['Barajá, que hoy te gano.', 'Que gane el mejor.'],
  ['Ya vas a ver lo que es bueno.', 'Tengo fe, tengo fe…'],
  ['¿Mucho hablar, no? Repartí.', 'Bueno, bueno, sin apurarse.'],
]

/**
 * La charla antes de un nivel: el rival principal dice sus frases; en los de equipo, sus
 * compañeros saludan después de la primera y uno de los tuyos te da ánimo; antes de la última,
 * contestás vos. Si el nivel tiene datos del lugar, el rival los cuenta todos juntos después de
 * saludar, antes de que arranque la charla.
 */
export function dialogoDelNivel(nivel: NivelHistoria, n: number): TurnoPrevia[] {
  const saludo = (id: string) => ({ quien: id, texto: PERSONAJES.find((p) => p.id === id)!.saludo })
  const [primera, ...resto] = nivel.frases
  const ultima = resto.pop()
  const jefe = nivel.rivales[0]!
  const datos = (nivel.datos ?? []).map((d) => ({ quien: jefe, texto: d.texto, dato: true as const }))
  return [
    { quien: jefe, texto: primera! },
    ...datos,
    ...nivel.rivales.slice(1).map(saludo),
    ...resto.map((texto) => ({ quien: jefe, texto })),
    { quien: null, opciones: RESPUESTAS[(n - 1) % RESPUESTAS.length]! },
    ...nivel.companieros.slice(0, 1).map(saludo),
    ...(ultima ? [{ quien: jefe, texto: ultima }] : []),
  ]
}

/** Una frase de una escena del modo historia: quién la dice (el id del personaje) y qué. */
export interface TurnoEscena {
  quien: string
  texto: string
}

/** Lo que dice tu compañero al terminar un nivel: si ganaron y si perdieron (uno por nivel, en orden). */
const FESTEJOS = [
  '¡Eso! ¡Qué manera de jugar, compañero!',
  '¡Vamo arriba! ¡Ganamos!',
  'Con esas señas, ¿quién nos para?',
  '¡Ganamos! Esta se cuenta en el boliche.',
  '¡Lo dimos vuelta! Te debo una.',
]
const ANIMOS = [
  'Tranquilo, que la próxima es nuestra.',
  'Perdimos una mano, no la guerra.',
  'Nos faltó suerte. La revancha es nuestra.',
  'Arriba, que esto recién empieza.',
  'Respirá hondo y repartimos de nuevo.',
]

/**
 * La escena al terminar un nivel: el rival dice lo suyo (lo del nivel o, si no tiene, lo de su
 * personaje) y, en los de equipo, uno de tus compañeros festeja o te da ánimo.
 */
export function escenaDelFinal(nivel: NivelHistoria, n: number, ganaste: boolean): TurnoEscena[] {
  const jefe = PERSONAJES.find((p) => p.id === nivel.rivales[0])!
  const companiero = nivel.companieros[0]
  return [
    { quien: jefe.id, texto: nivel.alFinal ? nivel.alFinal[ganaste ? 'ganaste' : 'perdiste'] : jefe[ganaste ? 'siPierde' : 'siGana'] },
    ...(companiero ? [{ quien: companiero, texto: (ganaste ? FESTEJOS : ANIMOS)[(n - 1) % FESTEJOS.length]! }] : []),
  ]
}

/**
 * Los del departamento: los que juegan de rivales en sus niveles, el personaje del departamento
 * primero y después los de cada barrio.
 */
export function elencoDelDepartamento(historia: HistoriaDepartamento): string[] {
  const barrios = barriosDe(historia)
  return [...new Set([historia.jefe, ...barrios.map((b) => b.jefe), ...barrios.flatMap((b) => b.niveles.flatMap((n) => n.rivales))])]
}

/** Los del barrio: los que juegan de rivales en sus niveles, el personaje del barrio primero. */
export function elencoDelBarrio(barrio: Barrio): string[] {
  return [...new Set([barrio.jefe, ...barrio.niveles.flatMap((n) => n.rivales)])]
}

/** Lo que te dicen los demás del departamento cuando te vas (uno cada uno, en orden). */
const ADIOSES = [
  '¡Buen viaje! Volvé cuando quieras.',
  'Andá tranquilo, que el camino es lindo.',
  '¡Que te toquen buenas cartas en la ruta!',
  'Cuidate. ¡Y no te olvides de nosotros!',
]

/**
 * La despedida al completar un departamento: el rival abre con su primera frase, los demás del
 * departamento te desean buen viaje y el rival cierra con el resto.
 */
export function despedidaDelDepartamento(historia: HistoriaDepartamento): TurnoEscena[] {
  return despedida(historia.jefe, historia.despedida, elencoDelDepartamento(historia))
}

/** La despedida al completar un barrio: como la del departamento, con los del barrio. */
export function despedidaDelBarrio(barrio: Barrio): TurnoEscena[] {
  return despedida(barrio.jefe, barrio.despedida, elencoDelBarrio(barrio))
}

function despedida(jefe: string, frases: readonly string[], elenco: readonly string[]): TurnoEscena[] {
  const [primera, ...resto] = frases
  return [
    { quien: jefe, texto: primera! },
    ...elenco
      .filter((quien) => quien !== jefe)
      .map((quien, i) => ({ quien, texto: ADIOSES[i % ADIOSES.length]! })),
    ...resto.map((texto) => ({ quien: jefe, texto })),
  ]
}

/** Todo lo que se gana en un departamento, barrio por barrio y nivel por nivel. */
export function recompensasDelDepartamento(historia: HistoriaDepartamento): string[] {
  return barriosDe(historia).flatMap((b) => b.niveles.flatMap((n) => n.recompensas))
}

/** Si ganaste todos los niveles de un departamento (todos sus barrios). */
export function departamentoCompleto(progreso: ProgresoHistoria, departamento: IdDepartamento): boolean {
  const historia = HISTORIAS[departamento]
  return !!historia && barriosDe(historia).every((b) => barrioCompleto(progreso, departamento, b))
}

/** Cuántos departamentos completaste. */
export function departamentosCompletos(progreso: ProgresoHistoria): number {
  return DEPARTAMENTOS.filter((d) => departamentoCompleto(progreso, d.id)).length
}

/**
 * Dónde seguir: el departamento abierto que empezaste y no terminaste; si no hay, el inicial (donde
 * se arranca); si no, el primero abierto sin terminar. Null si completaste todo lo abierto.
 */
export function departamentoSiguiente(progreso: ProgresoHistoria, todoAbierto = false): IdDepartamento | null {
  const pendientes = DEPARTAMENTOS.filter((d) => departamentoAbierto(progreso, d.id, todoAbierto) && !departamentoCompleto(progreso, d.id))
  const empezado = pendientes.find((d) => nivelesGanados(progreso, d.id) > 0)
  if (empezado) return empezado.id
  if (pendientes.some((d) => d.id === DEPARTAMENTO_INICIAL)) return DEPARTAMENTO_INICIAL
  return pendientes[0]?.id ?? null
}
