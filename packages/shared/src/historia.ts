/**
 * Modo historia: se recorre Uruguay por departamento. Cada departamento es independiente (no hay
 * pasaje entre ellos), tiene un personaje que es el rival en todos sus niveles y entre 3 y 5
 * niveles según su tamaño, cada uno más difícil. Cada nivel tiene su formato (1v1, 2v2 o 3v3), su
 * dificultad, sus recompensas fijas y lo que dice el rival antes de empezar.
 *
 * Mientras se arma, lo ve solo el admin. Rocha está acá (fue el primero); los demás, en historias.ts.
 */

import type { Formato } from '@truco/engine'
import type { Nivel } from '@truco/bots'
import { buscarItem, idBaraja, idMesa, idPieza } from './tienda'
import { PERSONAJES, piezaPorNombre, type Personaje } from './personajes'
import { BARAJAS } from './barajas'
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
  puntos: 15 | 30
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
}

export interface HistoriaDepartamento {
  departamento: IdDepartamento
  /** El personaje del departamento: el rival de todos sus niveles. */
  jefe: string
  presentacion: string
  niveles: readonly NivelHistoria[]
}

const pieza = (capa: CapaAvatar, nombre: string) => idPieza(capa, piezaPorNombre(capa, nombre))

const ROCHA: HistoriaDepartamento = {
  departamento: 'rocha',
  jefe: 'pescador',
  presentacion: 'Costa, faros y lobos marinos. Julio te espera en Punta del Diablo, con la red remendada y el mazo bajo el brazo.',
  niveles: [
    {
      lugar: 'Punta del Diablo',
      donde: [-34.045, -53.545],
      resumen: 'Pueblo de pescadores artesanales sobre el Atlántico, cerca de la frontera con Brasil.',
      formato: '1v1',
      nivelBots: 'facil',
      puntos: 15,
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
    },
    {
      lugar: 'La Paloma',
      donde: [-34.66, -54.16],
      resumen: 'Balneario de olas y surf, con el faro del cabo Santa María.',
      formato: '2v2',
      nivelBots: 'medio',
      puntos: 15,
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
    },
  ],
}

/** Los departamentos que ya se pueden jugar. */
export const HISTORIAS: Partial<Record<IdDepartamento, HistoriaDepartamento>> = { rocha: ROCHA, ...HISTORIAS_DEPARTAMENTOS }

export function buscarDepartamento(id: unknown): (typeof DEPARTAMENTOS)[number] | undefined {
  return DEPARTAMENTOS.find((d) => d.id === id)
}

/** El nivel `n` (desde 1) de un departamento jugable, o undefined. */
export function nivelDeHistoria(departamento: unknown, n: unknown): NivelHistoria | undefined {
  const historia = HISTORIAS[departamento as IdDepartamento]
  return typeof n === 'number' && Number.isInteger(n) ? historia?.niveles[n - 1] : undefined
}

/** Progreso: los niveles ganados de cada departamento (los números, desde 1). */
export type ProgresoHistoria = Partial<Record<IdDepartamento, number[]>>

/** Dentro de un departamento, un nivel se juega si es el primero o si ya ganaste el anterior (los ganados se repiten). */
export function nivelAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, n: number): boolean {
  return n === 1 || (progreso[departamento] ?? []).includes(n - 1)
}

/** Donde se arranca el modo historia. */
export const DEPARTAMENTO_INICIAL: IdDepartamento = 'montevideo'

/**
 * Un departamento se abre cuando completás uno de sus vecinos (Montevideo, desde el principio).
 * Con `todoAbierto` (el admin), están todos abiertos.
 */
export function departamentoAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, todoAbierto = false): boolean {
  return todoAbierto || departamento === DEPARTAMENTO_INICIAL || VECINOS[departamento].some((v) => departamentoCompleto(progreso, v))
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

/** Si ganaste todos los niveles de un departamento. */
export function departamentoCompleto(progreso: ProgresoHistoria, departamento: IdDepartamento): boolean {
  const niveles = HISTORIAS[departamento]?.niveles.length ?? 0
  return niveles > 0 && (progreso[departamento]?.length ?? 0) >= niveles
}

/** Cuántos departamentos completaste. */
export function departamentosCompletos(progreso: ProgresoHistoria): number {
  return DEPARTAMENTOS.filter((d) => departamentoCompleto(progreso, d.id)).length
}

/**
 * Dónde seguir: el departamento abierto que empezaste y no terminaste; si no hay, Montevideo (donde
 * se arranca); si no, el primero abierto sin terminar. Null si completaste todo.
 */
export function departamentoSiguiente(progreso: ProgresoHistoria, todoAbierto = false): IdDepartamento | null {
  const pendientes = DEPARTAMENTOS.filter((d) => departamentoAbierto(progreso, d.id, todoAbierto) && !departamentoCompleto(progreso, d.id))
  const empezado = pendientes.find((d) => (progreso[d.id]?.length ?? 0) > 0)
  if (empezado) return empezado.id
  if (pendientes.some((d) => d.id === DEPARTAMENTO_INICIAL)) return DEPARTAMENTO_INICIAL
  return pendientes[0]?.id ?? null
}
