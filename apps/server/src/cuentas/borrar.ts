import type { Base } from './base'

/**
 * Borra la cuenta y todo lo suyo (lo pide Google Play: tiene que poder hacerse desde la app y
 * desde la web). En los grupos se va como si saliera: si era el líder, el liderazgo pasa al
 * capitán más antiguo (o al miembro más antiguo) y, si no queda nadie, el grupo se borra. Lo que
 * escribió en el muro de un grupo y los reportes que mandó quedan, pero sin la cuenta.
 */
export async function borrarCuenta(base: Base, id: string): Promise<boolean> {
  return base.transaccion(async (b) => {
    const [existe] = await b.consultar<{ id: string }>('select id from cuentas where id = $1', [id])
    if (!existe) return false
    // Habilita borrar sus movimientos de monedas, solo en esta transacción (migración 17).
    await b.consultar(`select set_config('truco.borrando_cuenta', 'si', true)`)

    const grupos = await b.consultar<{ grupo_id: string; rol: string }>('select grupo_id, rol from grupo_miembros where cuenta_id = $1', [id])
    await b.consultar('delete from grupo_miembros where cuenta_id = $1', [id])
    for (const g of grupos) {
      if (g.rol !== 'lider') continue
      const [sucesor] = await b.consultar<{ cuenta_id: string }>(
        `select cuenta_id from grupo_miembros where grupo_id = $1 order by (rol = 'capitan') desc, desde limit 1`,
        [g.grupo_id],
      )
      if (sucesor) await b.consultar(`update grupo_miembros set rol = 'lider' where grupo_id = $1 and cuenta_id = $2`, [g.grupo_id, sucesor.cuenta_id])
      else await b.consultar('delete from grupos where id = $1', [g.grupo_id])
    }

    await b.consultar('update grupo_muro set autor = null where autor = $1', [id])
    await b.consultar('update reportes set cuenta_id = null where cuenta_id = $1', [id])
    await b.consultar('delete from amistades where de = $1 or a = $1', [id])
    for (const tabla of [
      'grupo_solicitudes',
      'grupo_chat',
      'invitados',
      'movimientos',
      'elo',
      'elo_partidas',
      'inventario',
      'historia',
      'partidas_jugadas',
    ]) {
      await b.consultar(`delete from ${tabla} where cuenta_id = $1`, [id])
    }
    await b.consultar('delete from cuentas where id = $1', [id])
    return true
  })
}

/**
 * Borra también el usuario de Supabase (el email con el que entra), si el servidor tiene la llave
 * secreta (`SUPABASE_SECRET_KEY`). Sin ella queda solo el login: si vuelve a entrar con Google, empieza
 * con una cuenta nueva y vacía.
 */
export async function borrarUsuarioSupabase(url: string | undefined, llave: string | undefined, id: string): Promise<boolean> {
  if (!url || !llave) return false
  const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: llave, authorization: `Bearer ${llave}` },
  })
  if (!r.ok && r.status !== 404) throw new Error(`Supabase no borró el usuario (${r.status})`)
  return true
}
