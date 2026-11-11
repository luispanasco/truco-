import { SENIAS, type Senia } from '@truco/bots'
import { GUARDA_CHAT_GRUPO, LARGO_MENSAJE_GRUPO, PUEDE, TRAE_CHAT_GRUPO, type MensajeGrupo, type RolGrupo } from '@truco/shared'
import type { Base } from './base'
import { GruposRechazo } from './grupos'
import { filtrarTexto } from '../chat'

/**
 * El chat de cada grupo: textos (con el filtro de palabras de la mesa) y emotes (una seña, que se
 * ve hecha por el avatar de quien la manda). Lo ven y escriben solo los del grupo.
 */

const NO_EXISTE = () => new GruposRechazo('Ese grupo no existe', 404)
const esUuid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)

async function rolEnGrupo(b: Base, yo: string, grupo: unknown): Promise<RolGrupo> {
  if (!esUuid(grupo)) throw NO_EXISTE()
  const [f] = await b.consultar<{ rol: RolGrupo }>('select rol from grupo_miembros where grupo_id = $1 and cuenta_id = $2', [grupo, yo])
  if (!f) throw NO_EXISTE()
  return f.rol
}

interface FilaChat {
  id: number
  tipo: 'texto' | 'emote'
  texto: string | null
  senia: Senia | null
  creado: string
  cuenta_id: string
  apodo: string
  avatar: string | null
}

const mensaje = (f: FilaChat): MensajeGrupo =>
  ({
    id: f.id,
    creado: new Date(f.creado).toISOString(),
    autor: { id: f.cuenta_id, apodo: f.apodo, avatar: f.avatar },
    tipo: f.tipo,
    texto: f.texto,
    senia: f.senia,
  }) as MensajeGrupo

/** Los últimos mensajes (o, con `desde`, los que vinieron después de ese), del más viejo al más nuevo. */
export async function chatDeGrupo(base: Base, yo: string, grupo: unknown, desde?: unknown): Promise<{ mensajes: MensajeGrupo[] }> {
  await rolEnGrupo(base, yo, grupo)
  const despues = typeof desde === 'string' && /^\d{1,15}$/.test(desde) ? Number(desde) : 0
  const filas = await base.consultar<FilaChat>(
    `select m.id::int as id, m.tipo, m.texto, m.senia, m.creado, m.cuenta_id, c.apodo, c.avatar
     from grupo_chat m join cuentas c on c.id = m.cuenta_id
     where m.grupo_id = $1 and m.id > $2
     order by m.id desc limit $3`,
    [grupo, despues, TRAE_CHAT_GRUPO],
  )
  return { mensajes: filas.reverse().map(mensaje) }
}

/** Manda un texto (`{ texto }`) o un emote (`{ senia }`). Devuelve el mensaje como lo ven todos. */
export async function mandarAlChat(base: Base, yo: string, grupo: unknown, datos: Record<string, unknown>): Promise<MensajeGrupo> {
  let tipo: 'texto' | 'emote'
  let texto: string | null = null
  let senia: Senia | null = null
  if (datos.senia !== undefined) {
    if (!SENIAS.includes(datos.senia as Senia)) throw new GruposRechazo('Esa seña no existe', 400)
    tipo = 'emote'
    senia = datos.senia as Senia
  } else {
    const limpio = typeof datos.texto === 'string' ? datos.texto.replace(/\s+/g, ' ').trim() : ''
    if (limpio.length === 0) throw new GruposRechazo('Escribí algo', 400)
    if ([...limpio].length > LARGO_MENSAJE_GRUPO) throw new GruposRechazo(`El mensaje va hasta ${LARGO_MENSAJE_GRUPO} letras`, 400)
    tipo = 'texto'
    texto = filtrarTexto(limpio)
  }
  await rolEnGrupo(base, yo, grupo)
  return base.transaccion(async (b) => {
    const [f] = await b.consultar<FilaChat>(
      `with nuevo as (
         insert into grupo_chat (grupo_id, cuenta_id, tipo, texto, senia) values ($1, $2, $3, $4, $5)
         returning id, tipo, texto, senia, creado, cuenta_id)
       select n.id::int as id, n.tipo, n.texto, n.senia, n.creado, n.cuenta_id, c.apodo, c.avatar
       from nuevo n join cuentas c on c.id = n.cuenta_id`,
      [grupo, yo, tipo, texto, senia],
    )
    // Se guardan los últimos: los que quedan más atrás se borran.
    await b.consultar(
      `delete from grupo_chat where grupo_id = $1 and id <= (
         select id from grupo_chat where grupo_id = $1 order by id desc offset $2 limit 1)`,
      [grupo, GUARDA_CHAT_GRUPO],
    )
    return mensaje(f!)
  })
}

/** Borra un mensaje: el que lo mandó, o el líder y los capitanes. */
export async function borrarDelChat(base: Base, yo: string, grupo: unknown, id: unknown): Promise<{ ok: true }> {
  const rol = await rolEnGrupo(base, yo, grupo)
  const numero = typeof id === 'string' && /^\d{1,15}$/.test(id) ? Number(id) : null
  const [m] = numero
    ? await base.consultar<{ cuenta_id: string }>('select cuenta_id from grupo_chat where grupo_id = $1 and id = $2', [grupo, numero])
    : []
  if (!m) throw new GruposRechazo('Ese mensaje ya no está', 404)
  if (m.cuenta_id !== yo && !PUEDE.moderarChat(rol)) throw new GruposRechazo('Solo el líder y los capitanes borran mensajes de otros', 403)
  await base.consultar('delete from grupo_chat where id = $1', [numero])
  return { ok: true }
}

/** Para no llenar el chat: hasta 1 mensaje por segundo y 20 por minuto, por cuenta (en memoria). */
export class LimiteChatGrupo {
  private veces = new Map<string, number[]>()
  constructor(private readonly ahora = () => Date.now()) {}

  permitir(cuenta: string): boolean {
    const t = this.ahora()
    const vigentes = (this.veces.get(cuenta) ?? []).filter((x) => t - x < 60_000)
    if (vigentes.length >= 20 || vigentes.some((x) => t - x < 1000)) {
      this.veces.set(cuenta, vigentes)
      return false
    }
    this.veces.set(cuenta, [...vigentes, t])
    // De vez en cuando, se olvidan los que ya no escriben.
    if (this.veces.size > 1000) for (const [c, v] of this.veces) if (v.every((x) => t - x >= 60_000)) this.veces.delete(c)
    return true
  }
}
