/**
 * "Aprendé a jugar": el tutorial para los que no saben. Lo da Don Queiroz, un maestro de boliche
 * (en homenaje al padrino que le enseñó a jugar al autor). Son lecciones en fila: cada una se abre
 * al terminar la anterior y deja de 1 a 3 estrellas según los errores en los ejercicios.
 */

import { AVATAR_BASE, type Avatar, type CapaAvatar } from './avatar'
import { piezaPorNombre } from './personajes'
import { idPieza } from './tienda'

/** Don Queiroz: canoso, de bigote, el pelo largo para atrás con raya al medio. */
export const MAESTRO = {
  id: 'queiroz',
  nombre: 'Don Queiroz',
  titulo: 'el Maestro',
  avatar: (() => {
    const piezas: Partial<Record<CapaAvatar, string>> = {
      piel: 'Piel clara',
      cabeza: 'Cara cuadrada',
      pelo: 'Raya y ondas',
      colorPelo: 'Canoso',
      cejas: 'Cejas suaves',
      ojos: 'Ojos tranquilos',
      nariz: 'Nariz recta',
      boca: 'Sonrisa tranquila',
      barba: 'Bigote gaucho',
      ropa: 'Remera azul',
    }
    const a: Avatar = { ...AVATAR_BASE }
    for (const [capa, nombre] of Object.entries(piezas) as [CapaAvatar, string][]) a[capa] = piezaPorNombre(capa, nombre)
    return a
  })(),
} as const

export type IdLeccion = 'historia' | 'baraja' | 'jerarquia' | 'piezas' | 'vueltas' | 'envido' | 'flor' | 'cantos' | 'envidoEnJuego' | 'equipos' | 'examen'

export interface Leccion {
  id: IdLeccion
  titulo: string
  /** Lo que se aprende, en una línea (va en la ruta). */
  resumen: string
  /** Si ya está hecha; las otras dicen "Próximamente". */
  disponible: boolean
}

/** La ruta, en orden: cada una se abre al terminar la anterior. */
export const LECCIONES: readonly Leccion[] = [
  { id: 'historia', titulo: 'Un poco de historia', resumen: 'De dónde viene el truco', disponible: true },
  { id: 'baraja', titulo: 'La baraja', resumen: 'Los palos y las 40 cartas', disponible: true },
  { id: 'jerarquia', titulo: 'Qué carta mata a cuál', resumen: 'Las matas, los tres, las negras…', disponible: true },
  { id: 'piezas', titulo: 'La muestra y las piezas', resumen: 'Lo que hace único al truco uruguayo', disponible: true },
  { id: 'vueltas', titulo: 'Las vueltas', resumen: 'Tres vueltas, la parda y el mano', disponible: true },
  { id: 'envido', titulo: 'El envido', resumen: 'Cómo se cuenta, con y sin piezas', disponible: true },
  { id: 'flor', titulo: 'La flor', resumen: 'Tres del mismo palo… o con piezas', disponible: true },
  { id: 'cantos', titulo: 'Truco, retruco y vale cuatro', resumen: 'Querer, no querer y cuánto vale', disponible: true },
  { id: 'envidoEnJuego', titulo: 'El envido en juego', resumen: 'Envido, real envido y falta', disponible: true },
  { id: 'equipos', titulo: 'En equipo', resumen: 'Las señas y el pie', disponible: true },
  { id: 'examen', titulo: 'El examen', resumen: 'Una partida con Don Queiroz mirando', disponible: true },
]

/** Las estrellas de un ejercicio: 3 sin errores, 2 con uno o dos, 1 con más. */
export function estrellasPorErrores(errores: number): 1 | 2 | 3 {
  return errores === 0 ? 3 : errores <= 2 ? 2 : 1
}

/** Lo hecho en el tutorial: las estrellas de cada lección terminada. */
export type ProgresoTutorial = Partial<Record<IdLeccion, 1 | 2 | 3>>

/** Si la lección se puede hacer: está hecha y la anterior está terminada (la primera, siempre). */
export function leccionAbierta(progreso: ProgresoTutorial, id: IdLeccion): boolean {
  const i = LECCIONES.findIndex((l) => l.id === id)
  if (i < 0 || !LECCIONES[i]!.disponible) return false
  return i === 0 || progreso[LECCIONES[i - 1]!.id] !== undefined
}

/** La próxima lección para hacer (abierta y sin terminar), o null si no queda ninguna abierta. */
export function proximaLeccion(progreso: ProgresoTutorial): Leccion | null {
  return LECCIONES.find((l) => leccionAbierta(progreso, l.id) && progreso[l.id] === undefined) ?? null
}

/**
 * Al recibirte (ganar el examen): monedas y los Naipes para el avatar, que no se venden. Lo cobra
 * la misión de una vez `recibirse` (el servidor confía en que ganaste, como en el modo historia).
 */
export const DONDE_DIPLOMA = 'Aprendé a jugar'
export const MONEDAS_DIPLOMA = 300
export const PREMIO_DIPLOMA = idPieza('accesorio', piezaPorNombre('accesorio', 'Naipes'))
