/**
 * Los beta testers, a mano y por email, contra la base de apps/server/.env (la de Supabase).
 * Cada tester entra una vez con Google y su cuenta se crea sola; después, desde apps/server:
 *   pnpm beta lista                     las cuentas, con saldo y si son beta
 *   pnpm beta marcar ana@gmail.com      puede usar todo lo de la tienda sin comprarlo
 *   pnpm beta sacar ana@gmail.com       vuelve a valer solo lo que compró
 *   pnpm beta monedas ana@gmail.com 500 le carga monedas (un movimiento "ajuste"; negativo, descuenta)
 * Lo de la cuenta lo toma al volver a entrar a la app o a una sala.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { basePostgres, type Base } from '../src/cuentas/base'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(resolve(raiz, '.env'))
} catch {
  // Sin .env: vale DATABASE_URL del entorno.
}

const AYUDA = 'Uso: pnpm beta lista | marcar <email> | sacar <email> | monedas <email> <cantidad>'

async function cuentaPorEmail(base: Base, email: string): Promise<{ id: string; apodo: string }> {
  const filas = await base.consultar<{ id: string; apodo: string }>('select id, apodo from cuentas where lower(email) = lower($1)', [email])
  if (filas.length === 0) throw new Error(`No hay ninguna cuenta con ${email}: que entre una vez a la app con ese email.`)
  return filas[0]!
}

async function correr(base: Base, [orden, email, cantidad]: string[]) {
  if (orden === 'lista') {
    const filas = await base.consultar<{ email: string | null; apodo: string; beta: boolean; saldo: number; creada: Date }>(
      `select c.email, c.apodo, c.beta, coalesce(sum(m.monto), 0)::int as saldo, c.creada
       from cuentas c left join movimientos m on m.cuenta_id = c.id
       group by c.id order by c.creada`,
    )
    console.table(filas.map((f) => ({ email: f.email, apodo: f.apodo, beta: f.beta ? 'sí' : '', saldo: f.saldo, creada: f.creada.toISOString().slice(0, 10) })))
    return
  }
  if (!email) throw new Error(AYUDA)
  const cuenta = await cuentaPorEmail(base, email)
  if (orden === 'marcar' || orden === 'sacar') {
    await base.consultar('update cuentas set beta = $2 where id = $1', [cuenta.id, orden === 'marcar'])
    console.log(`${cuenta.apodo} (${email}): ${orden === 'marcar' ? 'ahora es beta tester' : 'ya no es beta tester'}.`)
  } else if (orden === 'monedas') {
    const monto = Number(cantidad)
    if (!Number.isInteger(monto) || monto === 0) throw new Error('La cantidad tiene que ser un número entero, distinto de 0.')
    await base.consultar(`insert into movimientos (cuenta_id, monto, tipo, detalle) values ($1, $2, 'ajuste', $3)`, [cuenta.id, monto, { motivo: 'beta' }])
    const [s] = await base.consultar<{ saldo: number }>('select coalesce(sum(monto), 0)::int as saldo from movimientos where cuenta_id = $1', [cuenta.id])
    console.log(`${cuenta.apodo} (${email}): ${monto > 0 ? '+' : ''}${monto} monedas, saldo ${s!.saldo}.`)
  } else {
    throw new Error(AYUDA)
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL (en apps/server/.env).')
  process.exitCode = 1
} else {
  const base = await basePostgres(url)
  try {
    await correr(base, process.argv.slice(2))
  } catch (e) {
    console.error((e as Error).message)
    process.exitCode = 1
  } finally {
    await base.cerrar()
  }
}
