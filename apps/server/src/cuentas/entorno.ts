import type { Cuentas } from './api'
import { baseLocal, basePostgres } from './base'
import { verificadorDePrueba, verificadorSupabase } from './auth'

/**
 * Las cuentas según el entorno (ver INSTRUCTIVO-CUENTAS.md):
 * - `DATABASE_URL`: el PostgreSQL de Supabase. Sin ella, en desarrollo se usa una base local
 *   (PGlite en `dirLocal`); en producción, sin base no hay cuentas.
 * - `SUPABASE_URL`: para verificar las sesiones. Sin ella, en desarrollo vale el login de prueba.
 */
export async function cuentasDelEntorno(env: Record<string, string | undefined>, dirLocal: string): Promise<Cuentas | null> {
  const desarrollo = env.NODE_ENV !== 'production'
  if (!env.DATABASE_URL && !desarrollo) return null
  if (!env.SUPABASE_URL && !desarrollo) return null
  const base = env.DATABASE_URL ? await basePostgres(env.DATABASE_URL) : await baseLocal(dirLocal)
  return env.SUPABASE_URL
    ? { base, verificar: verificadorSupabase(env.SUPABASE_URL), loginDePrueba: false }
    : { base, verificar: verificadorDePrueba, loginDePrueba: true }
}
