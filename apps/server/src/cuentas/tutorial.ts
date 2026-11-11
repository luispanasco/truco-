import { idMonedas, MONEDAS_DIPLOMA, PREMIO_DIPLOMA } from '@truco/shared'
import type { Base } from './base'
import { saldo } from './monedas'
import { inventario } from './tienda'

/**
 * Te recibiste en "Aprendé a jugar" (ganaste el examen): la misión de una vez `recibirse` se cobra
 * sola (sus monedas, como cualquier misión: un movimiento `mision:recibirse`, así el índice único no
 * deja cobrarla dos veces) y los Naipes van al inventario. La partida corre en el navegador: el
 * servidor confía, como en el modo historia (el premio es chico y una sola vez por cuenta).
 * Devuelve lo nuevo (vacío si ya te habías recibido).
 */
export async function recibirse(base: Base, cuentaId: string): Promise<{ nuevas: string[]; inventario: string[]; saldo: number }> {
  return base.transaccion(async (b) => {
    await b.consultar('select id from cuentas where id = $1 for update', [cuentaId])
    const nuevas: string[] = []
    const m = await b.consultar(
      `insert into movimientos (cuenta_id, monto, tipo, partida) values ($1, $2, 'mision', 'mision:recibirse') on conflict do nothing returning id`,
      [cuentaId, MONEDAS_DIPLOMA],
    )
    if (m.length > 0) nuevas.push(idMonedas(MONEDAS_DIPLOMA))
    const i = await b.consultar('insert into inventario (cuenta_id, item, precio) values ($1, $2, 0) on conflict do nothing returning item', [cuentaId, PREMIO_DIPLOMA])
    if (i.length > 0) nuevas.push(PREMIO_DIPLOMA)
    return { nuevas, inventario: await inventario(b, cuentaId), saldo: await saldo(b, cuentaId) }
  })
}
