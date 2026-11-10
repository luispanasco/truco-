import type { CapaAvatar, ItemTienda } from '@truco/shared'

/** Los estantes de la tienda: todo el catálogo, agrupado por qué es. */
const CAPAS_DE: Record<string, readonly CapaAvatar[]> = {
  Pelo: ['pelo', 'colorPelo'],
  Cara: ['piel', 'cabeza', 'cejas', 'ojos', 'nariz', 'boca', 'barba', 'pecas'],
  'Sombreros, lentes y aros': ['sombrero', 'lentes', 'aros'],
  Ropa: ['ropa', 'bufanda'],
  'En la mano y en la boca': ['accesorio', 'enBoca'],
}

export interface Estante {
  titulo: string
  items: ItemTienda[]
}

/** El catálogo en estantes (sin lo que se gana en el modo historia), de lo más barato a lo más caro. */
export function armarEstantes(catalogo: readonly ItemTienda[]): Estante[] {
  const vendibles = catalogo.filter((i) => !i.recompensa)
  const porPrecio = (a: ItemTienda, b: ItemTienda) => a.precio - b.precio
  return [
    ...Object.entries(CAPAS_DE).map(([titulo, capas]) => ({
      titulo,
      items: vendibles.filter((i) => i.tipo === 'avatar' && capas.includes(i.capa!)).sort(porPrecio),
    })),
    { titulo: 'Paños', items: vendibles.filter((i) => i.tipo === 'mesa').sort(porPrecio) },
    { titulo: 'Letras', items: vendibles.filter((i) => i.tipo === 'tipografia').sort(porPrecio) },
  ].filter((e) => e.items.length > 0)
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "mañana", "el jueves 13" (esta semana) o "el 2/12" (más adelante), para un día AAAA-MM-DD. */
export function cuandoVuelve(dia: string, hoy: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`)
  const dias = Math.round((fecha.getTime() - Date.parse(`${hoy}T12:00:00Z`)) / 86_400_000)
  if (dias === 1) return 'mañana'
  if (dias < 7) return `el ${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()}`
  return `el ${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}`
}
