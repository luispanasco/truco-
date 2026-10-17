import { mkdir } from 'node:fs/promises'
import { MIGRACIONES } from './migraciones'

/**
 * La base de datos, sea PostgreSQL de verdad (Supabase, con `DATABASE_URL`) o PGlite (el mismo
 * Postgres compilado a WebAssembly, en memoria o en una carpeta): los tests y el desarrollo sin
 * Supabase usan PGlite, con el mismo SQL.
 */
export interface Base {
  consultar<T = Record<string, unknown>>(sql: string, parametros?: unknown[]): Promise<T[]>
  /** Corre `fn` en una transacción: si tira, no queda nada de lo que hizo. */
  transaccion<R>(fn: (b: Base) => Promise<R>): Promise<R>
  cerrar(): Promise<void>
}

/** PostgreSQL real. Con el pooler de Supabase en modo sesión alcanzan pocas conexiones. */
export async function basePostgres(url: string): Promise<Base> {
  const { default: pg } = await import('pg')
  // Los bigint (sumas de monedas) llegan como texto: se pasan a número, que alcanza de sobra.
  pg.types.setTypeParser(20, (v) => Number(v))
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  const sobre = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Base => ({
    consultar: async <T>(sql: string, p?: unknown[]) => (await c.query(sql, p)).rows as T[],
    transaccion: () => Promise.reject(new Error('Ya estás en una transacción')),
    cerrar: async () => {},
  })
  const base: Base = {
    ...sobre(pool),
    async transaccion(fn) {
      const c = await pool.connect()
      try {
        await c.query('begin')
        const r = await fn(sobre(c))
        await c.query('commit')
        return r
      } catch (e) {
        await c.query('rollback')
        throw e
      } finally {
        c.release()
      }
    },
    cerrar: () => pool.end(),
  }
  await migrar(base)
  return base
}

/** PGlite: en memoria (`dir` vacío) o guardada en una carpeta. */
export async function baseLocal(dir?: string): Promise<Base> {
  const { PGlite } = await import('@electric-sql/pglite')
  if (dir) await mkdir(dir, { recursive: true })
  const db = new PGlite(dir)
  // PGlite atiende una consulta a la vez: las transacciones se encolan para no mezclarse.
  let cola: Promise<unknown> = Promise.resolve()
  const consultar = async <T>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows
  const base: Base = {
    consultar: <T>(sql: string, p?: unknown[]) => {
      const r = cola.then(() => consultar<T>(sql, p))
      cola = r.catch(() => {})
      return r
    },
    transaccion<R>(fn: (b: Base) => Promise<R>) {
      const r = cola.then(() =>
        db.transaction(async (tx) =>
          fn({
            consultar: async <T>(sql: string, p?: unknown[]) => (await tx.query<T>(sql, p)).rows,
            transaccion: () => Promise.reject(new Error('Ya estás en una transacción')),
            cerrar: async () => {},
          }),
        ),
      )
      cola = r.catch(() => {})
      return r as Promise<R>
    },
    cerrar: () => db.close(),
  }
  await migrar(base)
  return base
}

/** Aplica, en orden y una sola vez, las migraciones que falten. */
async function migrar(base: Base) {
  await base.consultar('create table if not exists migraciones (n int primary key, aplicada timestamptz not null default now())')
  const hechas = new Set((await base.consultar<{ n: number }>('select n from migraciones')).map((m) => m.n))
  for (const [i, sql] of MIGRACIONES.entries()) {
    if (hechas.has(i + 1)) continue
    await base.transaccion(async (b) => {
      for (const sentencia of sql.split(/;\s*$/m).filter((s) => s.trim())) await b.consultar(sentencia)
      await b.consultar('insert into migraciones (n) values ($1)', [i + 1])
    })
  }
}
