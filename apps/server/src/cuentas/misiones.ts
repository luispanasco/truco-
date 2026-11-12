import {
  MISIONES_DE_UNA_VEZ,
  misionesDelDia,
  type DatosMisiones,
  type EstadoMisiones,
  type Mision,
  type MisionDeLista,
} from '@truco/shared'
import type { Base } from './base'
import { inicioDelDia, saldo } from './monedas'

/** Un rechazo al cobrar una misión, con el motivo para mostrar. */
export class MisionRechazo extends Error {}

/**
 * Anota una partida online terminada de una cuenta (para las misiones). `otras` son las demás
 * cuentas de la mesa: si alguna es de uno de sus grupos, la partida cuenta como "con tu grupo".
 */
export async function anotarPartidaJugada(base: Base, cuentaId: string, partida: string, gano: boolean, otras: string[], ahora = new Date()) {
  const [g] = otras.length
    ? await base.consultar<{ si: boolean }>(
        `select exists (
           select 1 from grupo_miembros a join grupo_miembros b on a.grupo_id = b.grupo_id
           where a.cuenta_id = $1 and b.cuenta_id = any($2)
         ) as si`,
        [cuentaId, otras],
      )
    : []
  await base.consultar(
    'insert into partidas_jugadas (cuenta_id, partida, gano, con_grupo, creado) values ($1, $2, $3, $4, $5) on conflict do nothing',
    [cuentaId, partida, gano, g?.si === true, ahora.toISOString()],
  )
}

/** Lo que cuenta cada misión, sacado de la base. */
async function datosDe(base: Base, cuentaId: string, desde: Date): Promise<DatosMisiones> {
  const [p] = await base.consultar<{ total: number; hoy: number; ganadas: number; grupo: number }>(
    `select count(*)::int as total,
            count(*) filter (where creado >= $2)::int as hoy,
            count(*) filter (where creado >= $2 and gano)::int as ganadas,
            count(*) filter (where creado >= $2 and con_grupo)::int as grupo
     from partidas_jugadas where cuenta_id = $1`,
    [cuentaId, desde.toISOString()],
  )
  const niveles = await base.consultar<{ departamento: string; barrio: string; nivel: number }>(
    'select departamento, barrio, nivel from historia where cuenta_id = $1',
    [cuentaId],
  )
  const [a] = await base.consultar<{ n: number }>(
    `select count(*)::int as n from amistades where estado = 'aceptada' and (de = $1 or a = $1)`,
    [cuentaId],
  )
  const [g] = await base.consultar<{ n: number }>('select count(*)::int as n from grupo_miembros where cuenta_id = $1', [cuentaId])
  const [c] = await base.consultar<{ n: number }>(`select count(*)::int as n from movimientos where cuenta_id = $1 and tipo = 'compra'`, [cuentaId])
  return {
    partidas: p?.total ?? 0,
    partidasHoy: p?.hoy ?? 0,
    ganadasHoy: p?.ganadas ?? 0,
    conGrupoHoy: p?.grupo ?? 0,
    nivelesHistoria: niveles,
    amigos: a?.n ?? 0,
    grupos: g?.n ?? 0,
    compras: c?.n ?? 0,
  }
}

/** El día (en hora de Uruguay) como texto, para el sorteo y para el cobro de las del día. */
const textoDia = (desde: Date) => new Date(desde.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

/** La "partida" del movimiento de cada cobro: así el índice único no deja cobrar dos veces. */
const claveDeUnaVez = (id: string) => `mision:${id}`
const claveDelDia = (id: string, dia: string) => `mision:${id}:${dia}`

/**
 * Las misiones de una cuenta: las de una vez que todavía no cobró (las cobradas ya no se muestran)
 * y las tres del día, con su avance y si ya las cobró.
 */
export async function misiones(base: Base, cuentaId: string, ahora = new Date()): Promise<EstadoMisiones> {
  const desde = inicioDelDia(ahora)
  const dia = textoDia(desde)
  const datos = await datosDe(base, cuentaId, desde)
  const cobros = new Set(
    (await base.consultar<{ partida: string }>(`select partida from movimientos where cuenta_id = $1 and tipo = 'mision'`, [cuentaId])).map((m) => m.partida),
  )
  const lista = (m: Mision & { avance: (d: DatosMisiones) => number }, clave: string): MisionDeLista => ({
    id: m.id,
    texto: m.texto,
    meta: m.meta,
    premio: m.premio,
    ir: m.ir,
    avance: Math.min(m.avance(datos), m.meta),
    cobrada: cobros.has(clave),
  })
  return {
    deUnaVez: MISIONES_DE_UNA_VEZ.filter((m) => !cobros.has(claveDeUnaVez(m.id))).map((m) => lista(m, claveDeUnaVez(m.id))),
    delDia: misionesDelDia(dia, cuentaId, datos.grupos > 0).map((m) => lista(m, claveDelDia(m.id, dia))),
    cambian: new Date(desde.getTime() + 86_400_000).toISOString(),
  }
}

/** Cobra una misión cumplida: suma su premio al saldo, una sola vez (por día, las del día). */
export async function cobrarMision(base: Base, cuentaId: string, id: unknown, ahora = new Date()): Promise<{ misiones: EstadoMisiones; saldo: number; premio: number }> {
  if (typeof id !== 'string') throw new MisionRechazo('Esa misión no existe')
  return base.transaccion(async (b) => {
    await b.consultar('select id from cuentas where id = $1 for update', [cuentaId])
    const estado = await misiones(b, cuentaId, ahora)
    const dia = textoDia(inicioDelDia(ahora))
    const deUnaVez = estado.deUnaVez.find((m) => m.id === id)
    const delDia = estado.delDia.find((m) => m.id === id)
    const m = deUnaVez ?? delDia
    if (!m) throw new MisionRechazo('Esa misión no está entre las tuyas')
    if (m.cobrada) throw new MisionRechazo('Ya la cobraste')
    if (m.avance < m.meta) throw new MisionRechazo('Todavía no la cumpliste')
    const clave = deUnaVez ? claveDeUnaVez(m.id) : claveDelDia(m.id, dia)
    await b.consultar(`insert into movimientos (cuenta_id, monto, tipo, partida, creado) values ($1, $2, 'mision', $3, $4)`, [
      cuentaId,
      m.premio,
      clave,
      ahora.toISOString(),
    ])
    return { misiones: await misiones(b, cuentaId, ahora), saldo: await saldo(b, cuentaId), premio: m.premio }
  })
}
