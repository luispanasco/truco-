import { randomUUID } from 'node:crypto'
import {
  LARGO_MURO,
  PUEDE,
  VIGENCIA_INVITACION_MS,
  type ConvocanGrupo,
  type EntradaMuro,
  type FilaRankingGrupo,
  type JugadorMuro,
  type MuroGrupo,
  type RepeticionPartida,
  type RolGrupo,
} from '@truco/shared'
import type { Base } from './base'
import { GruposRechazo } from './grupos'
import type { RegistroPartida } from '../registro'
import { esCodigoValido } from '../codigos'

/**
 * El muro de cada grupo: las invitaciones a salas que mandan los miembros y los resultados de las
 * partidas jugadas entre miembros, con su repetición. Lo ven solo los del grupo.
 */

const NO_EXISTE = () => new GruposRechazo('Ese grupo no existe', 404)
const esUuid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
const FORMATOS = ['1v1', '2v2', '3v3'] as const

async function miembro(b: Base, yo: string, grupo: unknown): Promise<{ rol: RolGrupo; convocan: ConvocanGrupo }> {
  if (!esUuid(grupo)) throw NO_EXISTE()
  const [f] = await b.consultar<{ rol: RolGrupo; convocan: ConvocanGrupo }>(
    'select m.rol, g.convocan from grupo_miembros m join grupos g on g.id = m.grupo_id where m.grupo_id = $1 and m.cuenta_id = $2',
    [grupo, yo],
  )
  if (!f) throw NO_EXISTE()
  return f
}

/** Las últimas entradas del muro (las invitaciones vencidas no) y cómo le va a cada miembro. */
export async function muroDeGrupo(base: Base, yo: string, grupo: unknown): Promise<MuroGrupo> {
  await miembro(base, yo, grupo)
  const filas = await base.consultar<{ id: number; tipo: EntradaMuro['tipo']; creado: string; datos: unknown; autor_id: string | null; apodo: string | null; avatar: string | null }>(
    `select e.id::int as id, e.tipo, e.creado, e.datos, c.id as autor_id, c.apodo, c.avatar
     from grupo_muro e left join cuentas c on c.id = e.autor
     where e.grupo_id = $1 and (e.tipo <> 'invitacion' or e.creado > $2)
     order by e.id desc limit $3`,
    [grupo, new Date(Date.now() - VIGENCIA_INVITACION_MS).toISOString(), LARGO_MURO],
  )
  const entradas = filas.map((f) => {
    const creado = new Date(f.creado).toISOString()
    return f.tipo === 'invitacion'
      ? ({ id: f.id, tipo: 'invitacion', creado, autor: { id: f.autor_id!, apodo: f.apodo!, avatar: f.avatar }, datos: f.datos } as EntradaMuro)
      : ({ id: f.id, tipo: 'resultado', creado, datos: f.datos } as EntradaMuro)
  })
  return { entradas, ranking: await rankingDeGrupo(base, grupo as string) }
}

/** Cuántas jugó y cuántas ganó cada miembro, en las partidas del muro. */
async function rankingDeGrupo(base: Base, grupo: string): Promise<FilaRankingGrupo[]> {
  const resultados = await base.consultar<{ datos: Extract<EntradaMuro, { tipo: 'resultado' }>['datos'] }>(
    `select datos from grupo_muro where grupo_id = $1 and tipo = 'resultado'`,
    [grupo],
  )
  const cuenta = new Map<string, { jugadas: number; ganadas: number }>()
  for (const { datos } of resultados) {
    datos.equipos.forEach((equipo, e) => {
      for (const j of equipo) {
        if (!j.cuentaId) continue
        const c = cuenta.get(j.cuentaId) ?? { jugadas: 0, ganadas: 0 }
        c.jugadas++
        if (datos.ganador === e) c.ganadas++
        cuenta.set(j.cuentaId, c)
      }
    })
  }
  if (cuenta.size === 0) return []
  const miembros = await base.consultar<{ id: string; apodo: string; avatar: string | null }>(
    `select c.id, c.apodo, c.avatar from grupo_miembros m join cuentas c on c.id = m.cuenta_id where m.grupo_id = $1`,
    [grupo],
  )
  return miembros
    .filter((m) => cuenta.has(m.id))
    .map((m) => ({ cuentaId: m.id, apodo: m.apodo, avatar: m.avatar, ...cuenta.get(m.id)! }))
    .sort((a, b) => b.ganadas - a.ganadas || a.jugadas - b.jugadas || a.apodo.localeCompare(b.apodo))
}

/**
 * Mandar al grupo la sala que armaste: aparece en el muro para que se sumen con el código. Lo puede
 * hacer quien puede armar partidas en el grupo. Una nueva de la misma sala reemplaza a la anterior.
 */
export async function invitarAlGrupo(base: Base, yo: string, grupo: unknown, datos: Record<string, unknown>): Promise<{ ok: true }> {
  const m = await miembro(base, yo, grupo)
  if (!PUEDE.convocar(m.rol, m.convocan)) throw new GruposRechazo('En este grupo mandan partidas el líder y los capitanes')
  const codigo = typeof datos.codigo === 'string' ? datos.codigo.trim().toUpperCase() : ''
  if (!esCodigoValido(codigo)) throw new GruposRechazo('Esa sala no existe')
  const formato = FORMATOS.find((f) => f === datos.formato)
  if (!formato) throw new GruposRechazo('Formato inválido')
  const puntos = [20, 30, 40].includes(datos.puntos as number) ? (datos.puntos as number) : 30
  await base.transaccion(async (b) => {
    await b.consultar(`delete from grupo_muro where grupo_id = $1 and tipo = 'invitacion' and datos->>'codigo' = $2`, [grupo, codigo])
    await b.consultar(`insert into grupo_muro (grupo_id, tipo, autor, datos) values ($1, 'invitacion', $2, $3)`, [grupo, yo, JSON.stringify({ codigo, formato, puntos })])
  })
  return { ok: true }
}

/**
 * Terminó una partida online: si jugaron dos o más miembros de un mismo grupo (con su cuenta), el
 * resultado va al muro de ese grupo, con la repetición (que se guarda una sola vez).
 */
export async function anotarEnGrupos(base: Base, r: RegistroPartida): Promise<number> {
  if (!r.resultado || 'abandonada' in r.resultado) return 0
  const cuentas = [...new Set(r.jugadores.flatMap((j) => (j.tipo === 'humano' && j.cuentaId ? [j.cuentaId] : [])))]
  if (cuentas.length < 2) return 0
  const grupos = await base.consultar<{ grupo_id: string }>(
    'select grupo_id from grupo_miembros where cuenta_id = any($1) group by grupo_id having count(*) >= 2',
    [cuentas],
  )
  if (grupos.length === 0) return 0
  const repeticion: RepeticionPartida = {
    fecha: r.inicio,
    semilla: r.semilla,
    reparte: r.reparte,
    config: r.config,
    jugadores: r.jugadores.map((j) => ({ asiento: j.asiento, apodo: j.apodo, bot: j.tipo === 'bot' })),
    acciones: r.acciones.map((a) => ({ asiento: a.asiento, accion: a.accion })),
    resultado: r.resultado,
  }
  const id = randomUUID()
  const equipos: [JugadorMuro[], JugadorMuro[]] = [[], []]
  for (const j of [...r.jugadores].sort((a, b) => a.asiento - b.asiento)) {
    equipos[(j.asiento % 2) as 0 | 1].push({ apodo: j.apodo, cuentaId: j.tipo === 'humano' ? (j.cuentaId ?? null) : null })
  }
  const datos = {
    formato: r.config.formato,
    puntosPartida: r.config.puntosPartida,
    puntos: r.resultado.puntos,
    ganador: r.resultado.ganador,
    equipos,
    repeticion: id,
  }
  await base.transaccion(async (b) => {
    await b.consultar('insert into repeticiones (id, datos) values ($1, $2)', [id, JSON.stringify(repeticion)])
    for (const g of grupos) {
      await b.consultar(`insert into grupo_muro (grupo_id, tipo, datos) values ($1, 'resultado', $2)`, [g.grupo_id, JSON.stringify(datos)])
    }
  })
  return grupos.length
}

/** Una repetición: la ve quien está en un grupo donde se publicó. */
export async function repeticion(base: Base, yo: string, id: unknown): Promise<RepeticionPartida> {
  if (!esUuid(id)) throw new GruposRechazo('Esa repetición no existe', 404)
  const [f] = await base.consultar<{ datos: RepeticionPartida }>(
    `select r.datos from repeticiones r
     where r.id = $1 and exists (
       select 1 from grupo_muro e join grupo_miembros m on m.grupo_id = e.grupo_id
       where e.tipo = 'resultado' and e.datos->>'repeticion' = $1::text and m.cuenta_id = $2)`,
    [id, yo],
  )
  if (!f) throw new GruposRechazo('Esa repetición no existe', 404)
  return f.datos
}
