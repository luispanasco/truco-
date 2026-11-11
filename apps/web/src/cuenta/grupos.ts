import { create } from 'zustand'
import {
  LADO_FOTO_GRUPO,
  MAX_BYTES_FOTO_GRUPO,
  type ConfigGrupo,
  type DetalleGrupo,
  type MensajeGrupo,
  type MuroGrupo,
  type RepeticionPartida,
  type ResumenGrupo,
  type RolGrupo,
} from '@truco/shared'
import type { Senia } from '@truco/bots'
import { direccionApi, useCuenta } from './cuenta'

interface ListaGrupos {
  tuyos: ResumenGrupo[]
  buscar: ResumenGrupo[]
  /** Cuántos grupos se pueden crear todavía en toda la app. */
  quedan: number
}

/** Lo último del muro de cada grupo que ya viste (se recuerda en el navegador). */
const CLAVE_VISTOS = 'truco.muroVisto'
/** Y el último mensaje del chat de cada grupo que ya viste. */
const CLAVE_CHAT_VISTO = 'truco.chatVisto'

function leerVistos(clave: string): Record<string, number> {
  try {
    const x = JSON.parse(localStorage.getItem(clave) ?? '{}') as unknown
    return x && typeof x === 'object' ? (x as Record<string, number>) : {}
  } catch {
    return {}
  }
}

type Vistos = Record<string, number>
export const useGrupos = create<{ lista: ListaGrupos | null; vistos: Vistos; chatVisto: Vistos }>(() => ({
  lista: null,
  vistos: leerVistos(CLAVE_VISTOS),
  chatVisto: leerVistos(CLAVE_CHAT_VISTO),
}))

function marcar(campo: 'vistos' | 'chatVisto', clave: string, grupo: string, ultimo: number) {
  const vistos = useGrupos.getState()[campo]
  if ((vistos[grupo] ?? 0) >= ultimo) return
  const nuevos = { ...vistos, [grupo]: ultimo }
  useGrupos.setState({ [campo]: nuevos })
  try {
    localStorage.setItem(clave, JSON.stringify(nuevos))
  } catch {
    // Sin almacenamiento, el aviso vuelve a aparecer al recargar: no pasa nada.
  }
}

/** Viste el muro de un grupo hasta la entrada `ultimo`: se apaga su aviso. */
export const marcarMuroVisto = (grupo: string, ultimo: number) => marcar('vistos', CLAVE_VISTOS, grupo, ultimo)
/** Leíste el chat de un grupo hasta el mensaje `ultimo`: se apaga su aviso. */
export const marcarChatVisto = (grupo: string, ultimo: number) => marcar('chatVisto', CLAVE_CHAT_VISTO, grupo, ultimo)

/** Si un grupo tuyo tiene algo nuevo en el muro desde la última vez que lo miraste. */
export const tieneNovedades = (g: ResumenGrupo, vistos: Vistos) => (g.ultimoMuro ?? 0) > (vistos[g.id] ?? 0)
/** Si en el chat de un grupo tuyo escribió alguien desde la última vez que lo leíste. */
export const tieneMensajesNuevos = (g: ResumenGrupo, chatVisto: Vistos) => (g.ultimoChat ?? 0) > (chatVisto[g.id] ?? 0)

/** Si alguno de tus grupos tiene novedades en el muro o mensajes nuevos (para el puntito de la barra). */
export function useHayNovedadesEnGrupos(): boolean {
  return useGrupos((s) => !!s.lista && s.lista.tuyos.some((g) => tieneNovedades(g, s.vistos) || tieneMensajesNuevos(g, s.chatVisto)))
}

/** Si el chat de ese grupo tiene mensajes nuevos (para el puntito de su pestaña). */
export function useChatConNuevos(grupo: string): boolean {
  return useGrupos((s) => {
    const g = s.lista?.tuyos.find((x) => x.id === grupo)
    return !!g && tieneMensajesNuevos(g, s.chatVisto)
  })
}

async function pedir<T>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', ruta: string, cuerpo?: unknown): Promise<T> {
  const token = useCuenta.getState().token
  if (!token) throw new Error('Entrá a tu cuenta')
  const foto = cuerpo instanceof Blob
  const r = await fetch(`${direccionApi()}${ruta}`, {
    method: metodo,
    headers: { 'content-type': foto ? cuerpo.type : 'application/json', authorization: `Bearer ${token}` },
    ...(cuerpo !== undefined ? { body: foto ? cuerpo : JSON.stringify(cuerpo) } : {}),
  })
  const datos = (await r.json()) as T & { motivo?: string }
  if (!r.ok) throw new Error(datos.motivo ?? 'No se pudo. Probá de nuevo.')
  return datos
}

const motivo = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo. Probá de nuevo.')

export async function cargarGrupos(): Promise<void> {
  useGrupos.setState({ lista: await pedir<ListaGrupos>('GET', '/grupos') })
}

export const detalleGrupo = (id: string) => pedir<DetalleGrupo>('POST', '/grupos/detalle', { id })
/** El muro del grupo: las salas que mandaron, los resultados de las partidas entre miembros y el ranking. */
export const muroGrupo = (id: string) => pedir<MuroGrupo>('POST', '/grupos/muro', { id })
/** La repetición de una partida del muro. */
export const repeticionDeGrupo = (repeticion: string) => pedir<RepeticionPartida>('POST', '/grupos/repeticion', { repeticion })

/** El chat del grupo: los últimos mensajes o, con `desde`, los que llegaron después de ese. */
export const chatGrupo = (id: string, desde?: number) =>
  pedir<{ mensajes: MensajeGrupo[] }>('GET', `/grupos/${id}/chat${desde ? `?desde=${desde}` : ''}`)
/** Mandar al chat un texto o un emote (una seña). Devuelve el mensaje como quedó (el texto, filtrado). */
export const mandarAlChat = (id: string, mensaje: { texto: string } | { senia: Senia }) => pedir<MensajeGrupo>('POST', `/grupos/${id}/chat`, mensaje)
export const borrarDelChat = (id: string, mensaje: number) => pedir<{ ok: true }>('DELETE', `/grupos/${id}/chat/${mensaje}`)

/** La dirección de la foto (con su versión, así la caché no muestra una vieja). */
export const urlFotoGrupo = (id: string, version: number) => `${direccionApi()}/grupos/${id}/foto?v=${version}`

/** Cada acción devuelve el motivo si no se pudo (y si se pudo, recarga la lista de grupos). */
async function hacer<T = unknown>(ruta: string, cuerpo: unknown): Promise<{ ok: true; datos: T } | { ok: false; motivo: string }> {
  try {
    const datos = await pedir<T>('POST', ruta, cuerpo)
    void cargarGrupos().catch(() => {})
    return { ok: true, datos }
  } catch (e) {
    return { ok: false, motivo: motivo(e) }
  }
}

export const crearGrupo = (config: ConfigGrupo) => hacer<{ id: string }>('/grupos/crear', config)
export const entrarAGrupo = (id: string) => hacer<{ adentro: boolean }>('/grupos/entrar', { id })
export const entrarConCodigo = (codigo: string) => hacer<{ id: string }>('/grupos/codigo', { codigo })
export const cancelarPedido = (id: string) => hacer('/grupos/cancelar', { id })
export const salirDeGrupo = (id: string) => hacer('/grupos/salir', { id })
export const responderSolicitud = (id: string, cuenta: string, aceptar: boolean) => hacer('/grupos/responder', { id, cuenta, aceptar })
export const cambiarRol = (id: string, cuenta: string, rol: Exclude<RolGrupo, 'lider'>) => hacer('/grupos/rol', { id, cuenta, rol })
export const pasarLiderazgo = (id: string, cuenta: string) => hacer('/grupos/liderazgo', { id, cuenta })
export const expulsar = (id: string, cuenta: string) => hacer('/grupos/expulsar', { id, cuenta })
export const configurarGrupo = (id: string, config: ConfigGrupo) => hacer('/grupos/configurar', { id, ...config })
/** Llamar a todo el grupo a la sala privada en la que esperás. */
/** Mandar al muro del grupo la sala en la que esperás, para que se sumen con su código. */
export const invitarAlGrupo = (id: string, sala: { codigo: string; formato: string; puntos: number }) => hacer('/grupos/invitar', { id, ...sala })
export const convocarGrupo = (id: string) => hacer<{ invitados: number }>('/grupos/convocar', { id })
export const renovarCodigo = (id: string) => hacer<{ codigo: string }>('/grupos/renovar-codigo', { id })
export const borrarGrupo = (id: string) => hacer('/grupos/borrar', { id })
export const sacarFoto = (id: string) => hacer('/grupos/sacar-foto', { id })

export async function subirFoto(id: string, foto: Blob): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    await pedir('PUT', `/grupos/${id}/foto`, foto)
    void cargarGrupos().catch(() => {})
    return { ok: true }
  } catch (e) {
    return { ok: false, motivo: motivo(e) }
  }
}

/**
 * Achica la foto elegida a un cuadrado de 256 (recortando el centro) y la pasa a WebP; si el
 * navegador no hace WebP, a JPEG. Baja la calidad hasta que entre en el tope del servidor.
 */
export async function achicarFoto(archivo: Blob): Promise<Blob> {
  const imagen = await createImageBitmap(archivo)
  const lado = Math.min(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = LADO_FOTO_GRUPO
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se pudo leer la foto')
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO_FOTO_GRUPO, LADO_FOTO_GRUPO)
  imagen.close()
  const comoBlob = (tipo: string, calidad: number) =>
    new Promise<Blob | null>((listo) => lienzo.toBlob(listo, tipo, calidad))
  for (const calidad of [0.85, 0.7, 0.5]) {
    let blob = await comoBlob('image/webp', calidad)
    if (!blob || blob.type !== 'image/webp') blob = await comoBlob('image/jpeg', calidad)
    if (blob && blob.size <= MAX_BYTES_FOTO_GRUPO) return blob
  }
  throw new Error('La foto quedó muy pesada: probá con otra')
}

// Al salir de la cuenta, la lista se olvida.
useCuenta.subscribe((s) => {
  if (s.estado !== 'adentro' && useGrupos.getState().lista) useGrupos.setState({ lista: null })
})
