import { create } from 'zustand'
import { paraCobrar, type EstadoMisiones } from '@truco/shared'
import { direccionApi, useCuenta } from './cuenta'

/** Las misiones de tu cuenta (null hasta que llegan del servidor, o sin cuenta). */
export const useMisiones = create<{ estado: EstadoMisiones | null }>(() => ({ estado: null }))

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

export async function cargarMisiones(): Promise<void> {
  const estado = await pedir<EstadoMisiones>('GET', '/misiones')
  if (!Array.isArray(estado.delDia) || !Array.isArray(estado.deUnaVez)) throw new Error('No llegaron las misiones')
  useMisiones.setState({ estado })
}

/** Cobra una misión cumplida: el premio va al saldo. Devuelve cuánto se cobró. */
export async function cobrarMision(id: string): Promise<number> {
  const r = await pedir<{ misiones: EstadoMisiones; saldo: number; premio: number }>('POST', '/misiones/cobrar', { id })
  useMisiones.setState({ estado: r.misiones })
  useCuenta.setState({ saldo: r.saldo })
  return r.premio
}

/** Si hay alguna misión cumplida para cobrar (para el puntito de la barra). */
export function useHayParaCobrar(): boolean {
  return useMisiones((s) => !!s.estado && [...s.estado.deUnaVez, ...s.estado.delDia].some(paraCobrar))
}
