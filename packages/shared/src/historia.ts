/**
 * Modo historia: se recorre Uruguay por departamento. Cada departamento es independiente (no hay
 * pasaje entre ellos), tiene un personaje que es el rival en todos sus niveles y entre 3 y 5
 * niveles según su tamaño, cada uno más difícil. Cada nivel tiene su formato (1v1, 2v2 o 3v3), su
 * dificultad, sus recompensas fijas y lo que dice el rival antes de empezar.
 *
 * Mientras se arma, lo ve solo el admin. Por ahora se juega Rocha.
 */

import type { Formato } from '@truco/engine'
import type { Nivel } from '@truco/bots'
import { buscarItem, idBaraja, idMesa, idPieza } from './tienda'
import { PERSONAJES, piezaPorNombre, type Personaje } from './personajes'
import { BARAJAS } from './barajas'
import { MESAS, type IdMesa } from './mesas'
import type { CapaAvatar } from './avatar'

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
  formato: Formato
  nivelBots: Nivel
  puntos: 15 | 30
  /** Los personajes rivales: el primero es el del departamento. */
  rivales: readonly string[]
  /** Tus compañeros (bots), en 2v2 y 3v3. */
  companieros: readonly string[]
  /** Ids de la tienda (`avatar:…`, `mesa:…`, `baraja:…`) que se ganan la primera vez. */
  recompensas: readonly string[]
  /** Lo que dice el rival antes de empezar, una frase por globo. */
  frases: readonly string[]
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
      formato: '1v1',
      nivelBots: 'facil',
      puntos: 15,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [pieza('sombrero', 'Gorro de pescador')],
      frases: [
        '¡Epa! ¿Vos sos el gurí que vino de la capital?',
        'Acá el truco se juega con olor a pescado y viento del este.',
        'Sentate, que la red no se remienda sola… ni el truco se gana solo.',
      ],
    },
    {
      lugar: 'La Paloma',
      formato: '2v2',
      nivelBots: 'medio',
      puntos: 15,
      rivales: ['pescador', 'surfista'],
      companieros: ['hincha'],
      recompensas: [pieza('ropa', 'Impermeable amarillo')],
      frases: [
        'Te traje a Nico, que vino surfeando desde La Paloma.',
        'Dice que lee las cartas como lee las olas. Yo no le creo nada.',
        '¿Trajiste compañero? Mejor: así pierden de a dos.',
      ],
    },
    {
      lugar: 'La Pedrera',
      formato: '1v1',
      nivelBots: 'dificil',
      puntos: 30,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [pieza('accesorio', 'Caña de pescar')],
      frases: [
        'Ayer saqué una corvina de cuarenta kilos. Bueno… de cuatro.',
        'Ahora va en serio: a treinta, mano a mano.',
        'Si me cantás flor, te contesto con la red.',
      ],
    },
    {
      lugar: 'Cabo Polonio',
      formato: '3v3',
      nivelBots: 'muyDificil',
      puntos: 30,
      rivales: ['pescador', 'surfista', 'hippie'],
      companieros: ['hincha', 'dona'],
      recompensas: [pieza('accesorio', 'Tabla de surf')],
      frases: [
        'Se vino Luna desde Cabo Polonio, a la luz del faro.',
        'Tres contra tres, como en la barra del boliche.',
        'Acá no hay luz eléctrica, pero señas hay de sobra.',
      ],
    },
    {
      lugar: 'El faro de Punta del Diablo',
      formato: '1v1',
      nivelBots: 'master',
      puntos: 30,
      rivales: ['pescador'],
      companieros: [],
      recompensas: [idBaraja('costa'), idMesa('rocha')],
      frases: [
        'Llegaste lejos, gurí. Pero el mar siempre gana.',
        'Esta es la última: el que pierde paga las brótolas.',
        'Si me ganás, te llevás el mazo de la costa. Si no, a remar.',
      ],
    },
  ],
}

/** Los departamentos que ya se pueden jugar. */
export const HISTORIAS: Partial<Record<IdDepartamento, HistoriaDepartamento>> = { rocha: ROCHA }

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

/** Un nivel se puede jugar si es el primero o si ya ganaste el anterior (los ganados se repiten). */
export function nivelAbierto(progreso: ProgresoHistoria, departamento: IdDepartamento, n: number): boolean {
  return n === 1 || (progreso[departamento] ?? []).includes(n - 1)
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

/** Cómo se llama una recompensa: la pieza del avatar, "Baraja …" o "Mesa …". */
export function nombreRecompensa(id: string): string {
  const [tipo, ref] = id.split(':')
  if (tipo === 'baraja') return `Baraja ${BARAJAS.find((b) => b.id === ref)?.nombre ?? ref}`
  if (tipo === 'mesa') return `Mesa ${MESAS.find((m) => m.id === ref)?.nombre ?? ref}`
  return buscarItem(id)?.nombre ?? id
}
