import { create } from 'zustand'
import type { SupabaseClient } from '@supabase/supabase-js'
import { direccionServidor } from '../conexion/online'
import { cosmeticosPermitidos, guardarPerfil, leerPerfil, observarPerfil, type Perfil } from '../perfil'

/** La cuenta como la guarda el servidor. */
export interface DatosCuenta {
  id: string
  email: string | null
  apodo: string
  avatar: string | null
  preferencias: Record<string, unknown>
  nueva: boolean
}

/**
 * - `apagadas`: el servidor no tiene cuentas (o no responde): se juega como invitado.
 * - `afuera`: hay cuentas y no entraste. `entrando`: esperando al servidor.
 */
export type EstadoCuenta = 'cargando' | 'apagadas' | 'afuera' | 'entrando' | 'adentro'

interface Cuenta {
  estado: EstadoCuenta
  cuenta: DatosCuenta | null
  /** El token de la sesión: viaja al servidor de juego al entrar a una sala. */
  token: string | null
  /** Cómo se puede entrar: con Supabase (Google y link por email) o con el login de prueba. */
  modo: 'supabase' | 'prueba' | null
  error: string | null
  /** Si se mandó el link por email (hay que abrirlo desde el correo). */
  linkEnviado: string | null
  /** Tus monedas (las cuenta el servidor; acá solo se muestran). */
  saldo: number | null
}

export const useCuenta = create<Cuenta>(() => ({
  estado: 'cargando',
  cuenta: null,
  token: null,
  modo: null,
  error: null,
  linkEnviado: null,
  saldo: null,
}))

/** La API de cuentas: la misma dirección del servidor de juego, por http, bajo /api. */
export function direccionApi(): string {
  return direccionServidor().replace(/^ws/, 'http') + '/api'
}

const CLAVE_PRUEBA = 'truco.sesionDePrueba'
let supabase: SupabaseClient | null = null
let iniciada = false

/** Arranca una sola vez: averigua si hay cuentas y retoma la sesión guardada. */
export async function iniciarCuenta(): Promise<void> {
  if (iniciada) return
  iniciada = true
  let estado: { cuentas: boolean; loginDePrueba: boolean }
  try {
    const r = await fetch(`${direccionApi()}/estado`)
    estado = (await r.json()) as typeof estado
  } catch {
    return void useCuenta.setState({ estado: 'apagadas' })
  }
  if (!estado.cuentas) return void useCuenta.setState({ estado: 'apagadas' })

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
  if (url && clave && !estado.loginDePrueba) {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(url, clave)
    useCuenta.setState({ modo: 'supabase', estado: 'afuera' })
    // Supabase avisa al entrar (también al volver del link o de Google) y al renovar el token.
    supabase.auth.onAuthStateChange((evento, sesion) => {
      if (!sesion) return void useCuenta.setState({ estado: 'afuera', cuenta: null, token: null })
      if (evento === 'TOKEN_REFRESHED' && useCuenta.getState().cuenta) return void useCuenta.setState({ token: sesion.access_token })
      void entrar(sesion.access_token)
    })
  } else if (estado.loginDePrueba) {
    useCuenta.setState({ modo: 'prueba', estado: 'afuera' })
    const token = leer(CLAVE_PRUEBA)
    if (token) await entrar(token)
  } else {
    useCuenta.setState({ estado: 'apagadas' })
  }
}

export async function entrarConGoogle() {
  const { error } = (await supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })) ?? {}
  if (error) useCuenta.setState({ error: 'No se pudo abrir Google. Probá de nuevo.' })
}

export async function entrarConEmail(email: string) {
  const limpio = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return void useCuenta.setState({ error: 'Ese email no parece válido.' })
  const modo = useCuenta.getState().modo
  if (modo === 'prueba') {
    escribir(CLAVE_PRUEBA, `prueba:${limpio}`)
    return entrar(`prueba:${limpio}`)
  }
  const { error } = (await supabase?.auth.signInWithOtp({ email: limpio, options: { emailRedirectTo: location.origin } })) ?? {}
  if (error) useCuenta.setState({ error: 'No se pudo mandar el link. Esperá un rato y probá de nuevo.' })
  else useCuenta.setState({ linkEnviado: limpio, error: null })
}

export async function salir() {
  borrar(CLAVE_PRUEBA)
  await supabase?.auth.signOut()
  useCuenta.setState({ estado: 'afuera', cuenta: null, token: null, linkEnviado: null, saldo: null })
}

/**
 * Con el token, el servidor devuelve la cuenta (la crea la primera vez con lo de este navegador).
 * Si ya existía, lo guardado en la cuenta pasa a este navegador.
 */
async function entrar(token: string) {
  useCuenta.setState({ estado: 'entrando', error: null })
  const perfil = leerPerfil()
  try {
    const r = await fetch(`${direccionApi()}/entrar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ invitadoId: perfil.invitadoId, apodo: perfil.apodo, avatar: perfil.avatar, preferencias: preferenciasDe(perfil) }),
    })
    if (!r.ok) throw new Error(String(r.status))
    const { saldo, ...cuenta } = (await r.json()) as DatosCuenta & { saldo: number }
    if (!cuenta.nueva) guardarPerfil(perfilDeCuenta(perfil, cuenta), 'cuenta')
    useCuenta.setState({ estado: 'adentro', cuenta, token, linkEnviado: null, saldo })
  } catch {
    borrar(CLAVE_PRUEBA)
    useCuenta.setState({ estado: 'afuera', cuenta: null, token: null, error: 'No se pudo entrar a tu cuenta. Probá de nuevo.' })
  }
}

/** Lo que se sube de las preferencias: todo menos el ID de este navegador y la tienda de prueba. */
function preferenciasDe(p: Perfil): Record<string, unknown> {
  const { invitadoId: _i, apodo: _a, avatar: _v, tiendaDesbloqueada: _t, ...resto } = p
  return resto
}

/** El perfil de este navegador con lo de la cuenta encima (validado como cualquier perfil). */
function perfilDeCuenta(p: Perfil, c: DatosCuenta): Perfil {
  const nuevo: Perfil = { ...p, ...(c.preferencias as Partial<Perfil>), apodo: c.apodo, ...(c.avatar ? { avatar: c.avatar } : {}) }
  nuevo.invitadoId = p.invitadoId
  nuevo.tiendaDesbloqueada = p.tiendaDesbloqueada
  return { ...nuevo, ...cosmeticosPermitidos(nuevo) }
}

// Lo que se cambia en el perfil se sube a la cuenta, juntando los cambios de un par de segundos.
let pendiente: ReturnType<typeof setTimeout> | null = null
observarPerfil((p, origen) => {
  if (origen === 'cuenta' || useCuenta.getState().estado !== 'adentro') return
  if (pendiente) clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    pendiente = null
    const token = useCuenta.getState().token
    if (!token) return
    void fetch(`${direccionApi()}/perfil`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ apodo: p.apodo, avatar: p.avatar, preferencias: preferenciasDe(p) }),
    }).catch(() => {})
  }, 1500)
})

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function escribir(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento, la sesión dura hasta recargar.
  }
}
function borrar(clave: string) {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Nada que borrar.
  }
}
