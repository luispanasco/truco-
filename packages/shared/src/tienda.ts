/**
 * La tienda (fase 2): qué se vende, la vitrina de cada día y qué puede usar cada uno. La vitrina
 * es la misma para todos y cambia a la medianoche de Uruguay; lo comprado queda para siempre.
 */
import { CAPAS_AVATAR, CATALOGO_AVATAR, type CapaAvatar } from './avatar'
import { MESAS, type IdMesa } from './mesas'
import { TIPOGRAFIAS, type IdTipografia } from './tipografias'
import type { Rareza } from './rarezas'

export type TipoItem = 'avatar' | 'mesa' | 'tipografia'

/** Un cosmético de la tienda. El id es estable: `avatar:<capa>:<pieza>`, `mesa:<id>`, `tipografia:<id>`. */
export interface ItemTienda {
  id: string
  tipo: TipoItem
  nombre: string
  rareza: Rareza
  precio: number
  /** Para dibujarlo: la capa y la pieza del avatar, o el id de la mesa o la tipografía. */
  capa?: CapaAvatar
  pieza?: number
  ref?: string
}

export const idPieza = (capa: CapaAvatar, pieza: number) => `avatar:${capa}:${pieza}`
export const idMesa = (id: IdMesa) => `mesa:${id}`
export const idTipografia = (id: IdTipografia) => `tipografia:${id}`

/** Todo lo que se vende (lo pago de los catálogos). */
export const CATALOGO_TIENDA: readonly ItemTienda[] = [
  ...CAPAS_AVATAR.flatMap((capa) =>
    CATALOGO_AVATAR[capa].flatMap((p, pieza) =>
      p.rareza ? [{ id: idPieza(capa, pieza), tipo: 'avatar' as const, nombre: p.nombre, rareza: p.rareza, precio: p.precio, capa, pieza }] : [],
    ),
  ),
  ...MESAS.flatMap((m) => (m.rareza ? [{ id: idMesa(m.id), tipo: 'mesa' as const, nombre: `Mesa ${m.nombre}`, rareza: m.rareza, precio: m.precio, ref: m.id }] : [])),
  ...TIPOGRAFIAS.flatMap((t) =>
    t.rareza ? [{ id: idTipografia(t.id), tipo: 'tipografia' as const, nombre: `Letra ${t.nombre}`, rareza: t.rareza, precio: t.precio, ref: t.id }] : [],
  ),
]

export function buscarItem(id: unknown): ItemTienda | undefined {
  return CATALOGO_TIENDA.find((i) => i.id === id)
}

/** Los lugares de la vitrina: de qué rarezas puede salir cada uno. */
export const LUGARES_VITRINA: readonly (readonly Rareza[])[] = [['comun'], ['comun'], ['comun'], ['rara', 'epica'], ['rara', 'epica'], ['epica', 'legendaria']]

/** El día de la tienda (AAAA-MM-DD en Uruguay, UTC−3 sin horario de verano). */
export function diaDeTienda(ahora: Date): string {
  return new Date(ahora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Cuándo cambia la vitrina del día de `ahora` (la próxima medianoche de Uruguay). */
export function cambioDeVitrina(ahora: Date): Date {
  return new Date(Date.parse(`${diaDeTienda(ahora)}T03:00:00Z`) + 86_400_000)
}

/** La vitrina de un día: siempre la misma para ese día, sin repetidos. */
export function vitrinaDelDia(dia: string, catalogo: readonly ItemTienda[] = CATALOGO_TIENDA): ItemTienda[] {
  const azar = mulberry(hashTexto(`vitrina:${dia}`))
  const elegidos: ItemTienda[] = []
  for (const rarezas of LUGARES_VITRINA) {
    const posibles = catalogo.filter((i) => rarezas.includes(i.rareza) && !elegidos.includes(i))
    if (posibles.length > 0) elegidos.push(posibles[Math.floor(azar() * posibles.length)]!)
  }
  return elegidos
}

/** Qué puede usar quien tiene este inventario: lo gratis y lo comprado. */
export function permisosDe(inventario: ReadonlySet<string> | readonly string[]) {
  const tiene = inventario instanceof Set ? inventario : new Set(inventario as readonly string[])
  return {
    avatar: (capa: CapaAvatar, pieza: number) => (CATALOGO_AVATAR[capa][pieza]?.precio ?? 1) === 0 || tiene.has(idPieza(capa, pieza)),
    mesa: (id: IdMesa) => MESAS.find((m) => m.id === id)?.precio === 0 || tiene.has(idMesa(id)),
    tipografia: (id: IdTipografia) => TIPOGRAFIAS.find((t) => t.id === id)?.precio === 0 || tiene.has(idTipografia(id)),
  }
}

function hashTexto(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry(semilla: number) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
