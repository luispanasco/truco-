import { buscarItem, cambioDeVitrina, diaDeTienda, vitrinaDelDia, type ItemTienda } from '@truco/shared'
import type { Base } from './base'
import { saldo } from './monedas'

/** Lo que tiene comprado una cuenta (ids de la tienda). */
export async function inventario(base: Base, cuentaId: string): Promise<string[]> {
  const filas = await base.consultar<{ item: string }>('select item from inventario where cuenta_id = $1 order by comprado', [cuentaId])
  return filas.map((f) => f.item)
}

/** La vitrina de hoy y cuándo cambia. */
export function vitrina(ahora = new Date()): { dia: string; cambia: string; items: ItemTienda[] } {
  return { dia: diaDeTienda(ahora), cambia: cambioDeVitrina(ahora).toISOString(), items: vitrinaDelDia(diaDeTienda(ahora)) }
}

/** Un rechazo de compra, con el motivo para mostrar. */
export class CompraRechazada extends Error {}

/**
 * Compra un cosmético de la vitrina de hoy: descuenta las monedas (un movimiento de compra) y lo
 * suma al inventario, todo junto o nada.
 */
export async function comprar(base: Base, cuentaId: string, itemId: unknown, ahora = new Date()): Promise<{ saldo: number; inventario: string[] }> {
  const item = buscarItem(itemId)
  if (!item || !vitrina(ahora).items.some((i) => i.id === item.id)) throw new CompraRechazada('Eso no está en la vitrina de hoy')
  return base.transaccion(async (b) => {
    await b.consultar('select id from cuentas where id = $1 for update', [cuentaId])
    if ((await b.consultar('select 1 from inventario where cuenta_id = $1 and item = $2', [cuentaId, item.id])).length > 0) {
      throw new CompraRechazada('Ya lo tenés')
    }
    if ((await saldo(b, cuentaId)) < item.precio) throw new CompraRechazada('No te alcanzan las monedas')
    await b.consultar('insert into movimientos (cuenta_id, monto, tipo, detalle, creado) values ($1, $2, $3, $4, $5)', [
      cuentaId,
      -item.precio,
      'compra',
      { item: item.id },
      ahora.toISOString(),
    ])
    await b.consultar('insert into inventario (cuenta_id, item, precio, comprado) values ($1, $2, $3, $4)', [cuentaId, item.id, item.precio, ahora.toISOString()])
    return { saldo: await saldo(b, cuentaId), inventario: await inventario(b, cuentaId) }
  })
}
