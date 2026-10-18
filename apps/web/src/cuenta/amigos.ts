import { create } from 'zustand'
import { direccionApi, useCuenta } from './cuenta'

export type EstadoAmigo = 'desconectado' | 'conectado' | 'enSala' | 'jugando'

export interface Persona {
  id: string
  apodo: string
  avatar: string | null
}

export interface Amigo extends Persona {
  estado: EstadoAmigo
  /** Si está esperando en una sala privada: su código, para unirse. */
  sala: string | null
}

export interface Invitacion {
  de: string
  apodo: string
  sala: string
  hora: number
}

interface ListaAmigos {
  codigo: string
  amigos: Amigo[]
  recibidas: Persona[]
  enviadas: Persona[]
}

interface EstadoAmigos {
  lista: ListaAmigos | null
  /** Las invitaciones a una sala que llegaron y todavía no se respondieron. */
  invitaciones: Invitacion[]
}

export const useAmigos = create<EstadoAmigos>(() => ({ lista: null, invitaciones: [] }))

/** Cada cuánto la app avisa que sigue abierta (y trae invitaciones). */
const LATIDO_MS = 25_000

async function pedir<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T> {
  const token = useCuenta.getState().token
  if (!token) throw new Error('Entrá a tu cuenta')
  const r = await fetch(`${direccionApi()}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  })
  const datos = (await r.json()) as T & { motivo?: string }
  if (!r.ok) throw new Error(datos.motivo ?? 'No se pudo. Probá de nuevo.')
  return datos
}

export async function cargarAmigos(): Promise<void> {
  useAmigos.setState({ lista: await pedir<ListaAmigos>('GET', '/amigos') })
}

/** Cada acción devuelve el motivo si no se pudo (y si se pudo, recarga la lista). */
async function hacer(ruta: string, cuerpo: unknown): Promise<string | null> {
  try {
    await pedir('POST', ruta, cuerpo)
    await cargarAmigos()
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'No se pudo. Probá de nuevo.'
  }
}

export const agregarAmigo = (codigo: string) => hacer('/amigos/agregar', { codigo })
export const responderSolicitud = (id: string, aceptar: boolean) => hacer('/amigos/responder', { id, aceptar })
export const borrarAmigo = (id: string) => hacer('/amigos/borrar', { id })
export const invitarAmigo = (id: string) => hacer('/amigos/invitar', { id })

export function descartarInvitacion(inv: Invitacion) {
  useAmigos.setState((s) => ({ invitaciones: s.invitaciones.filter((i) => i !== inv) }))
}

async function latido() {
  try {
    const { invitaciones } = await pedir<{ invitaciones: Invitacion[] }>('POST', '/amigos/latido')
    if (invitaciones.length > 0) {
      useAmigos.setState((s) => ({
        invitaciones: [...s.invitaciones.filter((i) => !invitaciones.some((n) => n.de === i.de && n.sala === i.sala)), ...invitaciones],
      }))
    }
  } catch {
    // Sin conexión: el próximo latido lo vuelve a intentar.
  }
}

// Con la cuenta abierta, la app late (así tus amigos te ven conectado y te llegan invitaciones).
let reloj: ReturnType<typeof setInterval> | null = null
useCuenta.subscribe((s) => {
  const adentro = s.estado === 'adentro'
  if (adentro && !reloj) {
    void latido()
    reloj = setInterval(() => void latido(), LATIDO_MS)
  } else if (!adentro && reloj) {
    clearInterval(reloj)
    reloj = null
    useAmigos.setState({ lista: null, invitaciones: [] })
  }
})
