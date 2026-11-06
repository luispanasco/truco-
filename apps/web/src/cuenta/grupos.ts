import { create } from 'zustand'
import {
  LADO_FOTO_GRUPO,
  MAX_BYTES_FOTO_GRUPO,
  type ConfigGrupo,
  type DetalleGrupo,
  type MuroGrupo,
  type RepeticionPartida,
  type ResumenGrupo,
  type RolGrupo,
} from '@truco/shared'
import { direccionApi, useCuenta } from './cuenta'

interface ListaGrupos {
  tuyos: ResumenGrupo[]
  buscar: ResumenGrupo[]
  /** Cuántos grupos se pueden crear todavía en toda la app. */
  quedan: number
}

export const useGrupos = create<{ lista: ListaGrupos | null }>(() => ({ lista: null }))

async function pedir<T>(metodo: 'GET' | 'POST' | 'PUT', ruta: string, cuerpo?: unknown): Promise<T> {
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
