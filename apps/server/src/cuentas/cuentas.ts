import { LIMITES, normalizarAvatar, TODO_PERMITIDO } from '@truco/shared'
import { filtrarTexto } from '../chat'
import type { Base } from './base'
import type { Usuario } from './auth'

/** Lo que se guarda de cada cuenta y viaja al cliente. */
export interface DatosCuenta {
  id: string
  email: string | null
  apodo: string
  avatar: string | null
  /** Las preferencias del perfil del navegador (formato, nivel, mesa, letra…), tal cual. */
  preferencias: Record<string, unknown>
  /** Si se creó recién, con lo que traía el invitado. */
  nueva: boolean
}

/** Lo que manda el navegador al entrar o al cambiar el perfil. Todo se valida acá. */
export interface PerfilEnviado {
  invitadoId?: unknown
  apodo?: unknown
  avatar?: unknown
  preferencias?: unknown
}

/** Tope de las preferencias guardadas (en caracteres de JSON). */
const MAX_PREFERENCIAS = 8_000

interface FilaCuenta {
  id: string
  email: string | null
  apodo: string
  avatar: string | null
  preferencias: Record<string, unknown>
}

/**
 * Entrar con una sesión. La primera vez se crea la cuenta con lo que traía el invitado (apodo,
 * avatar y preferencias), así no pierde nada; después vale lo guardado en la cuenta. El ID de
 * invitado queda vinculado a la cuenta (el primero que lo vincula se lo queda).
 */
export async function entrar(base: Base, usuario: Usuario, perfil: PerfilEnviado): Promise<DatosCuenta> {
  return base.transaccion(async (b) => {
    let [fila] = await b.consultar<FilaCuenta>('select id, email, apodo, avatar, preferencias from cuentas where id = $1', [usuario.id])
    let nueva = false
    if (!fila) {
      nueva = true
      const apodo = apodoValido(perfil.apodo) ?? apodoDelEmail(usuario.email)
      ;[fila] = await b.consultar<FilaCuenta>(
        `insert into cuentas (id, email, apodo, avatar, preferencias) values ($1, $2, $3, $4, $5)
         returning id, email, apodo, avatar, preferencias`,
        [usuario.id, usuario.email, apodo, avatarValido(perfil.avatar), preferenciasValidas(perfil.preferencias) ?? {}],
      )
    } else if (usuario.email && usuario.email !== fila.email) {
      await b.consultar('update cuentas set email = $2 where id = $1', [usuario.id, usuario.email])
      fila.email = usuario.email
    }
    const invitadoId = typeof perfil.invitadoId === 'string' ? perfil.invitadoId.trim().slice(0, 64) : ''
    if (invitadoId.length >= 8) {
      await b.consultar('insert into invitados (invitado_id, cuenta_id) values ($1, $2) on conflict do nothing', [invitadoId, usuario.id])
    }
    return { ...fila!, nueva }
  })
}

/** Cambia lo que mandó el navegador (lo inválido se ignora). Devuelve la cuenta como quedó. */
export async function guardarPerfil(base: Base, id: string, perfil: PerfilEnviado): Promise<DatosCuenta | null> {
  const apodo = apodoValido(perfil.apodo)
  const avatar = avatarValido(perfil.avatar)
  const preferencias = preferenciasValidas(perfil.preferencias)
  const [fila] = await base.consultar<FilaCuenta>(
    `update cuentas set
       apodo = coalesce($2, apodo),
       avatar = coalesce($3, avatar),
       preferencias = coalesce($4, preferencias),
       actualizada = now()
     where id = $1
     returning id, email, apodo, avatar, preferencias`,
    [id, apodo, avatar, preferencias],
  )
  return fila ? { ...fila, nueva: false } : null
}

function apodoValido(x: unknown): string | null {
  if (typeof x !== 'string') return null
  const t = x.trim().slice(0, LIMITES.largoApodo)
  return t ? filtrarTexto(t) : null
}

function apodoDelEmail(email: string | null): string {
  const t = (email ?? '').split('@')[0]!.replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, LIMITES.largoApodo)
  return t ? filtrarTexto(t) : 'Jugador'
}

/** El formato del avatar se valida; qué piezas puede usar cada uno lo decide la sala al entrar. */
function avatarValido(x: unknown): string | null {
  return normalizarAvatar(x, TODO_PERMITIDO)
}

function preferenciasValidas(x: unknown): Record<string, unknown> | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null
  const json = JSON.stringify(x)
  return json.length <= MAX_PREFERENCIAS ? (JSON.parse(json) as Record<string, unknown>) : null
}
