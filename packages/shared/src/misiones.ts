/**
 * Las misiones: cosas para hacer que dan monedas y que van mostrando todo lo que tiene la app.
 * Las "de una vez" se cobran una sola vez por cuenta; las del día son tres, cambian cada día (a
 * medianoche de Uruguay) y se pueden cobrar una vez por día. Solo cuentan lo que el servidor puede
 * comprobar (las partidas contra la compu corren en el navegador y se podrían inventar).
 */

import { MONEDAS_DIPLOMA } from './tutorial'

/** A qué pantalla lleva "Ir" en cada misión. */
export type DestinoMision = 'jugar' | 'historia' | 'amigos' | 'grupos' | 'tienda' | 'aprender'

export interface Mision {
  id: string
  texto: string
  /** Cuántas veces hay que hacerlo (por ejemplo, 2 partidas). */
  meta: number
  premio: number
  ir: DestinoMision
}

/** Lo que el servidor cuenta para saber el avance de cada misión. */
export interface DatosMisiones {
  /** Partidas online terminadas: en total y hoy. */
  partidas: number
  partidasHoy: number
  ganadasHoy: number
  /** Partidas de hoy en las que jugó alguien de uno de tus grupos (con su cuenta). */
  conGrupoHoy: number
  nivelesHistoria: { departamento: string; nivel: number }[]
  amigos: number
  grupos: number
  compras: number
}

export interface MisionDeLista extends Mision {
  avance: number
  cobrada: boolean
}

export const MISIONES_DE_UNA_VEZ: readonly (Mision & { avance: (d: DatosMisiones) => number })[] = [
  { id: 'primera-online', texto: 'Jugá tu primera partida online', meta: 1, premio: 100, ir: 'jugar', avance: (d) => d.partidas },
  {
    id: 'rocha-1',
    texto: 'Ganá el nivel 1 de Rocha en el modo historia',
    meta: 1,
    premio: 100,
    ir: 'historia',
    avance: (d) => (d.nivelesHistoria.some((n) => n.departamento === 'rocha' && n.nivel === 1) ? 1 : 0),
  },
  { id: 'un-amigo', texto: 'Sumá un amigo', meta: 1, premio: 100, ir: 'amigos', avance: (d) => d.amigos },
  { id: 'un-grupo', texto: 'Entrá a un grupo (o armá el tuyo)', meta: 1, premio: 100, ir: 'grupos', avance: (d) => d.grupos },
  { id: 'primera-compra', texto: 'Comprá algo en la tienda', meta: 1, premio: 100, ir: 'tienda', avance: (d) => d.compras },
  // Se cobra sola al recibirte en el tutorial (POST /tutorial/recibirse, con los Naipes): acá solo invita.
  { id: 'recibirse', texto: 'Recibite con Don Queiroz en "Aprendé a jugar"', meta: 1, premio: MONEDAS_DIPLOMA, ir: 'aprender', avance: () => 0 },
]

/** Las del día salen de acá: tres por día. La del grupo, solo si estás en uno. */
export const MISIONES_DEL_DIA: readonly (Mision & { avance: (d: DatosMisiones) => number; soloConGrupo?: true })[] = [
  { id: 'dos-online', texto: 'Jugá 2 partidas online', meta: 2, premio: 50, ir: 'jugar', avance: (d) => d.partidasHoy },
  { id: 'tres-online', texto: 'Jugá 3 partidas online', meta: 3, premio: 75, ir: 'jugar', avance: (d) => d.partidasHoy },
  { id: 'ganar-online', texto: 'Ganá una partida online', meta: 1, premio: 75, ir: 'jugar', avance: (d) => d.ganadasHoy },
  { id: 'ganar-dos', texto: 'Ganá 2 partidas online', meta: 2, premio: 100, ir: 'jugar', avance: (d) => d.ganadasHoy },
  {
    id: 'con-grupo',
    texto: 'Jugá una partida con alguien de tu grupo',
    meta: 1,
    premio: 100,
    ir: 'grupos',
    avance: (d) => d.conGrupoHoy,
    soloConGrupo: true,
  },
]

/** Cuántas misiones del día hay. */
export const MISIONES_POR_DIA = 3

/** Un número a partir de un texto (para que el sorteo del día sea siempre el mismo). */
function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Las tres del día de una cuenta: un sorteo que depende del día y de la cuenta (así no todos
 * tienen las mismas), sin repetir. La del grupo entra solo si estás en un grupo. Nunca salen
 * juntas dos que miden lo mismo con distinta meta (2 y 3 partidas, o 1 y 2 ganadas).
 */
export function misionesDelDia(dia: string, cuentaId: string, conGrupo: boolean): (typeof MISIONES_DEL_DIA)[number][] {
  const pozo = MISIONES_DEL_DIA.filter((m) => conGrupo || !m.soloConGrupo)
  const familia = (id: string) => (id.endsWith('-online') ? 'partidas' : id.startsWith('ganar') ? 'ganadas' : id)
  const orden = [...pozo].sort((a, b) => hash(`${dia}:${cuentaId}:${a.id}`) - hash(`${dia}:${cuentaId}:${b.id}`))
  const elegidas: (typeof MISIONES_DEL_DIA)[number][] = []
  for (const m of orden) {
    if (elegidas.length >= MISIONES_POR_DIA) break
    if (elegidas.some((e) => familia(e.id) === familia(m.id))) continue
    elegidas.push(m)
  }
  // Si con eso no llegan a tres (sin grupo hay solo dos familias), se completa con las que quedan.
  for (const m of orden) if (elegidas.length < MISIONES_POR_DIA && !elegidas.includes(m)) elegidas.push(m)
  return elegidas
}

/** Lo que manda el servidor: las de una vez que faltan cobrar y las del día, con su avance. */
export interface EstadoMisiones {
  deUnaVez: MisionDeLista[]
  delDia: MisionDeLista[]
  /** Cuándo cambian las del día (ISO). */
  cambian: string
}

/** Si una misión está lista para cobrar. */
export const paraCobrar = (m: MisionDeLista) => !m.cobrada && m.avance >= m.meta
