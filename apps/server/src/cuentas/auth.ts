import { createHash } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/** Quién es el dueño de una sesión, según el token que manda el cliente. */
export interface Usuario {
  /** El id del usuario en Supabase Auth (uuid): es el id de la cuenta. */
  id: string
  email: string | null
}

/** Devuelve el usuario del token, o null si no es válido o venció. */
export type Verificador = (token: string) => Promise<Usuario | null>

/**
 * Sesiones de Supabase Auth: el token es un JWT firmado con las claves asimétricas del proyecto,
 * que se bajan (y se guardan) de su JWKS. No hace falta ninguna clave secreta en el servidor.
 */
export function verificadorSupabase(url: string): Verificador {
  const base = url.replace(/\/+$/, '')
  const claves = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`))
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, claves, { issuer: `${base}/auth/v1`, audience: 'authenticated' })
      if (typeof payload.sub !== 'string') return null
      return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null }
    } catch {
      return null
    }
  }
}

/** Prefijo de los tokens del login de prueba (solo en desarrollo, sin Supabase configurado). */
export const PREFIJO_PRUEBA = 'prueba:'

/**
 * Login de prueba: el token es `prueba:<email>` y la cuenta sale de ese email. Sirve para
 * desarrollar y probar monedas y tienda antes de tener Supabase; nunca se usa en producción.
 */
export const verificadorDePrueba: Verificador = async (token) => {
  if (!token.startsWith(PREFIJO_PRUEBA)) return null
  const email = token.slice(PREFIJO_PRUEBA.length).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 120) return null
  return { id: uuidDe(email), email }
}

/** Un uuid fijo para cada texto (con la forma de un v5, para que Postgres lo acepte). */
function uuidDe(texto: string): string {
  const h = createHash('sha256').update(`truco:${texto}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}
