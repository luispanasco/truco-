import {
  barrioAbierto,
  claveProgreso,
  departamentoAbierto,
  departamentoPublicado,
  monedasDeRecompensa,
  nivelAbierto,
  nivelDeHistoria,
  type IdDepartamento,
  type ProgresoHistoria,
} from '@truco/shared'
import type { Base } from './base'
import { saldo } from './monedas'
import { inventario } from './tienda'

/** Un rechazo del modo historia, con el motivo para mostrar. */
export class HistoriaRechazo extends Error {}

/** Los niveles ganados de cada departamento (por barrio, en los que tienen: ver `claveProgreso`). */
export async function progresoHistoria(base: Base, cuentaId: string): Promise<ProgresoHistoria> {
  const filas = await base.consultar<{ departamento: IdDepartamento; barrio: string; nivel: number }>(
    'select departamento, barrio, nivel from historia where cuenta_id = $1 order by departamento, barrio, nivel',
    [cuentaId],
  )
  const progreso: ProgresoHistoria = {}
  for (const f of filas) (progreso[claveProgreso(f.departamento, f.barrio)] ??= []).push(f.nivel)
  return progreso
}

/**
 * Ganaste un nivel: queda anotado y, la primera vez, sus recompensas van al inventario (como si las
 * hubieras comprado, a precio 0); las monedas (`monedas:<n>`), al saldo. El departamento tiene que
 * estar publicado y abierto (la mitad de un vecino ganada, o el inicial), tener abierto el barrio
 * (el anterior completo) y el nivel (el anterior ganado), salvo con `todoAbierto` (el admin), que
 * tiene todo abierto. Las partidas contra bots corren en el navegador, así que el servidor confía en que
 * ganaste: las recompensas son cosméticas.
 */
export async function ganarNivel(
  base: Base,
  cuentaId: string,
  departamento: unknown,
  n: unknown,
  todoAbierto = false,
  barrio: unknown = '',
): Promise<{ progreso: ProgresoHistoria; nuevas: string[]; inventario: string[]; saldo: number }> {
  const nivel = nivelDeHistoria(departamento, n, barrio)
  if (!nivel) throw new HistoriaRechazo('Ese nivel no existe')
  const dep = departamento as IdDepartamento
  const numero = n as number
  const enBarrio = barrio as string
  return base.transaccion(async (b) => {
    await b.consultar('select id from cuentas where id = $1 for update', [cuentaId])
    const progreso = await progresoHistoria(b, cuentaId)
    if (!todoAbierto && !departamentoPublicado(dep)) throw new HistoriaRechazo('Ese departamento todavía no está abierto: muy pronto')
    if (!departamentoAbierto(progreso, dep, todoAbierto)) throw new HistoriaRechazo('Ese departamento todavía está cerrado: ganá la mitad de uno de sus vecinos')
    if (!barrioAbierto(progreso, dep, enBarrio, todoAbierto)) throw new HistoriaRechazo('Primero completá el barrio anterior')
    if (!nivelAbierto(progreso, dep, numero, enBarrio, todoAbierto)) throw new HistoriaRechazo('Primero ganá el nivel anterior')
    const primera = await b.consultar<{ nivel: number }>(
      'insert into historia (cuenta_id, departamento, barrio, nivel) values ($1, $2, $3, $4) on conflict do nothing returning nivel',
      [cuentaId, dep, enBarrio, numero],
    )
    const nuevas: string[] = []
    if (primera.length > 0) {
      for (const item of nivel.recompensas) {
        const monedas = monedasDeRecompensa(item)
        if (monedas > 0) {
          const r = await b.consultar(
            `insert into movimientos (cuenta_id, monto, tipo, partida) values ($1, $2, 'historia', $3) on conflict do nothing returning id`,
            [cuentaId, monedas, enBarrio ? `historia:${dep}:${enBarrio}:${numero}` : `historia:${dep}:${numero}`],
          )
          if (r.length > 0) nuevas.push(item)
          continue
        }
        const r = await b.consultar('insert into inventario (cuenta_id, item, precio) values ($1, $2, 0) on conflict do nothing returning item', [cuentaId, item])
        if (r.length > 0) nuevas.push(item)
      }
    }
    return { progreso: await progresoHistoria(b, cuentaId), nuevas, inventario: await inventario(b, cuentaId), saldo: await saldo(b, cuentaId) }
  })
}
