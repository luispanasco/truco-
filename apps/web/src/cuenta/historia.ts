import { create } from 'zustand'
import type { IdDepartamento, ProgresoHistoria } from '@truco/shared'
import { direccionApi, useCuenta } from './cuenta'
import { esBeta, fijarInventario } from './inventario'

/** El progreso del modo historia de tu cuenta (null hasta que llega del servidor). */
export const useHistoria = create<{ progreso: ProgresoHistoria | null }>(() => ({ progreso: null }))

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

export async function cargarHistoria(): Promise<void> {
  const { progreso } = await pedir<{ progreso?: ProgresoHistoria }>('GET', '/historia')
  if (!progreso) throw new Error('No llegó el progreso del modo historia')
  useHistoria.setState({ progreso })
}

/**
 * Ganaste un nivel: el servidor lo anota y te da sus recompensas (la primera vez). Devuelve las
 * nuevas (ids de la tienda), que ya quedan en tu inventario.
 */
export async function ganarNivelHistoria(departamento: IdDepartamento, nivel: number, barrio = ''): Promise<string[]> {
  const r = await pedir<{ progreso: ProgresoHistoria; nuevas: string[]; inventario: string[]; saldo: number }>('POST', '/historia/ganar', {
    departamento,
    ...(barrio ? { barrio } : {}),
    nivel,
  })
  useHistoria.setState({ progreso: r.progreso })
  useCuenta.setState({ saldo: r.saldo })
  fijarInventario(r.inventario, esBeta())
  return r.nuevas
}
