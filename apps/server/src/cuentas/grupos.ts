import { randomUUID } from 'node:crypto'
import {
  ESPERA_CONVOCAR_MS,
  LARGO_CODIGO_GRUPO,
  MAX_BYTES_FOTO_GRUPO,
  MAX_GRUPOS,
  MAX_GRUPOS_POR_PERSONA,
  PUEDE,
  tipoDeFoto,
  validarConfigGrupo,
  type DetalleGrupo,
  type MiembroGrupo,
  type ResumenGrupo,
  type RolGrupo,
} from '@truco/shared'
import { generarCodigo } from '../codigos'
import type { Base } from './base'
import type { Presencia } from './presencia'

/** Un rechazo con un motivo para mostrar (404 si el grupo no existe o no lo podés ver). */
export class GruposRechazo extends Error {
  constructor(
    mensaje: string,
    readonly estado: 404 | 409 = 409,
  ) {
    super(mensaje)
  }
}

const NO_EXISTE = () => new GruposRechazo('Ese grupo no existe', 404)

interface FilaGrupo {
  id: string
  nombre: string
  sigla: string
  descripcion: string
  ingreso: ResumenGrupo['ingreso']
  cupo: number | null
  convocan: ResumenGrupo['convocan']
  codigo: string
  foto_version: number
  tiene_foto: boolean
  miembros: number
  rol: RolGrupo | null
  pedido: boolean
}

/** Los grupos con lo que ve `yo` de cada uno (su rol, si pidió entrar y cuántos son). */
const SELECT_GRUPOS = `
  select g.id, g.nombre, g.sigla, g.descripcion, g.ingreso, g.cupo, g.convocan, g.codigo, g.foto_version,
    (g.foto is not null) as tiene_foto,
    (select count(*)::int from grupo_miembros m where m.grupo_id = g.id) as miembros,
    (select rol from grupo_miembros m where m.grupo_id = g.id and m.cuenta_id = $1) as rol,
    exists (select 1 from grupo_solicitudes s where s.grupo_id = g.id and s.cuenta_id = $1) as pedido
  from grupos g`

function resumen(f: FilaGrupo): ResumenGrupo {
  return {
    id: f.id,
    nombre: f.nombre,
    sigla: f.sigla,
    descripcion: f.descripcion,
    ingreso: f.ingreso,
    cupo: f.cupo,
    convocan: f.convocan,
    miembros: f.miembros,
    foto: f.tiene_foto ? f.foto_version : null,
    rol: f.rol,
    pedido: f.pedido,
  }
}

const esUuid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)

async function grupoDe(b: Base, yo: string, id: unknown): Promise<FilaGrupo> {
  if (!esUuid(id)) throw NO_EXISTE()
  const [g] = await b.consultar<FilaGrupo>(`${SELECT_GRUPOS} where g.id = $2`, [yo, id])
  if (!g) throw NO_EXISTE()
  return g
}

/** El grupo y tu rol; si no estás adentro, no podés hacer nada en él. */
async function grupoConRol(b: Base, yo: string, id: unknown): Promise<FilaGrupo & { rol: RolGrupo }> {
  const g = await grupoDe(b, yo, id)
  if (!g.rol) throw new GruposRechazo('No estás en ese grupo')
  return g as FilaGrupo & { rol: RolGrupo }
}

async function rolDe(b: Base, grupo: string, cuenta: unknown): Promise<RolGrupo> {
  if (!esUuid(cuenta)) throw new GruposRechazo('Esa persona no está en el grupo')
  const [m] = await b.consultar<{ rol: RolGrupo }>('select rol from grupo_miembros where grupo_id = $1 and cuenta_id = $2', [grupo, cuenta])
  if (!m) throw new GruposRechazo('Esa persona no está en el grupo')
  return m.rol
}

async function cuantosGruposTiene(b: Base, cuenta: string): Promise<number> {
  const [f] = await b.consultar<{ n: number }>('select count(*)::int as n from grupo_miembros where cuenta_id = $1', [cuenta])
  return f!.n
}

/** Suma a alguien al grupo, si entra (el cupo del grupo y el tope de grupos por persona). */
async function sumar(b: Base, g: FilaGrupo, cuenta: string, rol: RolGrupo, vos: boolean) {
  if (g.cupo !== null && g.miembros >= g.cupo) throw new GruposRechazo('El grupo está lleno')
  if ((await cuantosGruposTiene(b, cuenta)) >= MAX_GRUPOS_POR_PERSONA)
    throw new GruposRechazo(`${vos ? 'Ya estás' : 'Ya está'} en ${MAX_GRUPOS_POR_PERSONA} grupos, el máximo`)
  await b.consultar('insert into grupo_miembros (grupo_id, cuenta_id, rol) values ($1, $2, $3)', [g.id, cuenta, rol])
  await b.consultar('delete from grupo_solicitudes where grupo_id = $1 and cuenta_id = $2', [g.id, cuenta])
}

async function codigoLibre(b: Base): Promise<string> {
  for (let intento = 0; intento < 50; intento++) {
    const codigo = (generarCodigo() + generarCodigo()).slice(0, LARGO_CODIGO_GRUPO)
    const [ya] = await b.consultar('select 1 from grupos where codigo = $1', [codigo])
    if (!ya) return codigo
  }
  throw new Error('No se pudo generar un código de grupo libre')
}

async function nombreLibre(b: Base, nombre: string, salvo: string | null) {
  const [ya] = await b.consultar('select 1 from grupos where lower(nombre) = lower($1) and id is distinct from $2', [nombre, salvo])
  if (ya) throw new GruposRechazo('Ya hay un grupo con ese nombre')
}

/** Tus grupos, los que se pueden buscar para entrar (abiertos o con solicitud) y cuántos se pueden crear todavía. */
export async function listaDeGrupos(base: Base, yo: string, presencia?: Presencia) {
  const filas = await base.consultar<FilaGrupo>(`${SELECT_GRUPOS} order by g.creado`, [yo])
  const tuyos = filas.filter((f) => f.rol).map(resumen)
  // En los tuyos, además: cuántos de los demás están conectados y la última novedad del muro.
  const ids = tuyos.map((g) => g.id)
  if (ids.length > 0) {
    const miembros = await base.consultar<{ grupo_id: string; cuenta_id: string }>(
      'select grupo_id, cuenta_id from grupo_miembros where grupo_id = any($1) and cuenta_id <> $2',
      [ids, yo],
    )
    const ultimos = await base.consultar<{ grupo_id: string; ultimo: number }>(
      'select grupo_id, max(id)::int as ultimo from grupo_muro where grupo_id = any($1) group by grupo_id',
      [ids],
    )
    for (const g of tuyos) {
      g.conectados = presencia
        ? miembros.filter((m) => m.grupo_id === g.id && presencia.estado(m.cuenta_id).estado !== 'desconectado').length
        : 0
      g.ultimoMuro = ultimos.find((u) => u.grupo_id === g.id)?.ultimo ?? null
    }
  }
  return {
    tuyos,
    buscar: filas.filter((f) => !f.rol && f.ingreso !== 'cerrado').map(resumen),
    quedan: Math.max(0, MAX_GRUPOS - filas.length),
  }
}

/**
 * Un grupo con sus miembros (y si están conectados o esperando en una sala, para unirse). Uno
 * cerrado solo lo ven los de adentro; el código y las solicitudes, capitanes y líder.
 */
export async function detalleGrupo(base: Base, presencia: Presencia, yo: string, id: unknown): Promise<DetalleGrupo> {
  const g = await grupoDe(base, yo, id)
  if (!g.rol && g.ingreso === 'cerrado') throw NO_EXISTE()
  const orden: Record<RolGrupo, number> = { lider: 0, capitan: 1, miembro: 2 }
  const lista = (
    await base.consultar<Omit<MiembroGrupo, 'estado' | 'sala'> & { desde: Date }>(
      `select c.id, c.apodo, c.avatar, m.rol, m.desde from grupo_miembros m join cuentas c on c.id = m.cuenta_id
       where m.grupo_id = $1 order by m.desde`,
      [g.id],
    )
  )
    .map((m) => ({ ...m, desde: new Date(m.desde).toISOString(), ...presencia.estado(m.id) }))
    .sort((x, y) => orden[x.rol] - orden[y.rol])
  const solicitudes = PUEDE.manejarSolicitudes(g.rol)
    ? await base.consultar<{ id: string; apodo: string; avatar: string | null }>(
        `select c.id, c.apodo, c.avatar from grupo_solicitudes s join cuentas c on c.id = s.cuenta_id
         where s.grupo_id = $1 order by s.creada`,
        [g.id],
      )
    : null
  return { ...resumen(g), lista, codigo: PUEDE.verCodigo(g.rol) ? g.codigo : null, solicitudes }
}

/** Crea un grupo con `yo` de líder. Hay un tope de grupos en toda la app y otro por persona. */
export async function crearGrupo(base: Base, yo: string, datos: Record<string, unknown>): Promise<{ id: string }> {
  const config = validarConfigGrupo(datos)
  if (typeof config === 'string') throw new GruposRechazo(config)
  return base.transaccion(async (b) => {
    // De a uno por vez: así dos que crean a la vez no pasan el tope.
    await b.consultar('lock table grupos in share row exclusive mode')
    const [{ n }] = (await b.consultar<{ n: number }>('select count(*)::int as n from grupos')) as [{ n: number }]
    if (n >= MAX_GRUPOS) throw new GruposRechazo(`Ya hay ${MAX_GRUPOS} grupos, el máximo de la beta`)
    if ((await cuantosGruposTiene(b, yo)) >= MAX_GRUPOS_POR_PERSONA) throw new GruposRechazo(`Ya estás en ${MAX_GRUPOS_POR_PERSONA} grupos, el máximo`)
    await nombreLibre(b, config.nombre, null)
    const id = randomUUID()
    await b.consultar(
      'insert into grupos (id, nombre, sigla, descripcion, ingreso, cupo, convocan, codigo) values ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, config.nombre, config.sigla, config.descripcion, config.ingreso, config.cupo, config.convocan, await codigoLibre(b)],
    )
    await b.consultar(`insert into grupo_miembros (grupo_id, cuenta_id, rol) values ($1, $2, 'lider')`, [id, yo])
    return { id }
  })
}

/** Entrar desde la lista: si es abierto, entrás; si es con solicitud, queda pedido. Devuelve si entraste. */
export async function entrarAGrupo(base: Base, yo: string, id: unknown): Promise<{ adentro: boolean }> {
  return base.transaccion(async (b) => {
    const g = await grupoDe(b, yo, id)
    if (g.rol) throw new GruposRechazo('Ya estás en ese grupo')
    if (g.ingreso === 'cerrado') throw NO_EXISTE()
    if (g.ingreso === 'abierto') {
      await sumar(b, g, yo, 'miembro', true)
      return { adentro: true }
    }
    if (g.pedido) throw new GruposRechazo('Ya pediste entrar: falta que te acepten')
    if ((await cuantosGruposTiene(b, yo)) >= MAX_GRUPOS_POR_PERSONA) throw new GruposRechazo(`Ya estás en ${MAX_GRUPOS_POR_PERSONA} grupos, el máximo`)
    await b.consultar('insert into grupo_solicitudes (grupo_id, cuenta_id) values ($1, $2)', [g.id, yo])
    return { adentro: false }
  })
}

/** Con el código de invitación se entra directo, sea como sea el grupo. */
export async function entrarConCodigo(base: Base, yo: string, codigo: unknown): Promise<{ id: string }> {
  const limpio = typeof codigo === 'string' ? codigo.trim().toUpperCase() : ''
  if (limpio.length !== LARGO_CODIGO_GRUPO) throw new GruposRechazo(`El código de grupo tiene ${LARGO_CODIGO_GRUPO} letras y números`)
  return base.transaccion(async (b) => {
    const [f] = await b.consultar<{ id: string }>('select id from grupos where codigo = $1', [limpio])
    if (!f) throw new GruposRechazo('No hay ningún grupo con ese código')
    const g = await grupoDe(b, yo, f.id)
    if (g.rol) throw new GruposRechazo('Ya estás en ese grupo')
    await sumar(b, g, yo, 'miembro', true)
    return { id: g.id }
  })
}

/** Cancelar el pedido para entrar. */
export async function cancelarPedido(base: Base, yo: string, id: unknown) {
  if (!esUuid(id)) throw NO_EXISTE()
  await base.consultar('delete from grupo_solicitudes where grupo_id = $1 and cuenta_id = $2', [id, yo])
}

/**
 * Irse del grupo. Si se va el líder, el liderazgo pasa al capitán más antiguo (o, sin capitanes,
 * al miembro más antiguo). Si no queda nadie, el grupo se borra.
 */
export async function salirDeGrupo(base: Base, yo: string, id: unknown) {
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    await b.consultar('delete from grupo_miembros where grupo_id = $1 and cuenta_id = $2', [g.id, yo])
    if (g.rol !== 'lider') return
    const [sucesor] = await b.consultar<{ cuenta_id: string }>(
      `select cuenta_id from grupo_miembros where grupo_id = $1 order by (rol = 'capitan') desc, desde limit 1`,
      [g.id],
    )
    if (sucesor) await b.consultar(`update grupo_miembros set rol = 'lider' where grupo_id = $1 and cuenta_id = $2`, [g.id, sucesor.cuenta_id])
    else await b.consultar('delete from grupos where id = $1', [g.id])
  })
}

/** Aceptar o rechazar a alguien que pidió entrar (capitanes y líder). */
export async function responderSolicitudGrupo(base: Base, yo: string, id: unknown, cuenta: unknown, aceptar: boolean) {
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.manejarSolicitudes(g.rol)) throw new GruposRechazo('Solo los capitanes y el líder responden las solicitudes')
    const [pedido] = esUuid(cuenta)
      ? await b.consultar('select 1 from grupo_solicitudes where grupo_id = $1 and cuenta_id = $2', [g.id, cuenta])
      : []
    if (!pedido) throw new GruposRechazo('Esa persona no pidió entrar')
    if (aceptar) await sumar(b, g, cuenta as string, 'miembro', false)
    else await b.consultar('delete from grupo_solicitudes where grupo_id = $1 and cuenta_id = $2', [g.id, cuenta])
  })
}

/** Nombrar o sacar capitanes (solo el líder). */
export async function cambiarRol(base: Base, yo: string, id: unknown, cuenta: unknown, rol: unknown) {
  if (rol !== 'capitan' && rol !== 'miembro') throw new GruposRechazo('Ese rol no existe')
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.cambiarRoles(g.rol)) throw new GruposRechazo('Solo el líder cambia los roles')
    if ((await rolDe(b, g.id, cuenta)) === 'lider') throw new GruposRechazo('Para dejar de ser líder, pasale el liderazgo a otro')
    await b.consultar('update grupo_miembros set rol = $3 where grupo_id = $1 and cuenta_id = $2', [g.id, cuenta, rol])
  })
}

/** El líder le pasa el liderazgo a otro y queda de capitán. */
export async function pasarLiderazgo(base: Base, yo: string, id: unknown, cuenta: unknown) {
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (g.rol !== 'lider') throw new GruposRechazo('Solo el líder pasa el liderazgo')
    if ((await rolDe(b, g.id, cuenta)) === 'lider') throw new GruposRechazo('Ya sos el líder')
    await b.consultar(`update grupo_miembros set rol = 'capitan' where grupo_id = $1 and cuenta_id = $2`, [g.id, yo])
    await b.consultar(`update grupo_miembros set rol = 'lider' where grupo_id = $1 and cuenta_id = $2`, [g.id, cuenta])
  })
}

/** Sacar a alguien del grupo: el líder a cualquiera; un capitán, solo a los miembros. */
export async function expulsar(base: Base, yo: string, id: unknown, cuenta: unknown) {
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.expulsar(g.rol, await rolDe(b, g.id, cuenta))) throw new GruposRechazo('No podés sacar a esa persona')
    await b.consultar('delete from grupo_miembros where grupo_id = $1 and cuenta_id = $2', [g.id, cuenta])
  })
}

/** Cambiar el nombre, la sigla, la descripción, cómo se entra, el cupo y quién arma partidas (solo el líder). */
export async function configurarGrupo(base: Base, yo: string, id: unknown, datos: Record<string, unknown>) {
  const config = validarConfigGrupo(datos)
  if (typeof config === 'string') throw new GruposRechazo(config)
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.configurar(g.rol)) throw new GruposRechazo('Solo el líder cambia la configuración')
    if (config.cupo !== null && config.cupo < g.miembros) throw new GruposRechazo(`Ya son ${g.miembros}: el cupo no puede ser menos`)
    await nombreLibre(b, config.nombre, g.id)
    await b.consultar('update grupos set nombre = $2, sigla = $3, descripcion = $4, ingreso = $5, cupo = $6, convocan = $7 where id = $1', [
      g.id,
      config.nombre,
      config.sigla,
      config.descripcion,
      config.ingreso,
      config.cupo,
      config.convocan,
    ])
    // Abierto, los que esperaban ya pueden entrar solos: los pedidos se borran.
    if (config.ingreso !== 'solicitud') await b.consultar('delete from grupo_solicitudes where grupo_id = $1', [g.id])
  })
}

/**
 * Llamar a todo el grupo a la sala privada en la que esperás: a cada uno le llega la invitación
 * (a los que no tienen la app abierta, si la abren en los próximos minutos). Según la
 * configuración, llaman todos o solo el líder y los capitanes. Devuelve a cuántos les llegó.
 */
export async function convocarGrupo(base: Base, presencia: Presencia, yo: string, id: unknown): Promise<{ invitados: number }> {
  const g = await grupoConRol(base, yo, id)
  if (!PUEDE.convocar(g.rol, g.convocan)) throw new GruposRechazo('En este grupo solo el líder y los capitanes arman partidas')
  const sala = presencia.salaDe(yo)
  if (!sala) throw new GruposRechazo('Para llamar al grupo tenés que estar en una sala privada, antes de empezar')
  const otros = await base.consultar<{ id: string }>('select cuenta_id as id from grupo_miembros where grupo_id = $1 and cuenta_id <> $2', [g.id, yo])
  if (otros.length === 0) throw new GruposRechazo('Todavía no hay nadie más en el grupo')
  if (!presencia.puedeConvocar(yo, g.id, ESPERA_CONVOCAR_MS)) throw new GruposRechazo('Ya llamaste al grupo hace un ratito')
  const [c] = await base.consultar<{ apodo: string }>('select apodo from cuentas where id = $1', [yo])
  // A los que ya están en esta misma sala no hace falta avisarles.
  const invitados = otros.filter((o) => presencia.salaDe(o.id) !== sala)
  for (const o of invitados) presencia.invitar(o.id, { de: yo, apodo: c?.apodo ?? 'Alguien del grupo', sala, grupo: `[${g.sigla}] ${g.nombre}` })
  return { invitados: invitados.length }
}

/** Un código de invitación nuevo: el viejo deja de servir (capitanes y líder). */
export async function renovarCodigo(base: Base, yo: string, id: unknown): Promise<{ codigo: string }> {
  return base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.verCodigo(g.rol)) throw new GruposRechazo('Solo los capitanes y el líder renuevan el código')
    const codigo = await codigoLibre(b)
    await b.consultar('update grupos set codigo = $2 where id = $1', [g.id, codigo])
    return { codigo }
  })
}

/** Borrar el grupo (solo el líder). */
export async function borrarGrupo(base: Base, yo: string, id: unknown) {
  await base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (g.rol !== 'lider') throw new GruposRechazo('Solo el líder borra el grupo')
    await b.consultar('delete from grupos where id = $1', [g.id])
  })
}

/** Pone (o saca, con null) la foto del grupo (solo el líder). Devuelve la versión nueva. */
export async function guardarFotoGrupo(base: Base, yo: string, id: unknown, bytes: Uint8Array | null): Promise<{ foto: number | null }> {
  let tipo: string | null = null
  if (bytes) {
    if (bytes.length > MAX_BYTES_FOTO_GRUPO) throw new GruposRechazo('La foto es muy pesada')
    tipo = tipoDeFoto(bytes)
    if (!tipo) throw new GruposRechazo('Eso no es una foto (tiene que ser WebP, JPEG o PNG)')
  }
  return base.transaccion(async (b) => {
    const g = await grupoConRol(b, yo, id)
    if (!PUEDE.configurar(g.rol)) throw new GruposRechazo('Solo el líder cambia la foto')
    const [f] = await b.consultar<{ foto_version: number }>(
      'update grupos set foto = $2, foto_tipo = $3, foto_version = foto_version + 1 where id = $1 returning foto_version',
      [g.id, bytes ? Buffer.from(bytes) : null, tipo],
    )
    return { foto: bytes ? f!.foto_version : null }
  })
}

/** La foto del grupo, para servirla (la ve cualquiera que tenga el enlace). */
export async function fotoDeGrupo(base: Base, id: unknown): Promise<{ bytes: Buffer; tipo: string } | null> {
  if (!esUuid(id)) return null
  const [f] = await base.consultar<{ foto: Uint8Array | null; foto_tipo: string | null }>('select foto, foto_tipo from grupos where id = $1', [id])
  if (!f?.foto || !f.foto_tipo) return null
  return { bytes: Buffer.from(f.foto), tipo: f.foto_tipo }
}
