import { generarCodigo } from '../codigos'
import type { Base } from './base'
import type { EstadoAmigo, Presencia } from './presencia'

/** Largo del código de amigo: uno más que el de las salas, para no confundirlos. */
export const LARGO_CODIGO_AMIGO = 6

export interface Amigo {
  id: string
  apodo: string
  avatar: string | null
  estado: EstadoAmigo
  /** Si está esperando en una sala privada: su código, para unirse. */
  sala: string | null
}

export interface Persona {
  id: string
  apodo: string
  avatar: string | null
}

/** Un rechazo con un motivo para mostrar. */
export class AmigosRechazo extends Error {}

/** El código de amigo de la cuenta; se crea la primera vez que se pide. */
export async function codigoDe(base: Base, cuentaId: string): Promise<string> {
  const [fila] = await base.consultar<{ codigo: string | null }>('select codigo from cuentas where id = $1', [cuentaId])
  if (fila?.codigo) return fila.codigo
  for (let intento = 0; intento < 20; intento++) {
    const codigo = generarCodigo() + generarCodigo().slice(0, LARGO_CODIGO_AMIGO - 5)
    const [r] = await base.consultar<{ codigo: string }>(
      `update cuentas set codigo = $2 where id = $1 and codigo is null
         and not exists (select 1 from cuentas where codigo = $2)
       returning codigo`,
      [cuentaId, codigo],
    )
    if (r) return r.codigo
    const [ya] = await base.consultar<{ codigo: string | null }>('select codigo from cuentas where id = $1', [cuentaId])
    if (ya?.codigo) return ya.codigo
  }
  throw new Error('No se pudo generar un código de amigo libre')
}

/** Tus amigos (con su estado), las solicitudes que te mandaron y las que mandaste. */
export async function listaDeAmigos(base: Base, presencia: Presencia, yo: string) {
  const filas = await base.consultar<Persona & { estado: 'pendiente' | 'aceptada'; mia: boolean }>(
    `select c.id, c.apodo, c.avatar, a.estado, (a.de = $1) as mia
     from amistades a join cuentas c on c.id = case when a.de = $1 then a.a else a.de end
     where a.de = $1 or a.a = $1
     order by c.apodo`,
    [yo],
  )
  const persona = ({ id, apodo, avatar }: Persona): Persona => ({ id, apodo, avatar })
  const orden: Record<EstadoAmigo, number> = { enSala: 0, conectado: 1, jugando: 2, desconectado: 3 }
  const amigos: Amigo[] = filas
    .filter((f) => f.estado === 'aceptada')
    .map((f) => ({ ...persona(f), ...presencia.estado(f.id) }))
    .sort((x, y) => orden[x.estado] - orden[y.estado])
  return {
    codigo: await codigoDe(base, yo),
    amigos,
    recibidas: filas.filter((f) => f.estado === 'pendiente' && !f.mia).map(persona),
    enviadas: filas.filter((f) => f.estado === 'pendiente' && f.mia).map(persona),
  }
}

/**
 * Pedirle amistad a alguien por su código. Si esa persona ya te la había pedido, quedan
 * amigos de una. Devuelve si quedaron amigos.
 */
export async function agregarAmigo(base: Base, yo: string, codigo: unknown): Promise<{ amigos: boolean }> {
  const limpio = typeof codigo === 'string' ? codigo.trim().toUpperCase() : ''
  if (limpio.length !== LARGO_CODIGO_AMIGO) throw new AmigosRechazo(`El código de amigo tiene ${LARGO_CODIGO_AMIGO} letras y números`)
  return base.transaccion(async (b) => {
    const [otro] = await b.consultar<{ id: string }>('select id from cuentas where codigo = $1', [limpio])
    if (!otro) throw new AmigosRechazo('No hay nadie con ese código')
    if (otro.id === yo) throw new AmigosRechazo('Ese es tu código')
    const [existe] = await b.consultar<{ de: string; estado: string }>(
      'select de, estado from amistades where (de = $1 and a = $2) or (de = $2 and a = $1)',
      [yo, otro.id],
    )
    if (existe?.estado === 'aceptada') throw new AmigosRechazo('Ya son amigos')
    if (existe && existe.de === yo) throw new AmigosRechazo('Ya le mandaste la solicitud')
    if (existe) {
      await b.consultar(`update amistades set estado = 'aceptada' where de = $1 and a = $2`, [otro.id, yo])
      return { amigos: true }
    }
    await b.consultar(`insert into amistades (de, a, estado) values ($1, $2, 'pendiente')`, [yo, otro.id])
    return { amigos: false }
  })
}

/** Aceptar o rechazar una solicitud que te mandaron. */
export async function responderSolicitud(base: Base, yo: string, de: unknown, aceptar: boolean) {
  if (typeof de !== 'string') throw new AmigosRechazo('Solicitud inválida')
  const r = aceptar
    ? await base.consultar(`update amistades set estado = 'aceptada' where de = $1 and a = $2 and estado = 'pendiente' returning de`, [de, yo])
    : await base.consultar(`delete from amistades where de = $1 and a = $2 and estado = 'pendiente' returning de`, [de, yo])
  if (r.length === 0) throw new AmigosRechazo('Esa solicitud ya no está')
}

/** Dejar de ser amigos (o cancelar una solicitud que mandaste). */
export async function borrarAmigo(base: Base, yo: string, otro: unknown) {
  if (typeof otro !== 'string') throw new AmigosRechazo('Amigo inválido')
  await base.consultar('delete from amistades where (de = $1 and a = $2) or (de = $2 and a = $1)', [yo, otro])
}

export async function sonAmigos(base: Base, x: string, y: string): Promise<boolean> {
  const r = await base.consultar(
    `select 1 from amistades where estado = 'aceptada' and ((de = $1 and a = $2) or (de = $2 and a = $1))`,
    [x, y],
  )
  return r.length > 0
}

/** Invitar a un amigo a la sala en la que estás esperando. */
export async function invitarAmigo(base: Base, presencia: Presencia, yo: string, otro: unknown) {
  if (typeof otro !== 'string' || !(await sonAmigos(base, yo, otro).catch(() => false))) throw new AmigosRechazo('Solo podés invitar a tus amigos')
  const sala = presencia.salaDe(yo)
  if (!sala) throw new AmigosRechazo('Para invitar tenés que estar en una sala privada, antes de empezar')
  const [c] = await base.consultar<{ apodo: string }>('select apodo from cuentas where id = $1', [yo])
  presencia.invitar(otro, { de: yo, apodo: c?.apodo ?? 'Un amigo', sala })
}
