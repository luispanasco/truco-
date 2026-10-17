import type { Formato } from '@truco/engine'
import type { Base } from './base'

/** Con cuánto se arranca, y cuánto se mueve por partida (más en las primeras, que ubican rápido). */
export const ELO = { inicial: 1200, kNuevo: 40, k: 24, partidasNuevo: 20, minimoRanking: 5 }

export interface CambioElo {
  cuentaId: string
  antes: number
  despues: number
}

/**
 * Lo que espera ganar un equipo (de 0 a 1) contra otro: cada equipo vale el promedio de los
 * suyos, como en un uno contra uno.
 */
export function esperado(nuestro: number, suyo: number): number {
  return 1 / (1 + 10 ** ((suyo - nuestro) / 400))
}

/**
 * Actualiza el Elo de una partida entre personas con cuenta. `equipos[e]` son las cuentas del
 * equipo e (también las de quien abandonó: pierde con su equipo). La partida se cuenta una sola vez.
 */
export async function actualizarElo(
  base: Base,
  partida: string,
  formato: Formato,
  equipos: [string[], string[]],
  ganador: 0 | 1,
): Promise<CambioElo[]> {
  return base.transaccion(async (b) => {
    const todos = [...equipos[0], ...equipos[1]]
    const ya = await b.consultar('select 1 from elo_partidas where partida = $1 limit 1', [partida])
    if (ya.length > 0 || equipos[0].length === 0 || equipos[1].length === 0) return []
    for (const id of todos) {
      await b.consultar('insert into elo (cuenta_id, formato, puntos) values ($1, $2, $3) on conflict do nothing', [id, formato, ELO.inicial])
    }
    const filas = await b.consultar<{ cuenta_id: string; puntos: number; partidas: number }>(
      'select cuenta_id, puntos, partidas from elo where formato = $1 and cuenta_id = any($2::uuid[]) for update',
      [formato, todos],
    )
    const de = new Map(filas.map((f) => [f.cuenta_id, f]))
    const promedio = (ids: string[]) => ids.reduce((s, id) => s + de.get(id)!.puntos, 0) / ids.length
    const medias = [promedio(equipos[0]), promedio(equipos[1])] as const
    const cambios: CambioElo[] = []
    for (const e of [0, 1] as const) {
      const resultado = e === ganador ? 1 : 0
      const esp = esperado(medias[e], medias[1 - e]!)
      for (const id of equipos[e]) {
        const f = de.get(id)!
        const k = f.partidas < ELO.partidasNuevo ? ELO.kNuevo : ELO.k
        const despues = Math.max(100, Math.round(f.puntos + k * (resultado - esp)))
        cambios.push({ cuentaId: id, antes: f.puntos, despues })
        await b.consultar(
          'update elo set puntos = $3, partidas = partidas + 1, ganadas = ganadas + $4, actualizada = now() where cuenta_id = $1 and formato = $2',
          [id, formato, despues, resultado],
        )
        await b.consultar('insert into elo_partidas (cuenta_id, partida, formato, antes, despues) values ($1, $2, $3, $4, $5)', [
          id,
          partida,
          formato,
          f.puntos,
          despues,
        ])
      }
    }
    return cambios
  })
}

export interface FilaRanking {
  posicion: number
  cuentaId: string
  apodo: string
  avatar: string | null
  puntos: number
  partidas: number
  ganadas: number
}

/** Los mejores del formato (con un mínimo de partidas jugadas), y dónde estás vos. */
export async function ranking(base: Base, formato: Formato, cuentaId: string | null, cuantos = 50) {
  const filas = await base.consultar<FilaRanking>(
    `select (rank() over (order by e.puntos desc))::int as posicion, e.cuenta_id as "cuentaId", c.apodo, c.avatar,
            e.puntos, e.partidas, e.ganadas
     from elo e join cuentas c on c.id = e.cuenta_id
     where e.formato = $1 and e.partidas >= $2
     order by e.puntos desc, e.partidas desc
     limit $3`,
    [formato, ELO.minimoRanking, cuantos],
  )
  let yo: (FilaRanking & { enRanking: boolean }) | null = null
  if (cuentaId) {
    const [f] = await base.consultar<FilaRanking>(
      `select (select count(*) from elo o where o.formato = e.formato and o.partidas >= $3 and o.puntos > e.puntos)::int + 1 as posicion,
              e.cuenta_id as "cuentaId", c.apodo, c.avatar, e.puntos, e.partidas, e.ganadas
       from elo e join cuentas c on c.id = e.cuenta_id
       where e.formato = $1 and e.cuenta_id = $2`,
      [formato, cuentaId, ELO.minimoRanking],
    )
    if (f) yo = { ...f, enRanking: f.partidas >= ELO.minimoRanking }
  }
  return { formato, minimo: ELO.minimoRanking, filas, yo }
}
