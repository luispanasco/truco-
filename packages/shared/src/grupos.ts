import type { Senia } from '@truco/bots'

/**
 * Los grupos (como los clanes de los juegos): con nombre, sigla, foto y roles. Lo usan el servidor
 * (que valida y guarda) y la web (que muestra y avisa antes de mandar).
 */

/** Cuántos grupos puede haber en toda la app mientras dure la beta. */
export const MAX_GRUPOS = 10
/** En cuántos grupos puede estar una misma persona. */
export const MAX_GRUPOS_POR_PERSONA = 5
/** Largo del código de invitación: uno más que el de amigo, para no confundirlos. */
export const LARGO_CODIGO_GRUPO = 7
/** La foto, ya achicada por la app: cuadrada, de este lado, y hasta este peso. */
export const LADO_FOTO_GRUPO = 256
export const MAX_BYTES_FOTO_GRUPO = 100_000

export const LIMITES_GRUPO = {
  nombreMin: 3,
  nombreMax: 24,
  siglaMin: 2,
  siglaMax: 4,
  descripcionMax: 140,
  cupoMin: 2,
  cupoMax: 100,
} as const

export type RolGrupo = 'lider' | 'capitan' | 'miembro'
/** Abierto: entra cualquiera. Con solicitud: lo aprueba un capitán o el líder. Cerrado: solo con el código. */
export type IngresoGrupo = 'abierto' | 'solicitud' | 'cerrado'

export const NOMBRE_ROL: Record<RolGrupo, string> = { lider: 'Líder', capitan: 'Capitán', miembro: 'Miembro' }
export const NOMBRE_INGRESO: Record<IngresoGrupo, string> = { abierto: 'Abierto', solicitud: 'Con solicitud', cerrado: 'Cerrado' }
/** Quién puede armar una partida y llamar a todo el grupo. */
export type ConvocanGrupo = 'todos' | 'capitanes'
export const NOMBRE_CONVOCAN: Record<ConvocanGrupo, string> = { todos: 'Todos', capitanes: 'Líder y capitanes' }
/** Entre una llamada a jugar y la siguiente del mismo, para no llenar de avisos a nadie. */
export const ESPERA_CONVOCAR_MS = 30_000

/** Lo que se configura de un grupo (nombre, sigla, descripción, cómo se entra, el cupo y quién arma partidas). */
export interface ConfigGrupo {
  nombre: string
  sigla: string
  descripcion: string
  ingreso: IngresoGrupo
  /** Cuántos miembros como mucho; null, sin cupo. */
  cupo: number | null
  convocan: ConvocanGrupo
}

/** Un grupo en una lista (los tuyos o los que se pueden buscar). */
export interface ResumenGrupo {
  id: string
  nombre: string
  sigla: string
  descripcion: string
  ingreso: IngresoGrupo
  cupo: number | null
  convocan: ConvocanGrupo
  miembros: number
  /** Cambia con cada foto nueva (para la caché); null, sin foto. */
  foto: number | null
  /** Tu rol, si estás adentro. */
  rol: RolGrupo | null
  /** Si pediste entrar y todavía no te respondieron. */
  pedido: boolean
  /** En los tuyos: cuántos de los demás tienen la app abierta. */
  conectados?: number
  /** En los tuyos: la última entrada del muro (para avisar si hay algo nuevo); null, el muro vacío. */
  ultimoMuro?: number | null
  /** En los tuyos: el último mensaje del chat que mandó otro (para avisar si hay nuevos); null, ninguno. */
  ultimoChat?: number | null
}

export interface MiembroGrupo {
  id: string
  apodo: string
  avatar: string | null
  rol: RolGrupo
  desde: string
  /** Si tiene la app abierta, si espera en una sala o si está jugando (como los amigos). */
  estado: 'desconectado' | 'conectado' | 'enSala' | 'jugando'
  /** El código de la sala privada en la que espera, para unirse. */
  sala: string | null
}

export interface DetalleGrupo extends ResumenGrupo {
  lista: MiembroGrupo[]
  /** Para capitanes y el líder: el código de invitación y quién pidió entrar. */
  codigo: string | null
  solicitudes: { id: string; apodo: string; avatar: string | null }[] | null
}

/** Qué puede hacer cada rol. */
export const PUEDE = {
  configurar: (r: RolGrupo | null) => r === 'lider',
  manejarSolicitudes: (r: RolGrupo | null) => r === 'lider' || r === 'capitan',
  verCodigo: (r: RolGrupo | null) => r === 'lider' || r === 'capitan',
  cambiarRoles: (r: RolGrupo | null) => r === 'lider',
  /** El líder expulsa a cualquiera; un capitán, solo a los miembros. */
  /** Armar una partida y llamar a todo el grupo: según la configuración, todos o líder y capitanes. */
  convocar: (r: RolGrupo | null, convocan: ConvocanGrupo) => r !== null && (convocan === 'todos' || r !== 'miembro'),
  expulsar: (yo: RolGrupo | null, otro: RolGrupo) => (yo === 'lider' && otro !== 'lider') || (yo === 'capitan' && otro === 'miembro'),
  /** Borrar mensajes ajenos del chat: el líder y los capitanes (los propios, cada uno). */
  moderarChat: (r: RolGrupo | null) => r === 'lider' || r === 'capitan',
}

const limpiar = (s: unknown) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '')

/**
 * Valida y normaliza la configuración de un grupo. Devuelve la configuración limpia o el motivo
 * por el que no vale (para mostrarlo tal cual).
 */
export function validarConfigGrupo(c: Partial<Record<keyof ConfigGrupo, unknown>>): ConfigGrupo | string {
  const L = LIMITES_GRUPO
  const nombre = limpiar(c.nombre)
  if (nombre.length < L.nombreMin || nombre.length > L.nombreMax) return `El nombre va de ${L.nombreMin} a ${L.nombreMax} letras`
  const sigla = limpiar(c.sigla).toUpperCase()
  if (sigla.length < L.siglaMin || sigla.length > L.siglaMax || !/^[A-ZÑ0-9]+$/.test(sigla))
    return `La sigla va de ${L.siglaMin} a ${L.siglaMax} letras o números, sin espacios`
  const descripcion = limpiar(c.descripcion)
  if (descripcion.length > L.descripcionMax) return `La descripción va hasta ${L.descripcionMax} letras`
  const ingreso = c.ingreso ?? 'abierto'
  if (ingreso !== 'abierto' && ingreso !== 'solicitud' && ingreso !== 'cerrado') return 'Elegí cómo se entra al grupo'
  const cupo = c.cupo === null || c.cupo === undefined || c.cupo === '' ? null : Number(c.cupo)
  if (cupo !== null && (!Number.isInteger(cupo) || cupo < L.cupoMin || cupo > L.cupoMax)) return `El cupo va de ${L.cupoMin} a ${L.cupoMax}`
  const convocan = c.convocan ?? 'todos'
  if (convocan !== 'todos' && convocan !== 'capitanes') return 'Elegí quién arma partidas'
  return { nombre, sigla, descripcion, ingreso, cupo, convocan }
}

/** Si los bytes son una imagen WebP, JPEG o PNG (por cómo empiezan), y cuál. */
export function tipoDeFoto(b: Uint8Array): 'image/webp' | 'image/jpeg' | 'image/png' | null {
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n))
  if (b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 8 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png'
  return null
}

// ── El muro del grupo ──────────────────────────────────────────────

/** Cuántas entradas trae el muro (las últimas). */
export const LARGO_MURO = 40
/** Una invitación a una sala vale este rato (después la sala ya arrancó o se cerró). */
export const VIGENCIA_INVITACION_MS = 30 * 60_000

/** Un jugador de una partida del muro: su apodo y, si entró con cuenta, quién es. */
export interface JugadorMuro {
  apodo: string
  cuentaId: string | null
}

/**
 * Lo que hay en el muro de un grupo:
 * - una invitación: alguien armó una sala y la mandó al grupo, para que se sumen con su código;
 * - un resultado: una partida entre miembros que terminó, con los equipos, los puntos y, si se
 *   guardó, su repetición.
 */
export type EntradaMuro =
  | {
      id: number
      tipo: 'invitacion'
      creado: string
      autor: { id: string; apodo: string; avatar: string | null }
      datos: { codigo: string; formato: '1v1' | '2v2' | '3v3'; puntos: number }
    }
  | {
      id: number
      tipo: 'resultado'
      creado: string
      datos: {
        formato: '1v1' | '2v2' | '3v3'
        puntosPartida: number
        puntos: [number, number]
        ganador: 0 | 1
        equipos: [JugadorMuro[], JugadorMuro[]]
        repeticion: string | null
      }
    }

/** Cómo le va a cada miembro en las partidas del grupo (las que están en el muro). */
export interface FilaRankingGrupo {
  cuentaId: string
  apodo: string
  avatar: string | null
  jugadas: number
  ganadas: number
}

export interface MuroGrupo {
  entradas: EntradaMuro[]
  ranking: FilaRankingGrupo[]
}

// ── El chat del grupo ──────────────────────────────────────────────

/** Lo más largo que puede ser un mensaje de texto del chat. */
export const LARGO_MENSAJE_GRUPO = 200
/** Cuántos mensajes trae el chat al abrirlo (los últimos). */
export const TRAE_CHAT_GRUPO = 50
/** Cuántos mensajes guarda cada grupo: al pasarse, se borran los más viejos. */
export const GUARDA_CHAT_GRUPO = 200

/**
 * Un mensaje del chat del grupo: un texto o un emote (una seña hecha por el avatar de quien la
 * manda, con su nombre abajo).
 */
export type MensajeGrupo = {
  id: number
  creado: string
  autor: { id: string; apodo: string; avatar: string | null }
} & ({ tipo: 'texto'; texto: string; senia: null } | { tipo: 'emote'; texto: null; senia: Senia })
